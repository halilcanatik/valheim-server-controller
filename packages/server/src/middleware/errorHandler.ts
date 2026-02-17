import type { ErrorRequestHandler } from 'express';

interface DockerodeError {
  statusCode?: number;
  message: string;
}

const isDockerodeError = (e: unknown): e is DockerodeError =>
  typeof e === 'object' && e !== null && 'statusCode' in e;

export const errorHandler: ErrorRequestHandler = (e, _req, res, _next) => {
  console.error('Unhandled error:', e);

  if (isDockerodeError(e)) {
    res.status(e.statusCode ?? 500).json({ error: e.message });
    return;
  }

  if (e instanceof Error) {
    res.status(500).json({ error: e.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
};
