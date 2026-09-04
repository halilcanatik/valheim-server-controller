import Docker from 'dockerode';
import { config } from '../config/config';

const host = config.dockerHost.replace('tcp://', '').split(':')[0];
const port = parseInt(config.dockerHost.split(':')[2] || '2375');

export const docker = new Docker({ host, port });
export const getContainer = () => docker.getContainer(config.containerName);

export const getValheimContainerState = async (): Promise<string> => {
  const containerInfo = await getContainer().inspect();
  return containerInfo.State?.Status ?? 'unknown';
};

export const getValheimPlayerNamesFromLogs = async (): Promise<string[]> => {
  const logs = await getContainer().logs({
    stdout: true,
    stderr: true,
    tail: 200
  });
  const text = logs.toString('utf8');
  const names: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/Got character ZDOID from (.+?)\s*:/);
    const name = match?.[1]?.trim();

    if (name && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
};

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

export const getValheimStatus = async (): Promise<ValheimStatus | null> => {
  try {
    const res = await fetch(`http://${config.containerName}/status.json`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    return (await res.json()) as ValheimStatus;
  } catch {
    return null;
  }
};
