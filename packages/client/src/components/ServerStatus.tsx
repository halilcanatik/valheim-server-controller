import type { ServerStatus as ServerStatusType } from '../types';

interface ServerStatusProps {
  status: ServerStatusType;
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatLastSeen = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(date))
    : '-';

export const ServerStatus = ({ status }: ServerStatusProps) => (
  <div className="mb-4">
    <h6 className="text-uppercase text-muted mb-3">Server Status</h6>
    <div className="row g-3">
      <div className="col-md-8">
        <div className="row g-3">
          <div className="col-6">
            <small className="text-muted d-block">State</small>
            <strong className="d-flex align-items-center">
              <div
                className={`status-dot me-2 ${
                  status.running ? 'status-running' : 'status-stopped'
                }`}
              />
              {status.status === 'running'
                ? 'Running'
                : status.status === 'exited'
                  ? 'Stopped'
                  : status.status}
            </strong>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">Players</small>
            <strong className="d-flex align-items-center">
              <i className="bi bi-people-fill me-2 text-info"></i>
              {status.playerCount}
            </strong>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">Idle Time</small>
            <strong className="d-flex align-items-center">
              <i className="bi bi-clock-fill me-2 text-warning"></i>
              {status.idleMinutes > 0 ? `${status.idleMinutes.toFixed(0)}m` : '-'}
            </strong>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">Shutdown In</small>
            <strong className="d-flex align-items-center text-danger">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {status.shutdownIn !== null && status.shutdownIn > 0
                ? `${status.shutdownIn.toFixed(0)}m`
                : '-'}
            </strong>
          </div>
        </div>
      </div>

      <div className="col-md-4 border-start-md">
        <small className="text-muted d-block mb-2">Players Online</small>
        {status.players.length > 0 ? (
          <div className="d-flex flex-column gap-2">
            {status.players.map((currentPlayer, index) => {
              const player = status.playerHistory.find(
                (historyPlayer) => historyPlayer.name === currentPlayer.name
              );
              const name = player?.name ?? currentPlayer.name;

              return (
                <div key={`${name}-${index}`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-person-fill me-2 text-info"></i>
                    <span>{name}</span>
                  </div>
                  {player && (
                    <small className="text-muted ms-4">
                      Current: {formatDuration(player.currentPlaytimeSeconds)}
                      <br />
                      Total: {formatDuration(player.totalPlaytimeSeconds)}
                    </small>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-muted small">No players online</span>
        )}

        {status.playerHistory.some((player) => !player.active) && (
          <>
            <small className="text-muted d-block mt-3 mb-2">Recent Players</small>
            <div className="d-flex flex-column gap-2">
              {status.playerHistory
                .filter((player) => !player.active)
                .slice(0, 5)
                .map((player) => (
                  <div key={player.name} className="small">
                    <div>{player.name}</div>
                    <span className="text-muted">
                      Last seen: {formatLastSeen(player.lastSeenAt)}
                      <br />
                      Total: {formatDuration(player.totalPlaytimeSeconds)}
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);
