-- BoardCollab Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `boardcollab` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `boardcollab`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_color` VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Refresh Tokens Table (with rotation & revocation support)
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tokens_user_revoked` (`user_id`, `revoked_at`),
  CONSTRAINT `fk_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` CHAR(36) NOT NULL,
  `room_code` VARCHAR(12) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `owner_id` CHAR(36) NOT NULL,
  `visibility` ENUM('public', 'private') NOT NULL DEFAULT 'public',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_rooms_code` (`room_code`),
  KEY `idx_rooms_owner` (`owner_id`),
  KEY `idx_rooms_visibility` (`visibility`),
  CONSTRAINT `fk_rooms_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Room Members Table
CREATE TABLE IF NOT EXISTS `room_members` (
  `room_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `role` ENUM('owner', 'editor', 'viewer') NOT NULL DEFAULT 'editor',
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`room_id`, `user_id`),
  KEY `idx_members_user` (`user_id`),
  CONSTRAINT `fk_members_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Elements Table (CRDT state per element)
CREATE TABLE IF NOT EXISTS `elements` (
  `id` CHAR(36) NOT NULL,
  `room_id` CHAR(36) NOT NULL,
  `type` ENUM('stroke', 'rect', 'circle', 'text') NOT NULL,
  `props` JSON NOT NULL,
  `prop_clocks` JSON NOT NULL,
  `author_id` CHAR(36) NOT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_elements_room` (`room_id`),
  KEY `idx_elements_room_deleted` (`room_id`, `is_deleted`),
  KEY `idx_elements_author` (`author_id`),
  CONSTRAINT `fk_elements_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_elements_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
