-- Document visibility: 'private' | 'workspace'
ALTER TABLE `documents` ADD COLUMN `visibility` VARCHAR(20) NOT NULL DEFAULT 'workspace';
CREATE INDEX `documents_visibility_idx` ON `documents`(`visibility`);

-- EmailTemplate model for admin-managed email templates
CREATE TABLE `email_templates` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `subject` VARCHAR(300) NOT NULL,
    `body_html` LONGTEXT NOT NULL,
    `variables` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `email_templates_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
