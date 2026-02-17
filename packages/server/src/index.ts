import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config';
import { authenticate } from './middleware/authenticate';
import { errorHandler } from './middleware/errorHandler';
import { serverRouter } from './routes/server';
import { startIdleMonitor } from './services/idleMonitor';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);
app.use('/api', authenticate, serverRouter);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Valheim Controller running on port ${config.port}`);
  console.log(`Monitoring: ${config.containerName}`);
  console.log(`Idle timeout: ${config.idleTimeoutMinutes} minutes`);
  startIdleMonitor();
});
