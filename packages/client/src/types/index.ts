export type ServerStatus = {
  running: boolean;
  playerCount: number;
  idleMinutes: number;
  shutdownIn: number | null;
};

export type Message = {
  text: string;
  type: 'error' | 'success';
};
