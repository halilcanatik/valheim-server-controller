import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/config';

interface StoredWorldStats {
  worldName: string;
  totalUptimeSeconds: number;
  currentSessionStartedAt: string | null;
  lastKnownWorldTime: number | null;
  lastKnownGameDay: number | null;
  lastWorldTimeAt: string | null;
}

export interface WorldStatsInfo {
  worldName: string;
  currentUptimeSeconds: number;
  totalUptimeSeconds: number;
  lastKnownWorldTime: number | null;
  lastKnownGameDay: number | null;
  lastWorldTimeAt: string | null;
}

const statsPath = `${config.playerHistoryPath}.world-stats`;
let worldStats: StoredWorldStats[] | null = null;
let writeQueue = Promise.resolve();

const loadStats = async () => {
  if (worldStats) return worldStats;

  try {
    const file = await fs.readFile(statsPath, 'utf8');
    const saved = JSON.parse(file) as unknown;
    worldStats = Array.isArray(saved) ? (saved as StoredWorldStats[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Unable to read world statistics:', error);
    }
    worldStats = [];
  }

  return worldStats;
};

const persistStats = (snapshot: StoredWorldStats[]) => {
  writeQueue = writeQueue
    .then(async () => {
      await fs.mkdir(path.dirname(statsPath), { recursive: true });
      const temporaryPath = `${statsPath}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(snapshot, null, 2));
      await fs.rename(temporaryPath, statsPath);
    })
    .catch((error) => {
      console.error('Unable to save world statistics:', error);
    });
};

const getOrCreateStats = async (worldName: string) => {
  const stats = await loadStats();
  let world = stats.find((item) => item.worldName === worldName);

  if (!world) {
    world = {
      worldName,
      totalUptimeSeconds: 0,
      currentSessionStartedAt: null,
      lastKnownWorldTime: null,
      lastKnownGameDay: null,
      lastWorldTimeAt: null
    };
    stats.push(world);
  }

  return world;
};

export const recordGameServerConnected = async (
  worldName = config.worldName || 'Unknown World',
  connectedAt = new Date()
) => {
  const world = await getOrCreateStats(worldName);
  if (!world.currentSessionStartedAt) {
    world.currentSessionStartedAt = connectedAt.toISOString();
    persistStats((await loadStats()).map((item) => ({ ...item })));
  }
};

export const recordGameServerStopped = async (stoppedAt = new Date()) => {
  const stats = await loadStats();
  let changed = false;

  for (const world of stats) {
    if (!world.currentSessionStartedAt) continue;
    world.totalUptimeSeconds += Math.max(
      0,
      (stoppedAt.getTime() - new Date(world.currentSessionStartedAt).getTime()) / 1000
    );
    world.currentSessionStartedAt = null;
    changed = true;
  }

  if (changed) persistStats(stats.map((item) => ({ ...item })));
};

export const recordWorldTime = async (
  worldTime: number,
  worldName = config.worldName || 'Unknown World',
  observedAt = new Date()
) => {
  if (!Number.isFinite(worldTime)) return;
  const world = await getOrCreateStats(worldName);
  world.lastKnownWorldTime = worldTime;
  world.lastKnownGameDay = null;
  world.lastWorldTimeAt = observedAt.toISOString();
  persistStats((await loadStats()).map((item) => ({ ...item })));
};

const toInfo = (world: StoredWorldStats, observedAt: Date): WorldStatsInfo => {
  const currentUptimeSeconds = world.currentSessionStartedAt
    ? Math.max(
        0,
        (observedAt.getTime() -
          new Date(world.currentSessionStartedAt).getTime()) /
          1000
      )
    : 0;

  return {
    worldName: world.worldName,
    currentUptimeSeconds,
    totalUptimeSeconds: Math.floor(
      world.totalUptimeSeconds + currentUptimeSeconds
    ),
    lastKnownWorldTime: world.lastKnownWorldTime,
    lastKnownGameDay: world.lastKnownGameDay,
    lastWorldTimeAt: world.lastWorldTimeAt
  };
};

export const getWorldStatsByWorld = async (
  observedAt = new Date()
): Promise<Record<string, WorldStatsInfo>> => {
  const stats = await loadStats();
  return Object.fromEntries(
    stats.map((world) => [world.worldName, toInfo(world, observedAt)])
  );
};
