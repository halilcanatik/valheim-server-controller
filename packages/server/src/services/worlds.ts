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

interface DirectoryInfo {
  size: number;
  lastModified: number;
}

const getDirectoryInfo = async (directory: string): Promise<DirectoryInfo> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const directoryStats = await fs.stat(directory);
  const children = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) return getDirectoryInfo(entryPath);
      if (entry.isFile()) {
        const stats = await fs.stat(entryPath);
        return { size: stats.size, lastModified: stats.mtimeMs };
      }

      return { size: 0, lastModified: 0 };
    })
  );

  return children.reduce(
    (info, child) => ({
      size: info.size + child.size,
      lastModified: Math.max(info.lastModified, child.lastModified)
    }),
    { size: 0, lastModified: directoryStats.mtimeMs }
  );
};

export const getWorlds = async (): Promise<WorldInfo[]> => {
  const entries = await fs.readdir(WORLDS_DIR, { withFileTypes: true });

  const worlds: WorldInfo[] = [];

  for (const entry of entries) {
    const name = entry.name;
    const worldPath = path.join(WORLDS_DIR, name);

    try {
      const stats = await fs.stat(worldPath);
      if (!stats.isDirectory()) continue;

      const worldInfo = await getDirectoryInfo(worldPath);

      worlds.push({
        name,
        isCurrent: name === config.worldName,
        lastModified: new Date(worldInfo.lastModified).toISOString(),
        size: worldInfo.size
      });
    } catch {
      console.warn(`Unable to read world directory: ${worldPath}`);
    }
  }

  worlds.sort((a, b) => {
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