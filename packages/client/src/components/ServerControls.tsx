interface ServerControlsProps {
  running: boolean;
  stopping: boolean;
  playerCount: number;
  onStart: () => void;
  onStop: () => void;
  onRefresh: () => void;
}

export const ServerControls = ({
  running,
  stopping,
  playerCount,
  onStart,
  onStop,
  onRefresh
}: ServerControlsProps) => (
  <div>
    <h6 className="text-uppercase text-muted mb-3">Controls</h6>
    <div className="d-grid gap-2">
      <button
        className="btn btn-success d-flex align-items-center justify-content-center"
        onClick={onStart}
        disabled={running}
      >
        <i className="bi bi-play-fill me-2"></i>
        Start Server
      </button>
      <span
        title={
          playerCount > 0
            ? 'Stop Server is unavailable while players are in the game.'
            : undefined
        }
      >
        <button
          className="btn btn-danger d-flex align-items-center justify-content-center w-100"
          onClick={onStop}
          disabled={!running || stopping || playerCount > 0}
        >
          <i className="bi bi-stop-fill me-2"></i>
          {stopping ? 'Stopping Server, Please Wait' : 'Stop Server'}
        </button>
      </span>
      {playerCount > 0 && running && !stopping && (
        <div className="text-warning small mt-2 text-center">
          Stop Server is unavailable while players are in the game.
        </div>
      )}
      <button
        className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
        onClick={onRefresh}
      >
        <i className="bi bi-arrow-clockwise me-2"></i>
        Refresh
      </button>
    </div>
  </div>
);
