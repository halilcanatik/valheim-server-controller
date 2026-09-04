import type { Readable } from 'stream';
import { getContainer } from './docker';
import {
  closeActiveSessionsForOtherWorlds,
  recordPlayerJoined,
  recordPlayerLeft
} from './playerHistory';

let activeNames: string[] = [];
const ownerIdToName = new Map<string, string>();

export const getTrackedActivePlayerNames = () => [...activeNames];

const processLogLine = (line: string) => {
  const joined = line.match(
    /Got character ZDOID from (.+?)\s*:\s*(-?\d+):\d+/
  );
  const joinedName = joined?.[1]?.trim();
  const joinedOwnerId = joined?.[2];

  if (joinedName && joinedOwnerId) {
    ownerIdToName.set(joinedOwnerId, joinedName);

    activeNames = [
      ...activeNames.filter((name) => name !== joinedName),
      joinedName
    ];
    void recordPlayerJoined(joinedName);
    return;
  }

  const characterDestroyed = line.match(
    /Destroying abandoned non persistent zdo (-?\d+):1 owner (-?\d+)/
  );

  if (
    characterDestroyed &&
    characterDestroyed[1] === characterDestroyed[2]
  ) {
    const ownerId = characterDestroyed[2];
    const name = ownerIdToName.get(ownerId);

    if (name) {
      activeNames = activeNames.filter((activeName) => activeName !== name);
      void recordPlayerLeft(name);
      ownerIdToName.delete(ownerId);
    }
    return;
  }

  const left = line.match(
    /(?:Player|Peer|Character)\s+(.+?)\s+(?:disconnected|left|logged out)/i
  );
  const leftName = left?.[1]?.trim();

  if (leftName) {
    activeNames = activeNames.filter((name) => name !== leftName);
    void recordPlayerLeft(leftName);
  }
};

const splitLogEntries = (text: string): string[] =>
  text
    .split(/\r?\n|(?=(?:[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+supervisord:))/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const closeTrackedSessions = () => {
  const names = activeNames;
  activeNames = [];
  names.forEach((name) => void recordPlayerLeft(name));
};

const followLogs = async () => {
  try {
    const stream = (await getContainer().logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 0
    })) as Readable;
    let buffer = '';
    let flushTimer: NodeJS.Timeout | null = null;

    stream.on('data', (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = splitLogEntries(buffer);
      buffer = lines.pop() ?? '';
      lines.forEach(processLogLine);

      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => {
        if (!buffer) return;
        processLogLine(buffer);
        buffer = '';
      }, 1000);
    });

    stream.on('error', (error) => {
      console.error('Player log tracker stream error:', error);
      setTimeout(() => void followLogs(), 5000);
    });

    stream.on('end', () => {
      closeTrackedSessions();
      setTimeout(() => void followLogs(), 5000);
    });
  } catch (error) {
    console.error('Unable to start player log tracker:', error);
    setTimeout(() => void followLogs(), 5000);
  }
};

export const startPlayerLogTracker = () => {
  void closeActiveSessionsForOtherWorlds();
  void followLogs();
};