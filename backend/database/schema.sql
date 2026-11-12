-- Artikly database schema (MariaDB 10.4+ / MySQL 8+)
--
-- Apply with:  npm run db:migrate   (from backend/)
-- or open this file in DBeaver and execute it against artikly_db.
-- Every statement uses IF NOT EXISTS, so running it again is safe and never
-- drops or changes existing data.

-- Users ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(255)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blogs (articles) ------------------------------------------------------------
-- status = 'draft'     -> only visible to its author
-- status = 'published' -> public; published_at is set the first time
CREATE TABLE IF NOT EXISTS blogs (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id    BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(150)    NOT NULL,
  excerpt      VARCHAR(255)    NOT NULL DEFAULT '',
  content      MEDIUMTEXT      NOT NULL,
  category     VARCHAR(50)     NULL,
  cover_image  VARCHAR(2048)   NOT NULL DEFAULT '',
  status       ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  is_featured  TINYINT(1)      NOT NULL DEFAULT 0,
  published_at TIMESTAMP       NULL DEFAULT NULL,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_blogs_status_published (status, published_at),
  KEY idx_blogs_author_updated (author_id, updated_at),
  CONSTRAINT fk_blogs_author FOREIGN KEY (author_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
