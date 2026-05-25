-- ============================================================
-- BANCO DE DADOS: TechNova — VERSÃO CORRIGIDA
-- Importante: execute este arquivo inteiro no MySQL Workbench.
-- ============================================================

DROP DATABASE IF EXISTS TechNova;
CREATE DATABASE TechNova CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE TechNova;

-- ============================================================
-- TABELA: users
-- ============================================================
CREATE TABLE users (
    user_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(200) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          ENUM('ADMIN', 'COORDINATOR', 'STUDENT') NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABELA: courses
-- ============================================================
CREATE TABLE courses (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nome       VARCHAR(150) NOT NULL,
    carga      INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABELA: coordinators
-- ============================================================
CREATE TABLE coordinators (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNIQUE,
    nome       VARCHAR(150) NOT NULL,
    email      VARCHAR(200) NOT NULL,
    curso_id   INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES courses(id)     ON DELETE SET NULL
);

-- ============================================================
-- TABELA: regras_atividades
-- ============================================================
CREATE TABLE regras_atividades (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    curso_id      INT NOT NULL,
    categoria     VARCHAR(255) NOT NULL,
    carga_horaria INT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ============================================================
-- TABELA: students
-- ============================================================
CREATE TABLE students (
    student_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT UNIQUE,
    nome             VARCHAR(150) NOT NULL,
    email            VARCHAR(200) NOT NULL,
    curso_id         INT NOT NULL,
    horas_adquiridas INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES courses(id)     ON DELETE RESTRICT
);

-- ============================================================
-- TABELA: submissions
-- ============================================================
CREATE TABLE submissions (
    submission_id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id            BIGINT NOT NULL,
    curso_id              INT NOT NULL,
    coordinator_id        INT,
    category              VARCHAR(255) NOT NULL,
    activity_title        VARCHAR(255) NOT NULL,
    certificate_file_path VARCHAR(300),
    requested_hours       DECIMAL(8,2) NOT NULL,
    approved_hours        DECIMAL(8,2),
    submission_status     ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    submission_date       DATE DEFAULT (CURRENT_DATE),
    coordinator_feedback  TEXT,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)     REFERENCES students(student_id)   ON DELETE CASCADE,
    FOREIGN KEY (curso_id)       REFERENCES courses(id) ON DELETE RESTRICT,
    FOREIGN KEY (coordinator_id) REFERENCES coordinators(id)       ON DELETE SET NULL
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_coords_email  ON coordinators(email);
CREATE INDEX idx_regras_curso  ON regras_atividades(curso_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_curso   ON submissions(curso_id);

-- ============================================================
-- DADOS INICIAIS
-- ============================================================
INSERT INTO users (email, password_hash, role) VALUES
('admin@technova.com.br', '$2b$10$xyp3JOpq7uYhS0bFwtrwIuSltNjSfqngGIqnJFoxOa9nsAMqilkgO', 'ADMIN'),
('coordenador@technova.com.br', '$2b$10$MbO0LfWJXbNaCFjpkKD28ezwO2Klb4J7.oPJFZt0xopNFRGjrHMoa', 'COORDINATOR'),
('aluno@technova.com.br', '$2b$10$3CzJwU6aqpgaJctzTmldG.s/zyRmSJQn0HNg.N1MPnxUABnVOPX/K', 'STUDENT');

INSERT INTO courses (nome, carga) VALUES
('Sistemas para Internet', 2000),
('Análise e Desenvolvimento de Sistemas', 2400);

INSERT INTO coordinators (user_id, nome, email, curso_id) VALUES
(2, 'Coordenador Teste', 'coordenador@technova.com.br', 1);

INSERT INTO students (user_id, nome, email, curso_id, horas_adquiridas) VALUES
(3, 'Aluno Teste', 'aluno@technova.com.br', 1, 0);

INSERT INTO regras_atividades (curso_id, categoria, carga_horaria) VALUES
(1, 'Monitoria', 40),
(1, 'Palestras e Eventos', 20),
(1, 'Projetos de Extensão', 100);

-- ============================================================
-- TESTE DE LOGIN
-- Usuários de teste:
-- Admin: admin@technova.com.br / admin123
-- Coordenador: coordenador@technova.com.br / coordenador123
-- Aluno: aluno@technova.com.br / aluno123
-- ============================================================

SELECT 'users'              AS tabela, COUNT(*) AS registros FROM users
UNION ALL
SELECT 'courses'            AS tabela, COUNT(*) AS registros FROM courses
UNION ALL
SELECT 'coordinators'       AS tabela, COUNT(*) AS registros FROM coordinators
UNION ALL
SELECT 'students'           AS tabela, COUNT(*) AS registros FROM students
UNION ALL
SELECT 'regras_atividades'  AS tabela, COUNT(*) AS registros FROM regras_atividades
UNION ALL
SELECT 'submissions'        AS tabela, COUNT(*) AS registros FROM submissions;
