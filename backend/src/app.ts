/**
 * SIAE - Aplicación Express (SCRUM-14).
 *
 * Monolito modular: cada módulo (MOD-001 a MOD-005) expondrá su propio Router
 * y se montará bajo env.API_PREFIX (/api/v1) en los tickets correspondientes.
 */
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import { corsOrigins, env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import type { HealthResponse } from './schemas/api.contracts';
import { ok } from './types/http.types';

export const createApp = (): Express => {
  const app = express();

  // Nginx actúa como proxy inverso HTTPS (necesario para cookies Secure e IP real).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Peticiones sin Origin (curl, healthchecks de Docker) se permiten.
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true, // obligatorio para enviar la cookie HttpOnly con el JWT
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  };
  app.use(cors(corsOptions));

  // Los archivos (MOD-004) van por multipart/Multer; el JSON se limita a 1 MB.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Healthcheck para Docker Compose / Nginx
  app.get('/api/health', (_req: Request, res: Response) => {
    const body: HealthResponse = {
      status: 'ok',
      service: 'siae-backend',
      environment: env.NODE_ENV,
      uptime_s: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(ok(body));
  });

  // --- Montaje de módulos (se habilitan en sus tickets) ---
  // app.use(`${env.API_PREFIX}/auth`, identidadRouter);        // MOD-005 · SCRUM-15/16/17
  // app.use(`${env.API_PREFIX}/periodos`, periodosRouter);     // MOD-002 · SCRUM-18
  // app.use(`${env.API_PREFIX}/aulas`, aulasRouter);           // MOD-002 · SCRUM-19
  // app.use(`${env.API_PREFIX}/actividades`, actividadesRouter); // MOD-002 · SCRUM-24
  // app.use(`${env.API_PREFIX}/parametros`, parametrosRouter); // MOD-002 · SCRUM-25
  // app.use(`${env.API_PREFIX}/inscripciones`, inscripcionesRouter); // MOD-001 · SCRUM-30/31
  // app.use(`${env.API_PREFIX}/avance`, evaluadorRouter);      // MOD-003 · SCRUM-34/35
  // app.use(`${env.API_PREFIX}/materiales`, materialesRouter); // MOD-004 · SCRUM-33

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
};
