# SIAE · Sistema de Información e Histórico Digital de Créditos Complementarios

Plataforma web del **Departamento de Actividades Extraescolares del Instituto Tecnológico de Pachuca (ITP)** para administrar talleres extraescolares, inscripciones concurrentes, avance académico, cómputo automático de créditos complementarios y emisión de constancias con folio y QR.

Desarrollado por el equipo **SYS NOVA** · Proyecto Jira **SysNova II** (clave `SCRUM`).

---

## Tabla de contenido

1. [Equipo](#equipo)
2. [Arquitectura](#arquitectura)
3. [Stack tecnológico](#stack-tecnológico)
4. [Estructura del repositorio](#estructura-del-repositorio)
5. [Módulos del backend](#módulos-del-backend)
6. [Reglas de negocio innegociables](#reglas-de-negocio-innegociables)
7. [Contratos de la API](#contratos-de-la-api)
8. [Puesta en marcha](#puesta-en-marcha)
9. [Flujo de trabajo Git y ramas](#flujo-de-trabajo-git-y-ramas)
10. [Reglas de trabajo del equipo](#reglas-de-trabajo-del-equipo)

---

## Equipo

| Integrante | Rol |
|---|---|
| Alejandro García Villegas | Líder técnico / Scrum Master · Backend, seguridad y arquitectura |
| Alan Daniel Castro Espinoza | Base de datos · Backend · QA |
| Axel Ortiz Pérez | Frontend React · Tailwind · UI/UX |
| Alam Noe Nol Atanacio | DevOps · Docker · Backend/Frontend |

---

## Arquitectura

SIAE es un **monolito modular**: un solo backend desplegable, organizado en módulos desacoplados por dominio (MOD-001 a MOD-005), consumido por una SPA en React mediante una API REST JSON.

```
                        Internet (HTTPS :443)
                                 │
                    ┌────────────▼────────────┐
                    │   Nginx (proxy inverso)  │  TLS · estáticos del frontend
                    └──────┬──────────┬────────┘
                 /  (SPA)  │          │  /api/*
             ┌─────────────▼──┐   ┌───▼──────────────────────────────┐
             │ React 18 + Vite│   │ Node.js + Express + TypeScript   │
             │ Tailwind · Zod │   │ ┌──────────────────────────────┐ │
             └────────────────┘   │ │ Middlewares globales          │ │
                                  │ │ helmet · cors · cookie-parser │ │
                                  │ │ auth JWT · RBAC · validate Zod│ │
                                  │ │ error handler                 │ │
                                  │ └──────────────────────────────┘ │
                                  │  MOD-001  MOD-002  MOD-003        │
                                  │  MOD-004  MOD-005                 │
                                  └───┬───────────────────────┬──────┘
                                      │ mysql2 (async/await)  │ Multer
                              ┌───────▼────────┐      ┌───────▼───────┐
                              │ MySQL 8.0      │      │ Volumen        │
                              │ InnoDB · 3FN   │      │ uploads/       │
                              └────────────────┘      └───────────────┘
                                      Nodemailer → SMTP institucional
```

Despliegue con **Docker Compose** en tres servicios aislados: `nginx`, `backend` (Node.js) y `mysql`.

### Principios de diseño

- **Identidad desde el servidor**: el `id_usuario`, rol y matrícula se leen del JWT en cookie `HttpOnly`/`Secure`; nunca del body, params o query (anti-IDOR, RNF-003).
- **Validación en dos capas**: Zod en el frontend (UX) y Zod + transacción SQL en el backend (autoridad final).
- **Crédito inviolable**: el saldo lo calcula exclusivamente el motor MOD-003 (RN-003, RN-004).
- **Parámetros centralizados**: límites y folios en `PARAMETRO_SISTEMA`, sin valores fijos en código (RIES-DIS-003).
- **Historial preservado**: baja lógica en entidades clave, nunca `DELETE` físico (RN-007).

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS · Formik + Zod |
| Backend | Node.js (>= 20) + Express 4 + TypeScript (strict) |
| Validación | Zod (contratos compartidos en `backend/src/schemas/api.contracts.ts`) |
| Base de datos | MySQL 8.0, InnoDB, 3FN · driver nativo `mysql2` con `async/await` y transacciones explícitas (sin ORM) |
| Autenticación | JWT en cookie `HttpOnly`/`Secure`/`SameSite` · BCrypt (costo >= 10) |
| Autorización | Middleware RBAC: Administrador, Personal, Docente, Alumno (+ permiso dinámico de promotor RN-008) |
| Archivos | Multer (PDF, DOCX, JPG, PNG; tamaño máximo desde `PARAMETRO_SISTEMA`) |
| Correo | Nodemailer vía SMTP |
| Infraestructura | Docker Compose + Nginx (HTTPS :443) |

### Paleta institucional (Tailwind)

| Token | Hex |
|---|---|
| Primario | `#1D4ED8` |
| Fondo | `#F8FAFC` |
| Superficie | `#FFFFFF` |
| Texto | `#0F172A` |
| Éxito | `#15803D` |
| Error | `#B91C1C` |

---

## Estructura del repositorio

```
SIAE-SysNova/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts                  # Express: middlewares globales, /api/health, montaje de módulos
│       ├── server.ts               # Arranque HTTP y cierre ordenado
│       ├── config/
│       │   └── env.ts              # Variables de entorno tipadas y validadas con Zod
│       ├── middlewares/
│       │   ├── error.middleware.ts     # Errores → JSON estándar (Zod, MySQL, Multer, AppError)
│       │   └── validate.middleware.ts  # validate({ body, params, query })
│       ├── schemas/
│       │   └── api.contracts.ts    # Contratos JSON + esquemas Zod de MOD-001…MOD-005
│       ├── types/
│       │   └── http.types.ts       # ApiResponse, AppError, códigos de error
│       └── modules/
│           ├── mod001-inscripciones/
│           ├── mod002-configuracion/
│           ├── mod003-evaluador/
│           ├── mod004-materiales/
│           └── mod005-identidad/
├── frontend/                       # SPA React 18 + Vite (SCRUM-13)
├── database/                       # DDL, seeders y migraciones MySQL 8 (SCRUM-2)
├── docker/                         # Dockerfiles, docker-compose y Nginx (SCRUM-11)
├── uploads/                        # Archivos de Multer (contenido ignorado por Git)
├── .env.example
└── README.md
```

Convención interna sugerida para cada módulo:

```
modXXX-nombre/
├── nombre.routes.ts       # Router Express + validate() + RBAC
├── nombre.controller.ts   # Traduce HTTP ↔ servicio
├── nombre.service.ts      # Reglas de negocio y transacciones
└── nombre.repository.ts   # SQL con mysql2 (consultas parametrizadas)
```

---

## Módulos del backend

| Módulo | Responsabilidad | Tickets principales |
|---|---|---|
| **MOD-001 Inscripciones** | Inscripción concurrente con `SELECT ... FOR UPDATE`, baja voluntaria en dos pasos, listas de grupo | SCRUM-30, 31, 28 |
| **MOD-002 Configuración** | Periodos lectivos, aulas, talleres (baja lógica), `PARAMETRO_SISTEMA` | SCRUM-18, 19, 24, 25 |
| **MOD-003 Evaluador** | Captura de asistencia/evidencias, motor automático de créditos, estado "Liberado", expedientes | SCRUM-27, 32, 34, 35, 36 |
| **MOD-004 Materiales** | Repositorio de materiales por taller (Multer) | SCRUM-33 |
| **MOD-005 Identidad/RBAC** | Login BCrypt + JWT, bloqueo por fuerza bruta, recuperación SMTP, cuentas y roles | SCRUM-15, 16, 17 |

---

## Reglas de negocio innegociables

| ID | Regla | Cómo se aplica |
|---|---|---|
| RN-001 | Operaciones solo con periodo `Activo` | Validación en servicio contra `PERIODO.estado` y hora del servidor |
| RN-002 | Número de control único e inmutable / sin sobrecupo | `UNIQUE` en BD; matrícula fuera de los esquemas de edición; conteo dentro de transacción |
| RN-003 | Crédito solo si el dictamen es `Acreditado` | Motor MOD-003 con parámetros de `PARAMETRO_SISTEMA` |
| RN-004 | Nadie edita el saldo manualmente | Esquemas `.strict()` rechazan `creditos`/`estatus_credito`; no existe endpoint de escritura |
| RN-005 | Folio consecutivo único + QR | Folios configurados en `PARAMETRO_SISTEMA` |
| RN-006 | El alumno solo ve su propio expediente | Identidad desde JWT; 403 si intenta otro recurso |
| RN-007 | Baja lógica, nunca `DELETE` físico | Endpoints `PATCH .../estado`; FKs `ON DELETE RESTRICT` |
| RN-008 | Promotor conserva rol Alumno; lectura de su grupo | Permiso dinámico por `ACTIVIDAD.id_responsable` |
| RIES-DIS-001 | Inscripción y baja con transacción ACID | `START TRANSACTION` + `SELECT ... FOR UPDATE` + `COMMIT/ROLLBACK` |
| RIES-DIS-003 | Sin límites fijos en código | Lectura de `PARAMETRO_SISTEMA` |
| RNF-003 | RBAC + propiedad del recurso en servidor | Middleware de roles + verificación de dueño → HTTP 403 |

---

## Contratos de la API

- Prefijo: `/api/v1` · Healthcheck: `GET /api/health`
- Formato de respuesta:

```json
// Éxito
{ "ok": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 57 } }

// Error
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": { "campos": [{ "ruta": "body.cupo_maximo", "mensaje": "El cupo debe ser mayor que cero", "codigo": "too_small" }] }
  }
}
```

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | Zod, JSON inválido, FK inexistente, CHECK violado |
| 401 | `UNAUTHENTICATED` | Sin cookie o JWT expirado |
| 403 | `FORBIDDEN` | Rol no autorizado o recurso ajeno (IDOR) |
| 404 | `NOT_FOUND` | Ruta o recurso inexistente |
| 409 | `CONFLICT` / `CUPO_AGOTADO` / `PERIODO_NO_ACTIVO` | Duplicados, integridad, concurrencia, reglas RN |
| 413 | `PAYLOAD_TOO_LARGE` | Archivo mayor al límite de `PARAMETRO_SISTEMA` |
| 429 | `TOO_MANY_REQUESTS` | Bloqueo por intentos fallidos (RNF-004) |
| 500 | `INTERNAL_ERROR` | Error no controlado (sin detalles en producción) |

El catálogo completo de endpoints, roles RBAC y esquemas de cada body está en `API_ROUTES` dentro de [`backend/src/schemas/api.contracts.ts`](backend/src/schemas/api.contracts.ts). Ese archivo puede copiarse al frontend: solo depende de `zod`.

Ejemplo de uso en una ruta:

```ts
import { validate } from '../../middlewares/validate.middleware';
import { crearInscripcionSchema } from '../../schemas/api.contracts';

router.post('/', requireAuth, requireRole('Alumno'), validate({ body: crearInscripcionSchema }), controller.crear);
```

---

## Puesta en marcha

### Requisitos

- Node.js >= 20 y npm
- MySQL 8.0 (local o en Docker)
- Docker Desktop (para el entorno contenerizado)

### Backend en local

```bash
cp .env.example backend/.env      # edita JWT_SECRET, COOKIE_SECRET y credenciales de BD
cd backend
npm install
npm run dev                       # http://localhost:3000/api/health
```

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor con recarga (tsx watch) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta `dist/server.js` |
| `npm run typecheck` | Verificación de tipos sin emitir |

### Docker Compose

Los archivos de `docker/` se agregan en **SCRUM-11**. Una vez disponibles:

```bash
cp .env.example .env
docker compose up -d --build
```

---

## Flujo de trabajo Git y ramas

### Ramas

| Rama | Uso |
|---|---|
| `main` | Código estable. **Solo se fusiona con aprobación explícita del líder técnico.** Protegida, sin pushes directos. |
| `develop` | Integración del sprint (opcional según acuerdo del equipo). |
| `feature/SCRUM-XX-descripcion-corta` | Una rama por ticket de Jira. Ej.: `feature/SCRUM-15-login` |
| `fix/SCRUM-XX-descripcion` | Corrección de un defecto ligado a un ticket. |
| `hotfix/descripcion` | Corrección urgente sobre `main` (requiere aprobación). |

### Convención de commits

```
SCRUM-XX: <tipo>: <descripción en imperativo>

tipos: feat · fix · refactor · docs · test · chore · db
ej.:   SCRUM-14: feat: agrega middleware de validación con Zod
```

### Pull Requests

1. Crea la rama desde `main` actualizado: `git checkout -b feature/SCRUM-XX-nombre`.
2. Mueve el ticket en Jira de **Asignada** a **En desarrollo**.
3. Antes del PR: `npm run typecheck` y `npm run build` sin errores.
4. Abre el PR con título `SCRUM-XX: <resumen>` y en la descripción incluye: criterios de aceptación (BDD) cubiertos, evidencia (captura o prueba), y cambios en BD/contratos si los hay.
5. Revisión obligatoria de Alejandro. Checklist de auditoría:
   - [ ] Sin `DELETE` físico en entidades clave (RN-007)
   - [ ] Inscripción/baja con transacción y `SELECT ... FOR UPDATE`
   - [ ] Sin límites hardcodeados (usa `PARAMETRO_SISTEMA`)
   - [ ] Rol RBAC + propiedad del recurso validados en servidor (403)
   - [ ] Ningún endpoint escribe el saldo de créditos
   - [ ] Consultas SQL parametrizadas (sin concatenar strings)
   - [ ] Body/params/query validados con esquemas de `api.contracts.ts`
6. Adjunta el enlace del PR al ticket en Jira.

---

## Reglas de trabajo del equipo

1. Reporte diario antes de terminar el día: avance (con clave SCRUM), plan de mañana y bloqueos.
2. Dudas y revisiones de 9:00 a 11:00.
3. Si te atoras más de 45 minutos, avisa al líder de inmediato.
4. Cambios en diseño, base de datos, contratos API o lógica se consultan antes con Alejandro.
5. Nada llega a `main` sin aprobación explícita de Alejandro.
6. Jira siempre actualizado, con evidencia al cerrar el ticket.
7. Una rama por ticket con su ID (`feature/SCRUM-XX-...`).
8. Prohibido modificar tablas, columnas, ENUMs o rutas `/api/*` sin avisar al equipo.
9. Cumplir los criterios de aceptación BDD de cada ticket.

---

© SYS NOVA · Instituto Tecnológico de Pachuca
