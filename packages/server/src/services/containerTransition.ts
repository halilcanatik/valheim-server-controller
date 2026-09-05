import fs from 'fs/promises';
import { config } from '../config/config';

const stoppingMarkerPath = `${config.playerHistoryPath}.stopping`;

export const markStopRequested = async () => {
  await fs.writeFile(stoppingMarkerPath, new Date().toISOString());
};

export const isStopRequested = async (): Promise<boolean> => {
  try {
    await fs.access(stoppingMarkerPath);
    return true;
  } catch {
    return false;
  }
};

export const clearStopRequested = async () => {
  try {
    await fs.unlink(stoppingMarkerPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};
