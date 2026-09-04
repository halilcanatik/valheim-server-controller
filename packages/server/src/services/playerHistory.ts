import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/config';

interface StoredPlayer {
  name: string;
  totalPlaytimeSeconds: number;
  currentSessionStartedAt: string | null;
  lastSeenAt: string | null;
  lastObservedAt: string | null;
}

export interface PlayerHistoryInfo {
  name: string;
  active: boolean;
  currentPlaytimeSeconds: number;
  totalPlaytimeSeconds: number;
  lastSeenAt: string | null;
}

const EMPTY_HISTORY: StoredPlayer[] = [];
let players: StoredPlayer[] | null = null;
let writeQueue = Promise.resolve();

const loadPlayers = async (): Promise<StoredPlayer[]> => {
  if (players) return players;

  try {
    const file = await fs.readFile(config.playerHistoryPath, 'utf8');
    const saved = JSON.parse(file) as unknown;
    players = Array.isArray(saved) ? (saved as StoredPlayer[]) : EMPTY_HISTORY;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Unable to read player history:', error);
    }
    players = [];
  }

  return players;
};

const persistPlayers = (snapshot: StoredPlayer[]) => {
  writeQueue = writeQueue
    .then(async () => {
      await fs.mkdir(path.dirname(config.playerHistoryPath), { recursive: true });
      const temporaryPath = `${config.playerHistoryPath}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(snapshot, null, 2));
      await fs.rename(temporaryPath, config.playerHistoryPath);
    })
    .catch((error) => {
      console.error('Unable to save player history:', error);
    });
};

export const recordActivePlayers = async (
  activeNames: string[],
  observedAt = new Date()
) => {
  const storedPlayers = await loadPlayers();
  const observedTime = observedAt.getTime();
  const activeSet = new Set(activeNames.filter((name) => name !== 'Unknown'));
  let changed = false;

  for (const player of storedPlayers) {
    if (player.lastObservedAt === null) continue;

    const elapsedSeconds = Math.max(
      0,
      (observedTime - new Date(player.lastObservedAt).getTime()) / 1000
    );

    if (!activeSet.has(player.name) && player.currentSessionStartedAt) {
      player.totalPlaytimeSeconds += elapsedSeconds;
      player.currentSessionStartedAt = null;
      player.lastSeenAt = observedAt.toISOString();
      player.lastObservedAt = null;
      changed = true;
    }
  }

  for (const name of activeSet) {
    let player = storedPlayers.find((item) => item.name === name);

    if (!player) {
      player = {
        name,
        totalPlaytimeSeconds: 0,
        currentSessionStartedAt: observedAt.toISOString(),
        lastSeenAt: observedAt.toISOString(),
        lastObservedAt: observedAt.toISOString()
      };
      storedPlayers.push(player);
      changed = true;
      continue;
    }

    if (!player.currentSessionStartedAt) {
      player.currentSessionStartedAt = observedAt.toISOString();
      changed = true;
    }

    if (player.lastObservedAt) {
      player.totalPlaytimeSeconds += Math.max(
        0,
        (observedTime - new Date(player.lastObservedAt).getTime()) / 1000
      );
    }

    player.lastSeenAt = observedAt.toISOString();
    player.lastObservedAt = observedAt.toISOString();
    changed = true;
  }

  if (changed) persistPlayers(storedPlayers.map((player) => ({ ...player })));
};

export const getPlayerHistory = async (
  observedAt = new Date()
): Promise<PlayerHistoryInfo[]> => {
  const storedPlayers = await loadPlayers();
  const observedTime = observedAt.getTime();

  return storedPlayers
    .map((player) => {
      const active = player.currentSessionStartedAt !== null;
      const currentPlaytimeSeconds = active && player.lastObservedAt
        ? Math.max(
            0,
            (observedTime - new Date(player.lastObservedAt).getTime()) / 1000
          )
        : 0;

      return {
        name: player.name,
        active,
        currentPlaytimeSeconds,
        totalPlaytimeSeconds: Math.floor(
          player.totalPlaytimeSeconds + currentPlaytimeSeconds
        ),
        lastSeenAt: player.lastSeenAt
      };
    })
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '');
    });
};