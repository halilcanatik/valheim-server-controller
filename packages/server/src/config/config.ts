export const config = {
  port: process.env.PORT || 3000,
  apiKey: process.env.API_KEY || 'secure-api-key',
  containerName: process.env.VALHEIM_CONTAINER_NAME || 'valheim-server',
  idleTimeoutMinutes: parseInt(process.env.IDLE_TIMEOUT_MINUTES || '30'),
  dockerHost: process.env.DOCKER_HOST || 'tcp://docker-proxy:2375',

  valheimConfigPath:
    process.env.VALHEIM_CONFIG_PATH || '/valheim-config',

  worldName: process.env.WORLD_NAME || ''
}as const;