import { useState } from 'react';

interface ServerControlsProps {
  running: boolean;
  stopping: boolean;
  playerCount: number;
  onStart: () => void;
  onStop: () => Promise<boolean>;
  onRefresh: () => void;
}

export const ServerControls = ({
  running,
  stopping,
  playerCount,
  onStart,
  onStop,
  onRefresh
}: ServerControlsProps) => {
  const [stopRequested, setStopRequested] = useState(false);

  const handleStop = async () => {
    setStopRequested(true);
    const stoppedRequestAccepted = await onStop();
    if (!stoppedRequestAccepted) setStopRequested(false);
  };

  const handleStart = () => {
    setStopRequested(false);
    onStart();
  };

  const isStopping = stopping || (stopRequested && running);

  return (
  <div>
    <h6 className="text-uppercase text-muted mb-3">Controls</h6>
    <div className="d-grid gap-2">
      <button
        className="btn btn-success d-flex align-items-center justify-content-center"
        onClick={handleStart}
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
          onClick={() => void handleStop()}
          disabled={!running || isStopping || playerCount > 0}
        >
          <i className="bi bi-stop-fill me-2"></i>
          {isStopping ? 'Stopping Server, Please Wait' : 'Stop Server'}
        </button>
      </span>
      {playerCount > 0 && running && !isStopping && (
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
};
