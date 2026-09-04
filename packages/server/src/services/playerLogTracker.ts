import type { Readable } from 'stream';
import { getContainer } from './docker';
import {
  recordPlayerJoined,
  recordPlayerLeft
} from './playerHistory';

let activeNames: string[] = [];
const steamIdToName = new Map<string, string>();
let latestSteamId: string | null = null;

export const getTrackedActivePlayerNames = () => [...activeNames];

const processLogLine = (line: string) => {
  const connection = line.match(/Got connection SteamID (\d+)/);

  if (connection) {
    latestSteamId = connection[1];
    return;
  }

  const joined = line.match(/Got character ZDOID from (.+?)\s*:/);
  const joinedName = joined?.[1]?.trim();

  if (joinedName) {
    if (latestSteamId) {
      const previousName = steamIdToName.get(latestSteamId);

      if (previousName && previousName !== joinedName) {
        activeNames = activeNames.filter((name) => name !== previousName);
        void recordPlayerLeft(previousName);
      }

      steamIdToName.set(latestSteamId, joinedName);
    }

    activeNames = [
      ...activeNames.filter((name) => name !== joinedName),
      joinedName
    ];
    void recordPlayerJoined(joinedName);
    return;
  }

  const socketClosed = line.match(/Closing socket (\d+)/);

  if (socketClosed) {
    const name = steamIdToName.get(socketClosed[1]);

    if (name) {
      activeNames = activeNames.filter((activeName) => activeName !== name);
      void recordPlayerLeft(name);
      steamIdToName.delete(socketClosed[1]);
    }

    if (latestSteamId === socketClosed[1]) latestSteamId = null;
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

    stream.on('data', (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      lines.forEach(processLogLine);
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
  void followLogs();
};