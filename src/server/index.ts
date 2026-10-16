import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Healthcheck endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRouter);

// Serve client static assets in production
const clientDistPath = path.resolve(process.cwd(), 'dist', 'client');
app.use(express.static(clientDistPath));

app.get('*', (_req, res) => {
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('MasteryQuiz API activa. Frontend en desarrollo.');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MasteryQuiz Server corriendo en http://0.0.0.0:${PORT}`);
});
