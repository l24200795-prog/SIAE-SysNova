/**
 * SIAE - Middleware de validación con Zod (SCRUM-14).
 *
 * Uso:
 *   router.post(
 *     '/inscripciones',
 *     validate({ body: crearInscripcionSchema }),
 *     controller.crear,
 *   );
 *
 * - Valida body, params y query contra esquemas de api.contracts.ts.
 * - Reemplaza req.body / req.params / req.query por los datos ya parseados
 *   (con coerción y valores por defecto aplicados).
 * - Si falla, delega un ZodError al error.middleware → HTTP 400 VALIDATION_ERROR.
 *
 * Esta es la capa de validación de FORMA. Las reglas que dependen de datos
 * (cupo, vigencia de periodo, propiedad del recurso) se validan en el servicio
 * dentro de la transacción (RIES-DIS-001, RNF-003).
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

export interface RequestSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validate =
  (schemas: RequestSchemas): RequestHandler =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const issues: ZodError['issues'] = [];

      const run = async (
        part: keyof RequestSchemas,
        schema: ZodTypeAny | undefined,
        value: unknown,
      ): Promise<unknown> => {
        if (!schema) return value;
        const result = await schema.safeParseAsync(value);
        if (!result.success) {
          // Prefijamos la ruta con la parte de la petición: ["body", "cupo_maximo"]
          issues.push(...result.error.issues.map((i) => ({ ...i, path: [part, ...i.path] })));
          return value;
        }
        return result.data;
      };

      const body = await run('body', schemas.body, req.body);
      const params = await run('params', schemas.params, req.params);
      const query = await run('query', schemas.query, req.query);

      if (issues.length > 0) {
        next(new ZodError(issues));
        return;
      }

      req.body = body;
      req.params = params as Request['params'];
      // En Express 4 req.query es asignable; en Express 5 es solo lectura (getter).
      Object.defineProperty(req, 'query', { value: query, writable: true, configurable: true });

      next();
    } catch (err) {
      next(err);
    }
  };
