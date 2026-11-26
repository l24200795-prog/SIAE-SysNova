/**
 * ============================================================================
 * SIAE - Contratos API REST y esquemas Zod (SCRUM-14)
 * SYS NOVA · Instituto Tecnológico de Pachuca
 * ============================================================================
 *
 * Fuente de verdad de los contratos JSON entre el frontend (React) y la API
 * (Express). Basado en SYSNOVA.pdf: diccionario de datos (Tablas 31–38),
 * catálogos ENUM (19.5), reglas de negocio RN-001…RN-008 y validaciones de
 * formularios (Tabla 40).
 *
 * Convenciones:
 *  - Prefijo de rutas: /api/v1 (ver API_ROUTES al final).
 *  - Nombres de campos en snake_case, idénticos a las columnas de MySQL.
 *  - Todos los esquemas de entrada son .strict(): cualquier campo no declarado
 *    se rechaza con HTTP 400. Esto bloquea, por ejemplo, que alguien envíe
 *    "creditos" o "estatus_credito" para alterar el saldo (RN-003, RN-004),
 *    o "id_alumno" para inscribir/consultar a otro estudiante (RNF-003, IDOR).
 *  - La identidad del usuario (id_usuario, rol, matricula) SIEMPRE se toma del
 *    JWT en la cookie HttpOnly, nunca del body/params/query.
 *  - Los límites de negocio (asistencia mínima, tamaño máximo de archivo,
 *    créditos requeridos, folios) NO están aquí: se leen de PARAMETRO_SISTEMA
 *    en el servicio (RIES-DIS-003).
 *  - Este archivo no importa nada del backend (solo zod) para poder reutilizarse
 *    tal cual en el frontend con Formik/Zod.
 *
 * Estado: CONTRATO OFICIAL aprobado por el líder técnico (2026-11-16, SCRUM-14).
 * Cualquier cambio a este archivo requiere aprobación del líder técnico
 * (Regla de equipo #4 y #8).
 */
import { z } from 'zod';

/* ============================================================================
 * 0. CATÁLOGOS ENUM (espejo exacto de los ENUM de MySQL 8 · sección 19.5)
 * ========================================================================== */

export const ROLES = ['Administrador', 'Personal', 'Docente', 'Alumno'] as const;
export const ESTADOS_PERIODO = ['Programado', 'Activo', 'Cerrado'] as const;
export const ESTADOS_ACTIVIDAD = ['Borrador', 'Activa', 'Llena', 'Cerrada', 'Inactiva'] as const;
export const ESTADOS_INSCRIPCION = ['Activa', 'Cancelada', 'Evaluada'] as const;
export const ESTATUS_CREDITO = ['Pendiente', 'Acreditado', 'No acreditado'] as const;

/** Tipos MIME permitidos (CHECK de MATERIAL.tipo_mime, Tabla 37). El tamaño máximo NO va aquí. */
export const MIME_PERMITIDOS = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
] as const;

export const rolSchema = z.enum(ROLES);
export const estadoPeriodoSchema = z.enum(ESTADOS_PERIODO);
export const estadoActividadSchema = z.enum(ESTADOS_ACTIVIDAD);
export const estadoInscripcionSchema = z.enum(ESTADOS_INSCRIPCION);
export const estatusCreditoSchema = z.enum(ESTATUS_CREDITO);
export const mimePermitidoSchema = z.enum(MIME_PERMITIDOS);

export type Rol = z.infer<typeof rolSchema>;
export type EstadoPeriodo = z.infer<typeof estadoPeriodoSchema>;
export type EstadoActividad = z.infer<typeof estadoActividadSchema>;
export type EstadoInscripcion = z.infer<typeof estadoInscripcionSchema>;
export type EstatusCredito = z.infer<typeof estatusCreditoSchema>;

/* ============================================================================
 * 1. PRIMITIVOS REUTILIZABLES
 * ========================================================================== */

/** INT AUTO_INCREMENT positivo; acepta "15" desde params/query. */
export const idSchema = z.coerce
  .number({ invalid_type_error: 'Debe ser un número' })
  .int('Debe ser un entero')
  .positive('Debe ser mayor que cero');

/**
 * Número de control / matrícula (USUARIO.matricula VARCHAR(10), RN-002).
 * Formato ITP: exactamente 8 dígitos numéricos (ej. 24200824).
 */
export const MATRICULA_LONGITUD = 8;
export const matriculaSchema = z
  .string({ required_error: 'La matrícula es obligatoria' })
  .trim()
  .min(1, 'La matrícula es obligatoria')
  .regex(/^\d+$/, 'La matrícula solo admite números (sin letras, espacios ni símbolos)')
  .length(MATRICULA_LONGITUD, `La matrícula debe tener exactamente ${MATRICULA_LONGITUD} dígitos`);

/** Correo genérico (USUARIO.correo VARCHAR(150)). */
export const correoSchema = z
  .string({ required_error: 'El correo es obligatorio' })
  .trim()
  .toLowerCase()
  .max(150, 'El correo admite máximo 150 caracteres')
  .email('Formato de correo inválido');

/**
 * Correo institucional (Tabla 40). El dominio se inyecta desde configuración
 * (CORREO_DOMINIO_INSTITUCIONAL) para no dejarlo fijo en el código.
 */
export const buildCorreoInstitucionalSchema = (dominio: string) =>
  correoSchema.refine((v) => v.endsWith(`@${dominio.toLowerCase()}`), {
    message: `Debe ser un correo institucional (@${dominio})`,
  });

/** Contraseña (Tabla 40: mínimo 8). Máximo 72 por el límite de bytes de BCrypt. */
export const contrasenaSchema = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña admite máximo 72 caracteres');

/** Hora TIME de MySQL: "HH:MM" o "HH:MM:SS" (24 h). Se normaliza a "HH:MM:SS". */
export const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Formato de hora inválido (HH:MM)')
  .transform((v) => (v.length === 5 ? `${v}:00` : v));

/** DATETIME en ISO-8601 (ej. "2026-01-26T08:00:00-06:00"). */
export const fechaHoraSchema = z.coerce.date({
  errorMap: () => ({ message: 'Fecha/hora inválida (usa ISO-8601)' }),
});

/** Paginación estándar para listados (límite técnico de respuesta, no regla de negocio). */
export const paginacionQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const idParamsSchema = z.object({ id: idSchema }).strict();

/* ============================================================================
 * 2. SOBRE DE RESPUESTA ESTÁNDAR
 *    Éxito:  { ok: true,  data: T, meta? }
 *    Error:  { ok: false, error: { code, message, details? } }
 * ========================================================================== */

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    ok: z.literal(true),
    data,
    meta: z.record(z.unknown()).optional(),
  });

export const paginacionMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});
export type PaginacionMeta = z.infer<typeof paginacionMetaSchema>;

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  environment: z.string(),
  uptime_s: z.number(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/* ============================================================================
 * 3. MOD-005 · IDENTIDAD Y RBAC  (SCRUM-15, SCRUM-16, SCRUM-17)
 * ========================================================================== */

/** POST /api/v1/auth/login → Set-Cookie HttpOnly con el JWT. */
export const buildLoginSchema = (dominioInstitucional: string) =>
  z
    .object({
      correo: buildCorreoInstitucionalSchema(dominioInstitucional),
      contrasena: contrasenaSchema,
    })
    .strict();
export type LoginRequest = z.infer<ReturnType<typeof buildLoginSchema>>;

/**
 * Roles que pueden crear su propia cuenta desde el formulario público.
 * Docente, Personal y Administrador los da de alta un Administrador
 * (POST /api/v1/usuarios) para evitar escalamiento de privilegios.
 */
export const ROLES_AUTORREGISTRO = ['Alumno'] as const satisfies readonly Rol[];

/**
 * POST /api/v1/auth/registro (público · SCRUM-11 / HU-008D).
 * Autorregistro con correo institucional y matrícula. El hash BCrypt se genera
 * en servidor. Duplicados de correo o matrícula → 409 CONFLICT.
 * PROPUESTA pendiente de aprobación del líder técnico (Regla de equipo #4).
 */
export const buildRegistroSchema = (dominioInstitucional: string) =>
  z
    .object({
      nombre: z
        .string({ required_error: 'El nombre es obligatorio' })
        .trim()
        .min(1, 'El nombre es obligatorio')
        .max(150, 'El nombre admite máximo 150 caracteres'),
      correo: buildCorreoInstitucionalSchema(dominioInstitucional),
      contrasena: contrasenaSchema,
      // Obligatoria porque el único rol de autorregistro es Alumno (Tabla 31).
      matricula: matriculaSchema,
      rol: z.enum(ROLES_AUTORREGISTRO, {
        errorMap: (issue) => ({
          message:
            issue.code === 'invalid_type' && issue.received === 'undefined'
              ? 'El rol es obligatorio'
              : 'Solo el rol Alumno puede registrarse; las demás cuentas las crea un Administrador',
        }),
      }),
    })
    .strict();
export type RegistroRequest = z.infer<ReturnType<typeof buildRegistroSchema>>;

/** POST /api/v1/auth/recuperar · Respuesta siempre 200 genérica (no revela si el correo existe). */
export const solicitarRecuperacionSchema = z.object({ correo: correoSchema }).strict();
export type SolicitarRecuperacionRequest = z.infer<typeof solicitarRecuperacionSchema>;

/** POST /api/v1/auth/restablecer */
export const restablecerContrasenaSchema = z
  .object({
    token: z.string().min(32, 'Token inválido').max(512, 'Token inválido'),
    contrasena_nueva: contrasenaSchema,
    confirmacion: z.string(),
  })
  .strict()
  .refine((d) => d.contrasena_nueva === d.confirmacion, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmacion'],
  });
export type RestablecerContrasenaRequest = z.infer<typeof restablecerContrasenaSchema>;

/** Valida que la matrícula solo exista para el rol Alumno (Tabla 31). */
const matriculaSegunRol = <T extends { rol?: Rol; matricula?: string | null }>(
  d: T,
  ctx: z.RefinementCtx,
): void => {
  if (d.rol === undefined) return;
  if (d.rol === 'Alumno' && !d.matricula) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['matricula'],
      message: 'La matrícula es obligatoria para el rol Alumno',
    });
  }
  if (d.rol !== 'Alumno' && d.matricula) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['matricula'],
      message: 'Solo los usuarios con rol Alumno tienen matrícula',
    });
  }
};

/** POST /api/v1/usuarios (Administrador). El hash BCrypt se genera en servidor. */
export const crearUsuarioSchema = z
  .object({
    matricula: matriculaSchema.nullable().optional(),
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
    correo: correoSchema,
    contrasena: contrasenaSchema,
    rol: rolSchema,
  })
  .strict()
  .superRefine(matriculaSegunRol);
export type CrearUsuarioRequest = z.infer<typeof crearUsuarioSchema>;

/**
 * PATCH /api/v1/usuarios/:id (Administrador).
 * La matrícula es inmutable (RN-002) y la contraseña/estado tienen endpoints propios.
 */
export const actualizarUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(1).max(150).optional(),
    correo: correoSchema.optional(),
    rol: rolSchema.optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'Envía al menos un campo a actualizar' });
export type ActualizarUsuarioRequest = z.infer<typeof actualizarUsuarioSchema>;

/** PATCH /api/v1/usuarios/:id/estado · Baja/reactivación lógica (RN-007). Nunca DELETE. */
export const cambiarEstadoUsuarioSchema = z.object({ activo: z.boolean() }).strict();
export type CambiarEstadoUsuarioRequest = z.infer<typeof cambiarEstadoUsuarioSchema>;

export const listarUsuariosQuerySchema = paginacionQuerySchema
  .extend({
    rol: rolSchema.optional(),
    activo: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    q: z.string().trim().max(150).optional(),
  })
  .strict();

/** Representación pública de USUARIO (jamás incluye contrasena_hash). */
export const usuarioDtoSchema = z.object({
  id_usuario: z.number().int(),
  matricula: z.string().nullable(),
  nombre: z.string(),
  correo: z.string(),
  rol: rolSchema,
  activo: z.boolean(),
});
export type UsuarioDTO = z.infer<typeof usuarioDtoSchema>;

/** GET /api/v1/auth/me y respuesta de login. */
export const sesionDtoSchema = z.object({
  usuario: usuarioDtoSchema,
  /** IDs de actividades donde el usuario es responsable (permiso dinámico RN-008). */
  actividades_responsable: z.array(z.number().int()),
});
export type SesionDTO = z.infer<typeof sesionDtoSchema>;

/** Payload firmado dentro del JWT (cookie HttpOnly). Mínimo indispensable. */
export interface JwtPayload {
  sub: number; // id_usuario
  rol: Rol;
  matricula: string | null;
}

/* ============================================================================
 * 4. MOD-002 · CONFIGURACIÓN  (SCRUM-18, 19, 24, 25)
 * ========================================================================== */

/* ---- 4.1 PERIODO (Tabla 32) ---------------------------------------------- */

const periodoBase = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  fecha_hora_inicio: fechaHoraSchema,
  fecha_hora_fin: fechaHoraSchema,
});

/**
 * POST /api/v1/periodos (Administrador). Se crea en estado 'Programado'.
 * El traslape con otro periodo 'Activo' (RN-001) se valida en servidor contra BD.
 */
export const crearPeriodoSchema = periodoBase.strict().refine(
  (d) => d.fecha_hora_fin > d.fecha_hora_inicio,
  { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['fecha_hora_fin'] },
);
export type CrearPeriodoRequest = z.infer<typeof crearPeriodoSchema>;

/** PATCH /api/v1/periodos/:id */
export const actualizarPeriodoSchema = periodoBase
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'Envía al menos un campo a actualizar' })
  .refine(
    (d) => !(d.fecha_hora_inicio && d.fecha_hora_fin) || d.fecha_hora_fin > d.fecha_hora_inicio,
    { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['fecha_hora_fin'] },
  );
export type ActualizarPeriodoRequest = z.infer<typeof actualizarPeriodoSchema>;

/** PATCH /api/v1/periodos/:id/estado · Transiciones válidas se verifican en servidor. */
export const cambiarEstadoPeriodoSchema = z.object({ estado: estadoPeriodoSchema }).strict();
export type CambiarEstadoPeriodoRequest = z.infer<typeof cambiarEstadoPeriodoSchema>;

export const periodoDtoSchema = z.object({
  id_periodo: z.number().int(),
  nombre: z.string(),
  fecha_hora_inicio: z.string(),
  fecha_hora_fin: z.string(),
  estado: estadoPeriodoSchema,
});
export type PeriodoDTO = z.infer<typeof periodoDtoSchema>;

/* ---- 4.2 AULA (Tabla 33) ------------------------------------------------- */

/** POST /api/v1/aulas (Administrador / Personal) */
export const crearAulaSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
    ubicacion: z.string().trim().max(150).nullable().optional(),
    capacidad: z.number().int('Debe ser entero').positive('La capacidad debe ser mayor que cero'),
  })
  .strict();
export type CrearAulaRequest = z.infer<typeof crearAulaSchema>;

/** PATCH /api/v1/aulas/:id */
export const actualizarAulaSchema = crearAulaSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Envía al menos un campo a actualizar' });
export type ActualizarAulaRequest = z.infer<typeof actualizarAulaSchema>;

export const aulaDtoSchema = z.object({
  id_aula: z.number().int(),
  nombre: z.string(),
  ubicacion: z.string().nullable(),
  capacidad: z.number().int(),
});
export type AulaDTO = z.infer<typeof aulaDtoSchema>;

/* ---- 4.3 ACTIVIDAD / TALLER (Tabla 34) ----------------------------------- */

const actividadBase = z.object({
  id_periodo: idSchema,
  id_aula: idSchema,
  id_responsable: idSchema,
  nombre: z.string().trim().min(1, 'El nombre del taller es obligatorio').max(100),
  descripcion: z.string().trim().max(500).nullable().optional(),
  dias: z.string().trim().min(1, 'Selecciona al menos un día').max(60),
  hora_inicio: horaSchema,
  hora_fin: horaSchema,
  cupo_maximo: z.number().int('Debe ser entero').positive('El cupo debe ser mayor que cero'),
});

/**
 * POST /api/v1/actividades (Personal / Administrador). Se crea en 'Borrador'.
 * Integridad referencial de periodo/aula/responsable se valida en BD (FK).
 */
export const crearActividadSchema = actividadBase.strict().refine(
  (d) => d.hora_fin > d.hora_inicio,
  { message: 'La hora final debe ser posterior a la hora de inicio', path: ['hora_fin'] },
);
export type CrearActividadRequest = z.infer<typeof crearActividadSchema>;

/**
 * PATCH /api/v1/actividades/:id
 * Regla de servidor (Tabla 40): cupo_maximo no puede ser menor que las
 * inscripciones 'Activa' actuales → validar con SELECT ... FOR UPDATE.
 */
export const actualizarActividadSchema = actividadBase
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'Envía al menos un campo a actualizar' })
  .refine((d) => !(d.hora_inicio && d.hora_fin) || d.hora_fin > d.hora_inicio, {
    message: 'La hora final debe ser posterior a la hora de inicio',
    path: ['hora_fin'],
  });
export type ActualizarActividadRequest = z.infer<typeof actualizarActividadSchema>;

/**
 * PATCH /api/v1/actividades/:id/estado
 * 'Inactiva' = baja lógica (RN-007). 'Llena' la asigna solo el motor de inscripciones.
 */
export const cambiarEstadoActividadSchema = z
  .object({ estado: estadoActividadSchema.exclude(['Llena']) })
  .strict();
export type CambiarEstadoActividadRequest = z.infer<typeof cambiarEstadoActividadSchema>;

/** GET /api/v1/actividades (catálogo SCR-002) */
export const catalogoActividadesQuerySchema = paginacionQuerySchema
  .extend({
    id_periodo: idSchema.optional(),
    estado: estadoActividadSchema.optional(),
    q: z.string().trim().max(100).optional(),
  })
  .strict();
export type CatalogoActividadesQuery = z.infer<typeof catalogoActividadesQuerySchema>;

export const actividadDtoSchema = z.object({
  id_actividad: z.number().int(),
  id_periodo: z.number().int(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  dias: z.string(),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  cupo_maximo: z.number().int(),
  /** Calculado: cupo_maximo - inscripciones 'Activa'. Solo informativo; el servidor decide. */
  lugares_disponibles: z.number().int(),
  estado: estadoActividadSchema,
  aula: aulaDtoSchema.pick({ id_aula: true, nombre: true, ubicacion: true }),
  responsable: z.object({ id_usuario: z.number().int(), nombre: z.string() }),
});
export type ActividadDTO = z.infer<typeof actividadDtoSchema>;

/* ---- 4.4 PARAMETRO_SISTEMA (Tabla 38) ------------------------------------ */

export const claveParametroSchema = z
  .string()
  .regex(/^[a-z0-9_]{1,50}$/, 'Clave de parámetro inválida (a-z, 0-9, _; máx. 50)');

/** PATCH /api/v1/parametros/:clave (Administrador). La validación semántica del valor va en servicio. */
export const parametroParamsSchema = z.object({ clave: claveParametroSchema }).strict();
export const actualizarParametroSchema = z
  .object({ valor: z.string().trim().min(1, 'El valor es obligatorio').max(100) })
  .strict();
export type ActualizarParametroRequest = z.infer<typeof actualizarParametroSchema>;

export const parametroDtoSchema = z.object({
  clave: z.string(),
  valor: z.string(),
  descripcion: z.string().nullable(),
});
export type ParametroDTO = z.infer<typeof parametroDtoSchema>;

/* ============================================================================
 * 5. MOD-001 · INSCRIPCIONES  (SCRUM-30, SCRUM-31)
 * ========================================================================== */

/**
 * POST /api/v1/inscripciones (Alumno)
 * El id_alumno se toma del JWT. El servicio ejecuta en una sola transacción:
 *   START TRANSACTION
 *   SELECT ... FROM ACTIVIDAD WHERE id_actividad = ? FOR UPDATE
 *   valida periodo 'Activo' (RN-001), estado 'Activa', cupo (RN-002), duplicado (RN-007)
 *   INSERT INSCRIPCION + INSERT AVANCE_ACADEMICO (1:1)
 *   COMMIT / ROLLBACK
 * Errores: 409 CUPO_AGOTADO · 409 PERIODO_NO_ACTIVO · 409 CONFLICT (ya inscrito).
 */
export const crearInscripcionSchema = z.object({ id_actividad: idSchema }).strict();
export type CrearInscripcionRequest = z.infer<typeof crearInscripcionSchema>;

/**
 * PATCH /api/v1/inscripciones/:id/cancelar (Alumno, solo su propia inscripción)
 * Baja voluntaria en dos pasos: el frontend muestra el modal y envía la
 * confirmación explícita. Estado → 'Cancelada' + fecha_cancelacion (RN-006/007).
 * Misma transacción con SELECT ... FOR UPDATE (RIES-DIS-001).
 */
export const cancelarInscripcionSchema = z
  .object({
    confirmacion: z.literal(true, {
      errorMap: () => ({ message: 'Debes confirmar la baja voluntaria' }),
    }),
  })
  .strict();
export type CancelarInscripcionRequest = z.infer<typeof cancelarInscripcionSchema>;

export const misInscripcionesQuerySchema = z
  .object({
    id_periodo: idSchema.optional(),
    estado: estadoInscripcionSchema.optional(),
  })
  .strict();

export const inscripcionDtoSchema = z.object({
  id_inscripcion: z.number().int(),
  id_actividad: z.number().int(),
  actividad_nombre: z.string(),
  periodo_nombre: z.string(),
  fecha_registro: z.string(),
  estado: estadoInscripcionSchema,
  fecha_cancelacion: z.string().nullable(),
});
export type InscripcionDTO = z.infer<typeof inscripcionDtoSchema>;

/** GET /api/v1/actividades/:id/inscritos (Docente/promotor responsable RN-008, Personal, Admin) */
export const inscritoGrupoDtoSchema = z.object({
  id_inscripcion: z.number().int(),
  matricula: z.string(),
  nombre: z.string(),
  estado: estadoInscripcionSchema,
});
export type InscritoGrupoDTO = z.infer<typeof inscritoGrupoDtoSchema>;

/* ============================================================================
 * 6. MOD-003 · EVALUADOR DE CRÉDITOS  (SCRUM-34, 35, 36)
 * ========================================================================== */

/**
 * PUT /api/v1/inscripciones/:id/avance  (SCR-004 · SCRUM-34)
 * Roles: Administrador, Personal y Docente.
 *  - Docente: SOLO en talleres que tiene asignados. El servicio verifica
 *    ACTIVIDAD.id_responsable = JWT.sub para la actividad de la inscripción;
 *    si no coincide → 403 FORBIDDEN (anti-IDOR, RNF-003).
 *  - Solo se capturan MÉTRICAS. No dispara el dictamen: estatus_credito
 *    permanece 'Pendiente' hasta la evaluación oficial (ver evaluarInscripcionSchema).
 * Enviar estatus_credito, creditos o saldo produce 400 por .strict() (RN-003, RN-004).
 * Requiere periodo 'Activo' (RN-001) e inscripción en estado 'Activa'.
 */
export const avanceParamsSchema = idParamsSchema;

export const registrarAvanceSchema = z
  .object({
    porcentaje_asistencia: z
      .number({ required_error: 'El porcentaje de asistencia es obligatorio' })
      .min(0, 'Mínimo 0')
      .max(100, 'Máximo 100')
      .multipleOf(0.01, 'Máximo dos decimales'),
    evidencia_cumplida: z.boolean({ required_error: 'Indica si cumplió con la evidencia' }),
  })
  .strict();
export type RegistrarAvanceRequest = z.infer<typeof registrarAvanceSchema>;

/**
 * POST /api/v1/inscripciones/:id/evaluar  (SCRUM-35 · solo Administrador y Personal)
 * Cambio OFICIAL de estatus_credito. El usuario no elige el resultado: este
 * endpoint ejecuta el motor MOD-003, que en una transacción:
 *   1. Lee porcentaje_asistencia y evidencia_cumplida de AVANCE_ACADEMICO.
 *   2. Lee PARAMETRO_SISTEMA.asistencia_minima (RIES-DIS-003).
 *   3. Asigna 'Acreditado' / 'No acreditado' y fecha_evaluacion (RN-003).
 *   4. Marca la inscripción como 'Evaluada' y recalcula el saldo (RN-004).
 *   5. Detecta el estado "Liberado" (SCRUM-36) y registra en bitácora (SCRUM-39).
 * El body solo lleva la confirmación explícita; cualquier campo de resultado → 400.
 */
export const evaluarInscripcionSchema = z
  .object({
    confirmacion: z.literal(true, {
      errorMap: () => ({ message: 'Debes confirmar la evaluación oficial' }),
    }),
  })
  .strict();
export type EvaluarInscripcionRequest = z.infer<typeof evaluarInscripcionSchema>;

export const avanceDtoSchema = z.object({
  id_inscripcion: z.number().int(),
  porcentaje_asistencia: z.number(),
  evidencia_cumplida: z.boolean(),
  estatus_credito: estatusCreditoSchema,
  fecha_evaluacion: z.string().nullable(),
});
export type AvanceDTO = z.infer<typeof avanceDtoSchema>;

/**
 * GET /api/v1/expedientes/:matricula (Personal/Admin · búsqueda en ventanilla < 7.0 s, RNF-001)
 * GET /api/v1/expedientes/me          (Alumno · su matrícula sale del JWT, RN-006 / CA-007-2)
 */
export const expedienteParamsSchema = z.object({ matricula: matriculaSchema }).strict();

export const historialItemDtoSchema = z.object({
  id_inscripcion: z.number().int(),
  periodo_nombre: z.string(),
  actividad_nombre: z.string(),
  estado_inscripcion: estadoInscripcionSchema,
  estatus_credito: estatusCreditoSchema,
  fecha_evaluacion: z.string().nullable(),
});

export const expedienteDtoSchema = z.object({
  alumno: usuarioDtoSchema.pick({ id_usuario: true, matricula: true, nombre: true, correo: true }),
  /** Calculado por el motor: conteo de 'Acreditado'. Solo lectura (RN-004). */
  creditos_acumulados: z.number().int(),
  /** Leído de PARAMETRO_SISTEMA (plan de estudios). */
  creditos_requeridos: z.number().int(),
  liberado: z.boolean(),
  historial: z.array(historialItemDtoSchema),
});
export type ExpedienteDTO = z.infer<typeof expedienteDtoSchema>;

/* ---- 6.1 CONSTANCIAS (SCRUM-37, SCRUM-38 · RN-005) ----------------------- */

/**
 * Folio de constancia. El prefijo y formato los define PARAMETRO_SISTEMA
 * (ej. "SIAE-2026-000123"), por eso aquí solo se valida un patrón genérico seguro.
 */
export const folioSchema = z
  .string()
  .trim()
  .min(1, 'El folio es obligatorio')
  .max(50, 'Folio inválido')
  .regex(/^[A-Za-z0-9-]+$/, 'Folio inválido');

/**
 * POST /api/v1/evaluador/constancias/:id_alumno  (Administrador y Personal)
 * Reglas de servidor (en transacción):
 *  - El alumno existe, está activo y su expediente está "Liberado" → si no, 409 CONFLICT.
 *  - El folio consecutivo se obtiene con SELECT ... FOR UPDATE sobre el
 *    contador de PARAMETRO_SISTEMA (sin huecos ni duplicados, RN-005).
 *  - Se genera el hash de verificación que se incrusta en el QR.
 * Sin body: cualquier campo enviado → 400.
 */
export const generarConstanciaParamsSchema = z.object({ id_alumno: idSchema }).strict();
/** .default({}) porque sin Content-Type JSON Express deja req.body como undefined. */
export const generarConstanciaBodySchema = z.object({}).strict().default({});

export const constanciaDtoSchema = z.object({
  folio: z.string(),
  fecha_emision: z.string(),
  alumno: usuarioDtoSchema.pick({ id_usuario: true, matricula: true, nombre: true }),
  creditos_acumulados: z.number().int(),
  /** URL completa codificada en el QR (incluye el hash de verificación). */
  url_verificacion: z.string(),
  /** Descarga autenticada del PDF. */
  url_pdf: z.string(),
});
export type ConstanciaDTO = z.infer<typeof constanciaDtoSchema>;

/**
 * GET /api/v1/public/constancias/verificar/:folio?h=<hash>  (público, sin sesión)
 * El parámetro "h" es obligatorio: como los folios son consecutivos, consultar
 * solo por folio permitiría enumerar a todos los alumnos liberados. El QR
 * apunta al hash de validación del servidor (RN-005); sin "h" válido → 404.
 * Respuesta con datos mínimos (sin correo ni id interno).
 */
export const verificarConstanciaParamsSchema = z.object({ folio: folioSchema }).strict();
export const verificarConstanciaQuerySchema = z
  .object({
    h: z
      .string()
      .regex(/^[A-Za-z0-9_-]{32,128}$/, 'Código de verificación inválido'),
  })
  .strict();

export const verificacionConstanciaDtoSchema = z.object({
  valida: z.literal(true),
  folio: z.string(),
  fecha_emision: z.string(),
  alumno_nombre: z.string(),
  matricula: z.string(),
  creditos_acumulados: z.number().int(),
  institucion: z.string(),
});
export type VerificacionConstanciaDTO = z.infer<typeof verificacionConstanciaDtoSchema>;

/* ============================================================================
 * 7. MOD-004 · MATERIALES  (SCRUM-33)
 * ========================================================================== */

/**
 * POST /api/v1/actividades/:id/materiales  (multipart/form-data, campo "archivo")
 * Multer valida MIME_PERMITIDOS y el límite de PARAMETRO_SISTEMA.tamano_maximo_mb.
 * El id_usuario_carga sale del JWT.
 */
export const subirMaterialParamsSchema = idParamsSchema;

/** Metadatos del archivo ya procesado por Multer, validados antes de persistir. */
export const archivoSubidoSchema = z.object({
  originalname: z.string().min(1).max(255),
  mimetype: mimePermitidoSchema,
  size: z.number().int().positive(),
  filename: z.string().min(1),
});
export type ArchivoSubido = z.infer<typeof archivoSubidoSchema>;

export const materialDtoSchema = z.object({
  id_material: z.number().int(),
  id_actividad: z.number().int(),
  nombre_original: z.string(),
  tipo_mime: mimePermitidoSchema,
  tamano_bytes: z.number().int(),
  fecha_carga: z.string(),
  cargado_por: z.object({ id_usuario: z.number().int(), nombre: z.string() }),
  /** URL de descarga autenticada (nunca la ruta física del servidor). */
  url_descarga: z.string(),
});
export type MaterialDTO = z.infer<typeof materialDtoSchema>;

/* ============================================================================
 * 8. CATÁLOGO DE RUTAS (contrato de endpoints + RBAC)
 *    "roles" = roles que pasan el middleware RBAC. La verificación de
 *    PROPIEDAD del recurso (anti-IDOR, HTTP 403) se hace además en el servicio
 *    cuando "propiedad" = true.
 * ========================================================================== */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteContract {
  method: HttpMethod;
  path: string;
  modulo: 'MOD-001' | 'MOD-002' | 'MOD-003' | 'MOD-004' | 'MOD-005' | 'CORE';
  ticket: string;
  roles: readonly Rol[] | 'public' | 'authenticated';
  propiedad?: boolean;
  body?: string;
  descripcion: string;
}

const STAFF = ['Administrador', 'Personal'] as const;

export const API_ROUTES = [
  // CORE
  { method: 'GET', path: '/api/health', modulo: 'CORE', ticket: 'SCRUM-14', roles: 'public', descripcion: 'Healthcheck' },

  // MOD-005 Identidad / RBAC
  { method: 'POST', path: '/api/v1/auth/login', modulo: 'MOD-005', ticket: 'SCRUM-15', roles: 'public', body: 'buildLoginSchema', descripcion: 'Inicio de sesión; emite cookie HttpOnly. Bloqueo tras 5 intentos/15 min (RNF-004)' },
  { method: 'POST', path: '/api/v1/auth/registro', modulo: 'MOD-005', ticket: 'SCRUM-11', roles: 'public', body: 'buildRegistroSchema', descripcion: 'Autorregistro de Alumno con correo institucional y matrícula (BCrypt). 201 · 400 · 409' },
  { method: 'POST', path: '/api/v1/auth/logout', modulo: 'MOD-005', ticket: 'SCRUM-15', roles: 'authenticated', descripcion: 'Cierra sesión y limpia la cookie' },
  { method: 'GET', path: '/api/v1/auth/me', modulo: 'MOD-005', ticket: 'SCRUM-15', roles: 'authenticated', descripcion: 'Sesión actual (SesionDTO)' },
  { method: 'POST', path: '/api/v1/auth/recuperar', modulo: 'MOD-005', ticket: 'SCRUM-16', roles: 'public', body: 'solicitarRecuperacionSchema', descripcion: 'Envía enlace de recuperación por SMTP' },
  { method: 'POST', path: '/api/v1/auth/restablecer', modulo: 'MOD-005', ticket: 'SCRUM-16', roles: 'public', body: 'restablecerContrasenaSchema', descripcion: 'Restablece contraseña con token' },
  { method: 'GET', path: '/api/v1/usuarios', modulo: 'MOD-005', ticket: 'SCRUM-17', roles: ['Administrador'], descripcion: 'Lista usuarios' },
  { method: 'POST', path: '/api/v1/usuarios', modulo: 'MOD-005', ticket: 'SCRUM-17', roles: ['Administrador'], body: 'crearUsuarioSchema', descripcion: 'Alta de usuario (BCrypt costo >= 10)' },
  { method: 'PATCH', path: '/api/v1/usuarios/:id', modulo: 'MOD-005', ticket: 'SCRUM-17', roles: ['Administrador'], body: 'actualizarUsuarioSchema', descripcion: 'Edita usuario (matrícula inmutable)' },
  { method: 'PATCH', path: '/api/v1/usuarios/:id/estado', modulo: 'MOD-005', ticket: 'SCRUM-17', roles: ['Administrador'], body: 'cambiarEstadoUsuarioSchema', descripcion: 'Baja/reactivación lógica' },

  // MOD-002 Configuración
  { method: 'GET', path: '/api/v1/periodos', modulo: 'MOD-002', ticket: 'SCRUM-18', roles: 'authenticated', descripcion: 'Lista periodos' },
  { method: 'POST', path: '/api/v1/periodos', modulo: 'MOD-002', ticket: 'SCRUM-18', roles: ['Administrador'], body: 'crearPeriodoSchema', descripcion: 'Crea periodo (Programado)' },
  { method: 'PATCH', path: '/api/v1/periodos/:id', modulo: 'MOD-002', ticket: 'SCRUM-18', roles: ['Administrador'], body: 'actualizarPeriodoSchema', descripcion: 'Edita periodo' },
  { method: 'PATCH', path: '/api/v1/periodos/:id/estado', modulo: 'MOD-002', ticket: 'SCRUM-18', roles: ['Administrador'], body: 'cambiarEstadoPeriodoSchema', descripcion: 'Cambia estado (sin traslape de Activos, RN-001)' },
  { method: 'GET', path: '/api/v1/aulas', modulo: 'MOD-002', ticket: 'SCRUM-19', roles: STAFF, descripcion: 'Catálogo de aulas' },
  { method: 'POST', path: '/api/v1/aulas', modulo: 'MOD-002', ticket: 'SCRUM-19', roles: STAFF, body: 'crearAulaSchema', descripcion: 'Alta de aula' },
  { method: 'PATCH', path: '/api/v1/aulas/:id', modulo: 'MOD-002', ticket: 'SCRUM-19', roles: STAFF, body: 'actualizarAulaSchema', descripcion: 'Edita aula' },
  { method: 'GET', path: '/api/v1/actividades', modulo: 'MOD-002', ticket: 'SCRUM-24', roles: 'authenticated', descripcion: 'Catálogo de talleres (SCR-002); Alumno solo ve Activa/Llena' },
  { method: 'GET', path: '/api/v1/actividades/:id', modulo: 'MOD-002', ticket: 'SCRUM-24', roles: 'authenticated', descripcion: 'Detalle de taller (SCR-003)' },
  { method: 'POST', path: '/api/v1/actividades', modulo: 'MOD-002', ticket: 'SCRUM-24', roles: STAFF, body: 'crearActividadSchema', descripcion: 'Alta de taller (Borrador)' },
  { method: 'PATCH', path: '/api/v1/actividades/:id', modulo: 'MOD-002', ticket: 'SCRUM-24', roles: STAFF, body: 'actualizarActividadSchema', descripcion: 'Edita taller' },
  { method: 'PATCH', path: '/api/v1/actividades/:id/estado', modulo: 'MOD-002', ticket: 'SCRUM-24', roles: STAFF, body: 'cambiarEstadoActividadSchema', descripcion: "Cambia estado; 'Inactiva' = baja lógica" },
  { method: 'GET', path: '/api/v1/parametros', modulo: 'MOD-002', ticket: 'SCRUM-25', roles: ['Administrador'], descripcion: 'Lista PARAMETRO_SISTEMA' },
  { method: 'PATCH', path: '/api/v1/parametros/:clave', modulo: 'MOD-002', ticket: 'SCRUM-25', roles: ['Administrador'], body: 'actualizarParametroSchema', descripcion: 'Actualiza un parámetro global' },

  // MOD-001 Inscripciones
  { method: 'POST', path: '/api/v1/inscripciones', modulo: 'MOD-001', ticket: 'SCRUM-30', roles: ['Alumno'], body: 'crearInscripcionSchema', descripcion: 'Inscripción concurrente (FOR UPDATE)' },
  { method: 'GET', path: '/api/v1/inscripciones/me', modulo: 'MOD-001', ticket: 'SCRUM-31', roles: ['Alumno'], descripcion: 'Mis inscripciones' },
  { method: 'PATCH', path: '/api/v1/inscripciones/:id/cancelar', modulo: 'MOD-001', ticket: 'SCRUM-31', roles: ['Alumno'], propiedad: true, body: 'cancelarInscripcionSchema', descripcion: 'Baja voluntaria en dos pasos (FOR UPDATE)' },
  { method: 'GET', path: '/api/v1/actividades/:id/inscritos', modulo: 'MOD-001', ticket: 'SCRUM-28', roles: ['Administrador', 'Personal', 'Docente', 'Alumno'], propiedad: true, descripcion: 'Lista del grupo; Docente/Alumno solo si es responsable (RN-008)' },

  // MOD-003 Evaluador
  { method: 'PUT', path: '/api/v1/inscripciones/:id/avance', modulo: 'MOD-003', ticket: 'SCRUM-34', roles: ['Administrador', 'Personal', 'Docente'], propiedad: true, body: 'registrarAvanceSchema', descripcion: 'Captura asistencia/evidencia; Docente solo en sus talleres asignados. No cambia estatus_credito' },
  { method: 'POST', path: '/api/v1/inscripciones/:id/evaluar', modulo: 'MOD-003', ticket: 'SCRUM-35', roles: STAFF, body: 'evaluarInscripcionSchema', descripcion: 'Evaluación oficial: el motor calcula estatus_credito y saldo (RN-003, RN-004)' },
  { method: 'POST', path: '/api/v1/evaluador/constancias/:id_alumno', modulo: 'MOD-003', ticket: 'SCRUM-37', roles: STAFF, body: 'generarConstanciaBodySchema', descripcion: 'Genera constancia PDF con folio consecutivo y QR (RN-005)' },
  { method: 'GET', path: '/api/v1/public/constancias/verificar/:folio', modulo: 'MOD-003', ticket: 'SCRUM-38', roles: 'public', descripcion: 'Verificación pública del QR; requiere ?h=<hash>' },
  { method: 'GET', path: '/api/v1/expedientes/me', modulo: 'MOD-003', ticket: 'SCRUM-32', roles: ['Alumno'], descripcion: 'Autoconsulta de créditos (anti-IDOR)' },
  { method: 'GET', path: '/api/v1/expedientes/:matricula', modulo: 'MOD-003', ticket: 'SCRUM-27', roles: STAFF, descripcion: 'Búsqueda en ventanilla (< 7.0 s)' },

  // MOD-004 Materiales
  { method: 'GET', path: '/api/v1/actividades/:id/materiales', modulo: 'MOD-004', ticket: 'SCRUM-33', roles: 'authenticated', propiedad: true, descripcion: 'Materiales del taller (inscritos, responsable o staff)' },
  { method: 'POST', path: '/api/v1/actividades/:id/materiales', modulo: 'MOD-004', ticket: 'SCRUM-33', roles: ['Administrador', 'Personal', 'Docente'], propiedad: true, descripcion: 'Sube material (multipart, Multer)' },
  { method: 'GET', path: '/api/v1/materiales/:id/descarga', modulo: 'MOD-004', ticket: 'SCRUM-33', roles: 'authenticated', propiedad: true, descripcion: 'Descarga autenticada' },
] as const satisfies readonly RouteContract[];
