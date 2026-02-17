interface ServerControlsProps {
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  onRefresh: () => void;
}

export const ServerControls = ({
  running,
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
      <button
        className="btn btn-danger d-flex align-items-center justify-content-center"
        onClick={onStop}
        disabled={!running}
      >
        <i className="bi bi-stop-fill me-2"></i>
        Stop Server
      </button>
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
