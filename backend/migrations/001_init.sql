-- =============================================================================
-- Salesforce Learning Academy - Initial schema
-- Migration 001_init.sql
-- Engine: InnoDB, charset utf8mb4 (safe for names/emails with any characters)
-- Run via: npm run migrate   (backend working directory)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- users: students and administrators. Role is a restricted ENUM so a student
-- can never be given admin rights by editing application state.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name         VARCHAR(150) NOT NULL,
  email             VARCHAR(190) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  role              ENUM('student','admin') NOT NULL DEFAULT 'student',
  status            ENUM('active','disabled') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME NULL DEFAULT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(200) NOT NULL,
  slug        VARCHAR(190) NOT NULL,
  description TEXT NULL,
  published   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- course_units
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_units (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id   INT UNSIGNED NOT NULL,
  title       VARCHAR(200) NOT NULL,
  slug        VARCHAR(190) NOT NULL,
  description TEXT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  published   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_units_slug (course_id, slug),
  KEY idx_units_course_order (course_id, sort_order),
  CONSTRAINT fk_units_course FOREIGN KEY (course_id)
    REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id      INT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL,
  slug         VARCHAR(190) NOT NULL,
  summary      VARCHAR(500) NULL,
  content      MEDIUMTEXT NULL,
  content_type ENUM('article','video','code','document') NOT NULL DEFAULT 'article',
  resource_url VARCHAR(500) NULL,
  is_required  TINYINT(1) NOT NULL DEFAULT 1,
  sort_order   INT NOT NULL DEFAULT 0,
  published    TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lessons_slug (unit_id, slug),
  KEY idx_lessons_unit_order (unit_id, sort_order),
  CONSTRAINT fk_lessons_unit FOREIGN KEY (unit_id)
    REFERENCES course_units (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- enrollments: one row per student per course
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  course_id    INT UNSIGNED NOT NULL,
  enrolled_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL DEFAULT NULL,
  status       ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollment (user_id, course_id),
  KEY idx_enrollments_course_status (course_id, status),
  CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id)
    REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- lesson_progress: one row per student per lesson
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  lesson_id        INT UNSIGNED NOT NULL,
  status           ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
  started_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at     DATETIME NULL DEFAULT NULL,
  last_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lesson_progress (user_id, lesson_id),
  KEY idx_lesson_progress_user_status (user_id, status),
  KEY idx_lesson_progress_lesson (lesson_id),
  CONSTRAINT fk_lesson_progress_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (lesson_id)
    REFERENCES lessons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- quizzes: one quiz per unit. Passing percentage lives here (single source
-- of truth - never hardcoded in frontend code).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id            INT UNSIGNED NOT NULL,
  title              VARCHAR(200) NOT NULL,
  description        TEXT NULL,
  passing_percentage TINYINT UNSIGNED NOT NULL DEFAULT 70,
  max_attempts       TINYINT UNSIGNED NOT NULL DEFAULT 3,
  published          TINYINT(1) NOT NULL DEFAULT 0,
  is_required        TINYINT(1) NOT NULL DEFAULT 1,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quiz_unit (unit_id),
  CONSTRAINT fk_quizzes_unit FOREIGN KEY (unit_id)
    REFERENCES course_units (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- quiz_questions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_questions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id       INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('multiple_choice','true_false','multiple_select') NOT NULL DEFAULT 'multiple_choice',
  explanation   TEXT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_questions_quiz_order (quiz_id, sort_order),
  CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id)
    REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- quiz_options: is_correct is ONLY read by server-side scoring code and by
-- administrators. It is never returned to students before submission.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_options (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  option_text VARCHAR(500) NOT NULL,
  is_correct  TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_options_question_order (question_id, sort_order),
  CONSTRAINT fk_options_question FOREIGN KEY (question_id)
    REFERENCES quiz_questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- quiz_attempts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  quiz_id        INT UNSIGNED NOT NULL,
  attempt_number INT UNSIGNED NOT NULL,
  score          DECIMAL(5,2) NOT NULL DEFAULT 0,
  passed         TINYINT(1) NOT NULL DEFAULT 0,
  status         ENUM('in_progress','submitted') NOT NULL DEFAULT 'in_progress',
  started_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at   DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attempt_number (user_id, quiz_id, attempt_number),
  KEY idx_attempts_user_quiz (user_id, quiz_id),
  CONSTRAINT fk_attempts_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_attempts_quiz FOREIGN KEY (quiz_id)
    REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- quiz_responses: selected_answer stores option IDs, comma separated for
-- multiple-select questions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_responses (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id     INT UNSIGNED NOT NULL,
  question_id    INT UNSIGNED NOT NULL,
  selected_answer VARCHAR(500) NULL,
  is_correct     TINYINT(1) NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_response (attempt_id, question_id),
  KEY idx_responses_question (question_id),
  CONSTRAINT fk_responses_attempt FOREIGN KEY (attempt_id)
    REFERENCES quiz_attempts (id) ON DELETE CASCADE,
  CONSTRAINT fk_responses_question FOREIGN KEY (question_id)
    REFERENCES quiz_questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- certificates: UNIQUE(user_id, course_id) makes duplicate issuance
-- impossible even under concurrent requests.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED NOT NULL,
  course_id          INT UNSIGNED NOT NULL,
  certificate_number VARCHAR(32) NOT NULL,
  verification_id    CHAR(32) NOT NULL,
  issued_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pdf_storage_key    VARCHAR(255) NULL,
  pdf_status         ENUM('pending','generated','failed') NOT NULL DEFAULT 'pending',
  email_status       ENUM('pending','accepted','failed','retrying') NOT NULL DEFAULT 'pending',
  email_sent_at      DATETIME NULL DEFAULT NULL,
  email_attempts     INT UNSIGNED NOT NULL DEFAULT 0,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_certificate_user_course (user_id, course_id),
  UNIQUE KEY uq_certificate_number (certificate_number),
  UNIQUE KEY uq_certificate_verification (verification_id),
  KEY idx_certificates_email_status (email_status),
  CONSTRAINT fk_certificates_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_certificates_course FOREIGN KEY (course_id)
    REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- email_logs: delivery history. Message bodies and credentials are NOT stored.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_logs (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NULL DEFAULT NULL,
  certificate_id  INT UNSIGNED NULL DEFAULT NULL,
  email_type      VARCHAR(60) NOT NULL,
  recipient_email VARCHAR(190) NOT NULL,
  status          ENUM('pending','accepted','failed','retrying') NOT NULL DEFAULT 'pending',
  attempt_count   INT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at DATETIME NULL DEFAULT NULL,
  error_message   VARCHAR(500) NULL DEFAULT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_logs_user (user_id),
  KEY idx_email_logs_certificate (certificate_id),
  KEY idx_email_logs_status (status),
  CONSTRAINT fk_email_logs_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_email_logs_certificate FOREIGN KEY (certificate_id)
    REFERENCES certificates (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- auth_sessions: table used by the MySQL session store (express-session).
-- Schema follows the default express-session store contract.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
  sid    VARCHAR(128) NOT NULL,
  expires DATETIME NOT NULL,
  data   MEDIUMTEXT NULL,
  PRIMARY KEY (sid),
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- email_verification_tokens / password_reset_tokens
-- Only a SHA-256 hash of the token is stored, never the raw token.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_evt_hash (token_hash),
  KEY idx_evt_user (user_id),
  CONSTRAINT fk_evt_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prt_hash (token_hash),
  KEY idx_prt_user (user_id),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- academy_settings: key/value configuration for the whole academy
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academy_settings (
  setting_key   VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- admin_audit_logs: administrative actions. Never stores passwords or secrets.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id INT UNSIGNED NULL DEFAULT NULL,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(60) NULL DEFAULT NULL,
  entity_id     VARCHAR(60) NULL DEFAULT NULL,
  details       TEXT NULL,
  ip_address    VARCHAR(45) NULL DEFAULT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_admin (admin_user_id),
  KEY idx_audit_action (action),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
