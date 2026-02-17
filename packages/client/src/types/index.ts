export type ValheimPlayer = {
  name: string;
  score: number;
  duration: number;
};

export type ServerStatus = {
  running: boolean;
  playerCount: number;
  players: ValheimPlayer[];
  idleMinutes: number;
  shutdownIn: number | null;
};

export type Message = {
  text: string;
  type: 'error' | 'success';
};
