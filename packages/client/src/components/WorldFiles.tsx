import { useEffect, useState } from 'react';
import type { ServerStatus, WorldInfo, WorldsResponse } from '../types';

interface WorldFilesProps {
  status: ServerStatus;
  fetchWorlds: () => Promise<WorldsResponse | null>;
  downloadWorld: (worldName: string) => Promise<Blob | null>;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date));

export const WorldFiles = ({
  status,
  fetchWorlds,
  downloadWorld
}: WorldFilesProps) => {
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [selectedWorld, setSelectedWorld] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isStopped = status.status === 'exited';
  const selected = worlds.find((world) => world.name === selectedWorld);

  useEffect(() => {
    if (!isStopped) return;

    let active = true;
    void fetchWorlds().then((data) => {
      if (!active) return;
      setWorlds(data?.worlds ?? []);
      setSelectedWorld(data?.currentWorld || data?.worlds[0]?.name || '');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isStopped, fetchWorlds]);

  const handleDownload = async () => {
    if (!selected || !isStopped) return;

    setDownloading(true);
    const blob = await downloadWorld(selected.name);
    setDownloading(false);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selected.name}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="world-files">
      <h6 className="text-uppercase text-muted mb-3">World Download</h6>
      <p className="text-muted small">
        Download a world only after the server has completely stopped.
      </p>

      <select
        className="form-select mb-3"
        value={selectedWorld}
        onChange={(event) => setSelectedWorld(event.target.value)}
        disabled={!isStopped || loading || worlds.length === 0}
      >
        {loading && <option>Loading worlds...</option>}
        {!loading && worlds.length === 0 && <option>No complete worlds found</option>}
        {worlds.map((world) => (
          <option key={world.name} value={world.name}>
            {world.name}
          </option>
        ))}
      </select>

      {selected && (
        <div className="small text-muted mb-3">
          <div>Last saved: {formatDate(selected.lastModified)}</div>
          <div>Size: {formatSize(selected.dbSize + selected.fwlSize)}</div>
        </div>
      )}

      {!isStopped && (
        <div className="alert alert-warning small mb-3">
          Stop the server before downloading a world.
        </div>
      )}

      <button
        className="btn btn-info w-100"
        onClick={() => void handleDownload()}
        disabled={!isStopped || !selected || downloading}
      >
        <i className="bi bi-download me-2"></i>
        {downloading ? 'Preparing download...' : 'Download World'}
      </button>
    </div>
  );
};