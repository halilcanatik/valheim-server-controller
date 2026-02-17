import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getContainer, getValheimStatus } from '../services/docker';
import { getIdleStartTime } from '../services/idleMonitor';
import { config } from '../config/config';

export const serverRouter = Router();

serverRouter.get(
  '/status',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const container = getContainer();
      const [info, status] = await Promise.all([
        container.inspect(),
        getValheimStatus()
      ]);

      const idleStart = getIdleStartTime();
      const idleMinutes =
        idleStart && info.State.Running
          ? (Date.now() - idleStart.getTime()) / 60000
          : 0;

      res.json({
        containerName: config.containerName,
        status: info.State.Status,
        running: info.State.Running,
        startedAt: info.State.StartedAt,
        playerCount: status?.player_count ?? 0,
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
      const info = await container.inspect();

      if (info.State.Running) {
        res.json({ message: 'Server is already running', status: 'running' });
        return;
      }

      await container.start();
      res.json({ message: 'Server started successfully', status: 'starting' });
    } catch (e) {
      next(e);
    }
  }
);

serverRouter.post(
  '/stop',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const container = getContainer();
      const info = await container.inspect();

      if (!info.State.Running) {
        res.json({ message: 'Server is already stopped', status: 'stopped' });
        return;
      }

      await container.stop({ t: 30 });
      res.json({ message: 'Server stopped successfully', status: 'stopped' });
    } catch (e) {
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
