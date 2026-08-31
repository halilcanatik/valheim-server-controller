import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getContainer, getValheimStatus } from '../services/docker';
import { getIdleStartTime } from '../services/idleMonitor';
import { getWorlds } from '../services/worlds';
import { isDockerError } from '../types/docker';
import { config } from '../config/config';

export const serverRouter = Router();

serverRouter.get(
  '/worlds',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const worlds = await getWorlds();

      res.json({
        currentWorld: config.worldName,
        worlds
      });
    } catch (e) {
      next(e);
    }
  }
);

serverRouter.get(
  '/status',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const status = await getValheimStatus();
      const isRunning = status !== null;
      const idleStart = getIdleStartTime();
      const idleMinutes =
        idleStart && isRunning ? (Date.now() - idleStart.getTime()) / 60000 : 0;

      res.json({
        containerName: config.containerName,
        status: isRunning ? 'running' : 'stopped',
        running: isRunning,
        playerCount: status?.player_count ?? 0,
        players: (status?.players ?? []).map((p) => ({
          name: p.name || 'Unknown',
          score: p.score,
          duration: Math.floor(p.duration)
        })),
        idleMinutes: idleMinutes > 0 ? parseFloat(idleMinutes.toFixed(1)) : 0,
        shutdownIn:
          idleMinutes > 0
            ? Math.max(0, config.idleTimeoutMinutes - idleMinutes)
            : null
      });
    } catch (e) {
      next(e);
    }
  }
);

serverRouter.post(
  '/start',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const container = getContainer();
      await container.start();
      res.json({ message: 'Server started successfully', status: 'starting' });
    } catch (e) {
      if (isDockerError(e) && e.statusCode === 304) {
        res.json({ message: 'Server is already running', status: 'running' });
        return;
      }
      next(e);
    }
  }
);

serverRouter.post(
  '/stop',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const container = getContainer();
      await container.stop({ t: 30 });
      res.json({ message: 'Server stopped successfully', status: 'stopped' });
    } catch (e) {
      if (isDockerError(e) && e.statusCode === 304) {
        res.json({ message: 'Server is already stopped', status: 'stopped' });
        return;
      }
      next(e);
    }
  }
);

serverRouter.post(
  '/restart',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const container = getContainer();
      await container.restart({ t: 30 });
      res.json({
        message: 'Server restarted successfully',
        status: 'restarting'
      });
    } catch (e) {
      next(e);
    }
  }
);
