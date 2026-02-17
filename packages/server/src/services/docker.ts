import Docker from 'dockerode';
import { config } from '../config/config';

const host = config.dockerHost.replace('tcp://', '').split(':')[0];
const port = parseInt(config.dockerHost.split(':')[2] || '2375');

export const docker = new Docker({ host, port });

export const getContainer = () => docker.getContainer(config.containerName);

export interface ValheimPlayer {
  name: string;
  score: number;
  duration: number;
}

export interface ValheimStatus {
  player_count: number;
  players: ValheimPlayer[];
  server_name: string;
  last_status_update: string;
  error: string | null;
  server_type: string;
  platform: string;
  password_protected: boolean;
  vac_enabled: boolean;
  port: number;
  steam_id: number;
  keywords: string;
  game_id: number;
}

const getContainerIp = async (): Promise<string | null> => {
  const container = getContainer();
  const info = await container.inspect();
  const network = Object.values(info.NetworkSettings.Networks)[0];
  return network?.IPAddress ?? null;
};

export const getValheimStatus = async (): Promise<ValheimStatus | null> => {
  const container = getContainer();
  const info = await container.inspect();

  if (!info.State.Running) return null;

  const ip = await getContainerIp();
  if (!ip) return null;

  try {
    const res = await fetch(`http://${ip}/status.json`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return null;

    return (await res.json()) as ValheimStatus;
  } catch {
    return null;
  }
};
