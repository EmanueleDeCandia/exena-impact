import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { area1Router } from './area1Routes.js';
import { area2Router } from './area2Routes.js';
import { area3Router } from './area3Routes.js';
import { area4Router } from './area4Routes.js';
import { area5Router } from './area5Routes.js';
import { initStore } from './store.js';

const app = express();
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || (production ? 5173 : 8787));
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.disable('x-powered-by');
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.json({ limit: '256kb' }));
app.use('/api', area1Router);
app.use('/api', area2Router);
app.use('/api', area3Router);
app.use('/api', area4Router);
app.use('/api', area5Router);
app.use('/api', (request, response) => response.status(404).json({ error: 'Endpoint API non trovato' }));
app.use('/api', (error, request, response, next) => {
  console.error('[API Workspace]', error.message);
  response.status(error.status || 500).json({ error: error.status ? error.message : 'Errore interno del servizio', ...(error.details ? { details: error.details } : {}) });
});

const dist = path.resolve(__dirname, '../dist');
// La preview della piattaforma può aprire la porta API: se la build è disponibile,
// serviamo anche qui la SPA per evitare un fuorviante "Cannot GET /".
if (production || existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.use((request, response, next) => {
    if (request.method !== 'GET') return next();
    response.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((error, request, response, next) => {
  console.error('[Server]', error);
  response.status(500).send('Errore interno');
});

await initStore();
app.listen(port, '0.0.0.0', () => {
  console.log(`Sibillini Impact API ${production ? 'e frontend' : 'demo'} attivi su http://0.0.0.0:${port}`);
});
