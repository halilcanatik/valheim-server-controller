import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  getContainer,
  getValheimContainerState,
  getValheimStatus
} from '../services/docker';
import { getIdleStartTime } from '../services/idleMonitor';
import { createWorldZip, getWorlds } from '../services/worlds';
import { getPlayerHistory } from '../services/playerHistory';
import { getTrackedActivePlayerNames } from '../services/playerLogTracker';
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
  '/worlds/:world/download',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const containerState = await getValheimContainerState();

      if (containerState !== 'exited') {
        res.status(403).json({
          error: 'World downloads are available only when the server is stopped'
        });
        return;
      }

      const worldName = req.params.world;

      if (typeof worldName !== 'string' || worldName.length === 0) {
        res.status(400).json({ error: 'Invalid world name' });
        return;
      }

      const worlds = await getWorlds();

      if (!worlds.some((world) => world.name === worldName)) {
        res.status(404).json({ error: 'World not found' });
        return;
      }

      const worldZip = await createWorldZip(worldName);

      res.attachment(`${worldName}.zip`);
      worldZip.on('error', () => {
        if (!res.headersSent) {
          next(new Error('Unable to create world download'));
        } else {
          res.destroy();
        }
      });
      worldZip.pipe(res);
    } catch (e) {
      if (e instanceof Error && 'statusCode' in e) {
        next(e);
        return;
      }

      res.status(500).json({ error: 'Unable to create world download' });
    }
  }
);

serverRouter.get(
  '/status',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const status = await getValheimStatus();
      const containerState = await getValheimContainerState();
      const isRunning = containerState === 'running';
      const trackedNames = getTrackedActivePlayerNames();
      const playerCount = status?.player_count ?? 0;
      const statusPlayers = status?.players ?? [];
      const playerNames = [
        ...trackedNames,
        ...statusPlayers.map((player) => player.name).filter(Boolean)
      ].filter((name, index, names) => names.indexOf(name) === index);
      const players = playerNames.map((name, index) => ({
        name,
        score: statusPlayers[index]?.score ?? 0,
        duration: Math.floor(statusPlayers[index]?.duration ?? 0)
      }));
      const idleStart = getIdleStartTime();
      const idleMinutes =
        idleStart && isRunning ? (Date.now() - idleStart.getTime()) / 60000 : 0;

      res.json({
        containerName: config.containerName,
        status: containerState,
        running: isRunning,
        playerCount: Math.max(playerCount, players.length),
        players,
        playerHistory: await getPlayerHistory(),
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
      const status = await getValheimStatus();

      if ((status?.player_count ?? 0) > 0) {
        res.status(409).json({
          error: 'Cannot stop the server while players are online'
        });
        return;
      }

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
