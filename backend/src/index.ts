import express from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { requestLogger } from './middleware/requestLogger.js';
import { mergeRoutes } from './routes/mergeRoutes.js';

dotenv.config()

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/health', (_req, res) => {
  res.sendStatus(200);
});


if (process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "development") {
  app.use(requestLogger);
}

app.use('/', mergeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);


app.listen(port, () => {
  console.log(`OpenAPI merger backend listenng on http://localhost:${port}`)
})
