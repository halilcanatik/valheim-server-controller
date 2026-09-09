import fs from 'fs/promises';
import path from 'path';
import { ZipArchive, type ArchiverError } from 'archiver';
import { PassThrough } from 'stream';
import { config } from '../config/config';

const WORLDS_DIR = path.join(config.valheimConfigPath, 'worlds_local');

export interface WorldInfo {
  name: string;
  isCurrent: boolean;
  lastModified: string;
  size: number;
}

const getDirectorySize = async (directory: string): Promise<number> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) return getDirectorySize(entryPath);
      if (entry.isFile()) return (await fs.stat(entryPath)).size;

      return 0;
    })
  );

  return sizes.reduce((total, size) => total + size, 0);
};

export const getWorlds = async (): Promise<WorldInfo[]> => {
  const entries = await fs.readdir(WORLDS_DIR, { withFileTypes: true });

  const worlds: WorldInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;
    const worldPath = path.join(WORLDS_DIR, name);

    try {
      const [worldStats, size] = await Promise.all([
        fs.stat(worldPath),
        getDirectorySize(worldPath)
      ]);

      worlds.push({
        name,
        isCurrent: name === config.worldName,
        lastModified: worldStats.mtime.toISOString(),
        size
      });
    } catch {
      // Ignore world directories that disappear during discovery.
    }
  }

  worlds.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;

    return (
      new Date(b.lastModified).getTime() -
      new Date(a.lastModified).getTime()
    );
  });

  return worlds;
};

export const createWorldZip = async (worldName: string): Promise<PassThrough> => {
  const worldPath = path.join(WORLDS_DIR, worldName);
  const worldStats = await fs.stat(worldPath);

  if (!worldStats.isDirectory()) {
    throw new Error('World directory is invalid');
  }

  const archive = new ZipArchive({
    zlib: { level: 6 }
  });

  const output = new PassThrough();

  archive.on('error', (error: ArchiverError) => {
    output.destroy(error);
  });

  archive.pipe(output);

  archive.directory(worldPath, worldName);

  void archive.finalize().catch((error: unknown) => {
    output.destroy(
      error instanceof Error ? error : new Error('Unable to finalize archive')
    );
  });

  return output;
};