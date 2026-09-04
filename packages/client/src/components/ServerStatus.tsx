import type { ServerStatus as ServerStatusType } from '../types';

interface ServerStatusProps {
  status: ServerStatusType;
}

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
            {status.players.map((player, index) => (
              <div className="d-flex align-items-center" key={`${player.name}-${index}`}>
                <i className="bi bi-person-fill me-2 text-info"></i>
                <span>{player.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted small">No players online</span>
        )}
      </div>
    </div>
  </div>
);
