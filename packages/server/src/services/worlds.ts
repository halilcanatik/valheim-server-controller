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
  dbSize: number;
  fwlSize: number;
}

export const getWorlds = async (): Promise<WorldInfo[]> => {
  const files = await fs.readdir(WORLDS_DIR);

  const worldNames = new Set<string>();

  for (const file of files) {
    if (file.endsWith('.db')) {
      worldNames.add(file.slice(0, -3));
    }
  }

  const worlds: WorldInfo[] = [];

  for (const name of worldNames) {
    const dbPath = path.join(WORLDS_DIR, `${name}.db`);
    const fwlPath = path.join(WORLDS_DIR, `${name}.fwl`);

    try {
      const [dbStats, fwlStats] = await Promise.all([
        fs.stat(dbPath),
        fs.stat(fwlPath)
      ]);

      if (!dbStats.isFile() || !fwlStats.isFile()) {
        continue;
      }

      worlds.push({
        name,
        isCurrent: name === config.worldName,
        lastModified: dbStats.mtime.toISOString(),
        dbSize: dbStats.size,
        fwlSize: fwlStats.size
      });
    } catch {
      // Ignore incomplete world pairs.
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
  const dbPath = path.join(WORLDS_DIR, `${worldName}.db`);
  const fwlPath = path.join(WORLDS_DIR, `${worldName}.fwl`);

  const [dbStats, fwlStats] = await Promise.all([
    fs.stat(dbPath),
    fs.stat(fwlPath)
  ]);

  if (!dbStats.isFile() || !fwlStats.isFile()) {
    throw new Error('World files are incomplete');
  }

  const archive = new ZipArchive({
    zlib: { level: 6 }
  });

  const output = new PassThrough();

  archive.on('error', (error: ArchiverError) => {
    output.destroy(error);
  });

  archive.pipe(output);

  archive.file(dbPath, {
    name: `${worldName}.db`
  });

  archive.file(fwlPath, {
    name: `${worldName}.fwl`
  });

  await archive.finalize();

  return output;
};