export type ValheimPlayer = {
  name: string;
  score: number;
  duration: number;
};

export type ServerStatus = {
  status: string;
  running: boolean;
  playerCount: number;
  players: ValheimPlayer[];
  idleMinutes: number;
  shutdownIn: number | null;
};

export type WorldInfo = {
  name: string;
  isCurrent: boolean;
  lastModified: string;
  dbSize: number;
  fwlSize: number;
};

export type WorldsResponse = {
  currentWorld: string;
  worlds: WorldInfo[];
};

export type Message = {
  text: string;
  type: 'error' | 'success';
};
