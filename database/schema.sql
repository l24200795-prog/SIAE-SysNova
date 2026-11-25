-- =============================================================================
-- SIAE · SYS NOVA (ITP) — Esquema MySQL 8.0 (InnoDB, utf8mb4)
--
-- Estado: PROPUESTA para SCRUM-11 / HU-008D (Registro de cuentas institucionales).
--         Solo incluye la tabla USUARIO. Debe revisarla el responsable de BD
--         (Regla de equipo #4 y #8) antes de fusionar a main.
--
-- Columnas alineadas con usuarioDtoSchema / crearUsuarioSchema de
-- backend/src/schemas/api.contracts.ts (Tabla 31 del diccionario de datos).
--
-- Uso (desde la raíz del repo):
--   mysql -u root -p < database/schema.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS siae
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE siae;

-- -----------------------------------------------------------------------------
-- USUARIO (Tabla 31)
--  - correo y matricula son UNIQUE: la BD es la autoridad final contra
--    duplicados, incluso si dos registros llegan al mismo tiempo (RN-002).
--    Una columna UNIQUE admite varios NULL, por eso el personal (sin matrícula)
--    no choca entre sí.
--  - contrasena_hash guarda SOLO el hash BCrypt (60 caracteres), nunca la
--    contraseña en texto plano (CA-008-1).
--  - activo = baja lógica (RN-007): nunca se borra físicamente un usuario.
--  - El CHECK replica la regla "solo el rol Alumno tiene matrícula".
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS USUARIO (
  id_usuario      INT          NOT NULL AUTO_INCREMENT,
  matricula       VARCHAR(10)  NULL,
  nombre          VARCHAR(150) NOT NULL,
  correo          VARCHAR(150) NOT NULL,
  contrasena_hash CHAR(60)     NOT NULL,
  rol             ENUM('Administrador', 'Personal', 'Docente', 'Alumno') NOT NULL,
  activo          BOOLEAN      NOT NULL DEFAULT TRUE,
  fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT PK_usuario PRIMARY KEY (id_usuario),
  CONSTRAINT UK_usuario_correo UNIQUE (correo),
  CONSTRAINT UK_usuario_matricula UNIQUE (matricula),
  CONSTRAINT CK_usuario_matricula_rol CHECK (
    (rol = 'Alumno' AND matricula IS NOT NULL) OR
    (rol <> 'Alumno' AND matricula IS NULL)
  )
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- Usuario de aplicación con privilegios mínimos (ajusta la contraseña y cópiala
-- a DB_PASSWORD en backend/.env — nunca la subas al repositorio).
-- -----------------------------------------------------------------------------
-- CREATE USER IF NOT EXISTS 'siae_app'@'%' IDENTIFIED BY 'cambia_esta_contrasena';
-- GRANT SELECT, INSERT, UPDATE ON siae.* TO 'siae_app'@'%';
