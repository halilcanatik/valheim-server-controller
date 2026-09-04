import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/config';

interface StoredPlayer {
  worldName: string;
  name: string;
  totalPlaytimeSeconds: number;
  currentSessionStartedAt: string | null;
  lastSeenAt: string | null;
  lastObservedAt: string | null;
}

export interface PlayerHistoryInfo {
  worldName: string;
  name: string;
  active: boolean;
  currentPlaytimeSeconds: number;
  totalPlaytimeSeconds: number;
  lastSeenAt: string | null;
}

const EMPTY_HISTORY: StoredPlayer[] = [];
const currentWorldName = () => config.worldName || 'Unknown World';
let players: StoredPlayer[] | null = null;
let writeQueue = Promise.resolve();

const savePlayers = () => {
  if (players) persistPlayers(players.map((player) => ({ ...player })));
};

const loadPlayers = async (): Promise<StoredPlayer[]> => {
  if (players) return players;

  try {
    const file = await fs.readFile(config.playerHistoryPath, 'utf8');
    const saved = JSON.parse(file) as unknown;
    players = Array.isArray(saved)
      ? (saved as Partial<StoredPlayer>[]).map((player) => ({
          worldName: player.worldName || currentWorldName(),
          name: player.name || 'Unknown',
          totalPlaytimeSeconds: player.totalPlaytimeSeconds ?? 0,
          currentSessionStartedAt: player.currentSessionStartedAt ?? null,
          lastSeenAt: player.lastSeenAt ?? null,
          lastObservedAt: player.lastObservedAt ?? null
        }))
      : EMPTY_HISTORY;
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
    if (player.worldName !== currentWorldName()) continue;
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
    let player = storedPlayers.find(
      (item) => item.worldName === currentWorldName() && item.name === name
    );

    if (!player) {
      player = {
        worldName: currentWorldName(),
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
  worldName = currentWorldName(),
  observedAt = new Date()
): Promise<PlayerHistoryInfo[]> => {
  const storedPlayers = await loadPlayers();
  const observedTime = observedAt.getTime();

  return storedPlayers
    .filter((player) => player.worldName === worldName)
    .map((player) => {
      const active = player.currentSessionStartedAt !== null;
      const currentPlaytimeSeconds = active && player.lastObservedAt
        ? Math.max(
            0,
            (observedTime - new Date(player.lastObservedAt).getTime()) / 1000
          )
        : 0;

      return {
        worldName: player.worldName,
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

export const recordPlayerJoined = async (
  name: string,
  worldName = currentWorldName(),
  observedAt = new Date()
) => {
  if (!name || name === 'Unknown') return;

  const storedPlayers = await loadPlayers();
  let player = storedPlayers.find(
    (item) => item.worldName === worldName && item.name === name
  );

  if (!player) {
    player = {
      worldName,
      name,
      totalPlaytimeSeconds: 0,
      currentSessionStartedAt: observedAt.toISOString(),
      lastSeenAt: observedAt.toISOString(),
      lastObservedAt: observedAt.toISOString()
    };
    storedPlayers.push(player);
  } else if (!player.currentSessionStartedAt) {
    player.currentSessionStartedAt = observedAt.toISOString();
    player.lastSeenAt = observedAt.toISOString();
    player.lastObservedAt = observedAt.toISOString();
  }

  savePlayers();
};

export const recordPlayerLeft = async (
  name: string,
  worldName = currentWorldName(),
  observedAt = new Date()
) => {
  const storedPlayers = await loadPlayers();
  const player = storedPlayers.find(
    (item) => item.worldName === worldName && item.name === name
  );

  if (!player || !player.currentSessionStartedAt) return;

  if (player.lastObservedAt) {
    player.totalPlaytimeSeconds += Math.max(
      0,
      (observedAt.getTime() - new Date(player.lastObservedAt).getTime()) / 1000
    );
  }

  player.currentSessionStartedAt = null;
  player.lastObservedAt = null;
  player.lastSeenAt = observedAt.toISOString();
  savePlayers();
};

export const getRecordedWorlds = async (): Promise<string[]> => {
  const storedPlayers = await loadPlayers();
  return [...new Set(storedPlayers.map((player) => player.worldName))].sort();
};

export const getPlayerHistoryByWorld = async (
  observedAt = new Date()
): Promise<Record<string, PlayerHistoryInfo[]>> => {
  const worlds = await getRecordedWorlds();
  const entries = await Promise.all(
    worlds.map(async (world) => [world, await getPlayerHistory(world, observedAt)] as const)
  );
  return Object.fromEntries(entries);
};