/**
 * SIAE - Punto de entrada del servidor HTTP (SCRUM-14).
 */
import type { Server } from 'node:http';
import { createApp } from './app';
import { closePool } from './config/db';
import { env } from './config/env';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[SIAE] API escuchando en el puerto ${env.PORT} (${env.NODE_ENV}) · health: /api/health · prefijo: ${env.API_PREFIX}`,
  );
});

// Cierre ordenado para Docker (SIGTERM) y Ctrl+C (SIGINT).
const shutdown = (signal: NodeJS.Signals): void => {
  // eslint-disable-next-line no-console
  console.log(`[SIAE] ${signal} recibido, cerrando servidor...`);
  server.close((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('[SIAE] Error al cerrar el servidor:', err);
      process.exit(1);
    }
    closePool()
      .catch((poolErr: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[SIAE] Error al cerrar el pool de MySQL:', poolErr);
      })
      .finally(() => process.exit(0));
  });
  // Forzar salida si quedan conexiones colgadas.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[SIAE] Promesa rechazada sin manejar:', reason);
});

export default server;
