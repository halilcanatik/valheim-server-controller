import { getContainer, getValheimStatus } from './docker';
import { config } from '../config/config';

let idleStartTime: Date | null = null;

export const getIdleStartTime = () => idleStartTime;

const checkIdleAndShutdown = async () => {
  try {
    const container = getContainer();
    const info = await container.inspect();

    if (!info.State.Running) {
      idleStartTime = null;
      return;
    }

    const status = await getValheimStatus();
    const playerCount = status?.player_count ?? 0;

    if (playerCount === 0) {
      if (!idleStartTime) {
        idleStartTime = new Date();
        console.log(
          `Server is idle. Shutdown in ${config.idleTimeoutMinutes} minutes.`
        );
        return;
      }

      const idleMinutes = (Date.now() - idleStartTime.getTime()) / 60000;

      if (idleMinutes >= config.idleTimeoutMinutes) {
        console.log('Shutting down due to inactivity...');
        await container.stop();
        idleStartTime = null;
      } else {
        const remaining = (config.idleTimeoutMinutes - idleMinutes).toFixed(0);
        console.log(
          `Idle for ${idleMinutes.toFixed(1)}m - ${remaining}m until shutdown`
        );
      }
    } else {
      if (idleStartTime)
        console.log(`Players detected (${playerCount}). Resetting idle timer.`);
      idleStartTime = null;
    }
  } catch (e) {
    console.error('Idle monitor error:', e);
  }
};

export const startIdleMonitor = () => {
  void checkIdleAndShutdown();
  setInterval(() => void checkIdleAndShutdown(), 60000);
};
