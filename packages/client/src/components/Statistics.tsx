import { useState } from 'react';
import type { PlayerHistoryInfo } from '../types';

interface StatisticsProps {
  currentWorld: string;
  recordedWorlds: string[];
  playerHistoryByWorld: Record<string, PlayerHistoryInfo[]>;
}

const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const Statistics = ({
  currentWorld,
  recordedWorlds,
  playerHistoryByWorld
}: StatisticsProps) => {
  const [selectedWorld, setSelectedWorld] = useState(currentWorld);
  const players = playerHistoryByWorld[selectedWorld] ?? [];
  const onlinePlayers = players
    .filter((player) => player.active)
    .sort((a, b) => b.currentPlaytimeSeconds - a.currentPlaytimeSeconds);
  const totalPlayers = [...players].sort(
    (a, b) => b.totalPlaytimeSeconds - a.totalPlaytimeSeconds
  );

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <h6 className="text-uppercase text-muted mb-0">
          Statistics - World: {selectedWorld}
        </h6>
        {recordedWorlds.length > 1 && (
          <select
            className="form-select form-select-sm w-auto"
            value={selectedWorld}
            onChange={(event) => setSelectedWorld(event.target.value)}
            aria-label="Statistics world"
          >
            {recordedWorlds.map((world) => (
              <option key={world} value={world}>
                {world === currentWorld ? `${world} (Current)` : world}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="row g-3">
        <div className="col-6">
          <small className="text-muted d-block mb-2">Players Online</small>
          {onlinePlayers.length > 0 ? (
            <div className="d-flex flex-column gap-2">
              {onlinePlayers.map((player) => (
                <div
                  className="d-flex justify-content-between align-items-center gap-2"
                  key={player.name}
                >
                  <span className="d-flex align-items-center text-truncate">
                    <i className="bi bi-person-fill me-2 text-info"></i>
                    <span>{player.name}</span>
                  </span>
                  <span className="text-nowrap small">
                    {formatDuration(player.currentPlaytimeSeconds)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted small">No players online</span>
          )}
        </div>

        <div className="col-6 border-start-md">
          <small className="text-muted d-block mb-2">Total Playtime</small>
          {totalPlayers.length > 0 ? (
            <div className="d-flex flex-column gap-2">
              {totalPlayers.map((player) => (
                <div
                  className="d-flex justify-content-between align-items-center gap-2"
                  key={player.name}
                >
                  <span className="d-flex align-items-center text-truncate">
                    <i
                      className={`bi bi-person-fill me-2 ${
                        player.active ? 'text-info' : 'text-muted'
                      }`}
                    ></i>
                    <span>{player.name}</span>
                  </span>
                  <span className="text-nowrap small">
                    {formatDuration(player.totalPlaytimeSeconds)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted small">No player history yet</span>
          )}
        </div>
      </div>
    </section>
  );
};