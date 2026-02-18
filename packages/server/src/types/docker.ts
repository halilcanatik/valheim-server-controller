export interface DockerError extends Error {
  statusCode: number;
}

export const isDockerError = (e: unknown): e is DockerError => {
  return e instanceof Error && 'statusCode' in e;
};
