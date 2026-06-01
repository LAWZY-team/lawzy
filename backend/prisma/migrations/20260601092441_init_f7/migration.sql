/*
  Warnings:

  - You are about to alter the column `file_name` on the `templates` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `mime_type` on the `templates` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `documents` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `parent_id` VARCHAR(191) NULL,
    ADD COLUMN `project_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `templates` MODIFY `file_name` VARCHAR(191) NULL,
    MODIFY `mime_type` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `public_shares` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(200) NOT NULL,
    `access_code_hash` VARCHAR(200) NOT NULL,
    `recipient_email` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `snapshot_key` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `public_shares_token_key`(`token`),
    INDEX `public_shares_token_idx`(`token`),
    INDEX `public_shares_recipient_email_idx`(`recipient_email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `public_share_otps` (
    `id` VARCHAR(191) NOT NULL,
    `share_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `otp_hash` VARCHAR(200) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `public_share_otps_share_id_email_idx`(`share_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `public_share_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `share_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `session_token_hash` VARCHAR(200) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `public_share_sessions_share_id_email_idx`(`share_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `projects_workspace_id_code_key`(`workspace_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_links` (
    `id` VARCHAR(191) NOT NULL,
    `source_document_id` VARCHAR(191) NOT NULL,
    `target_document_id` VARCHAR(191) NOT NULL,
    `linkType` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `document_links_source_document_id_target_document_id_linkTyp_key`(`source_document_id`, `target_document_id`, `linkType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clause_mappings` (
    `id` VARCHAR(191) NOT NULL,
    `source_doc_id` VARCHAR(191) NOT NULL,
    `target_doc_id` VARCHAR(191) NOT NULL,
    `source_clause_id` VARCHAR(191) NOT NULL,
    `target_clause_id` VARCHAR(191) NOT NULL,
    `source_clause_key` VARCHAR(191) NOT NULL,
    `target_clause_key` VARCHAR(191) NOT NULL,
    `mappingType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `effective_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `clause_mappings_source_doc_id_idx`(`source_doc_id`),
    INDEX `clause_mappings_target_doc_id_idx`(`target_doc_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mismatch_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `field_key` VARCHAR(191) NOT NULL,
    `source_value` TEXT NOT NULL,
    `mismatch_value` TEXT NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'unresolved',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mismatch_alerts_document_id_idx`(`document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `documents_project_id_idx` ON `documents`(`project_id`);

-- CreateIndex
CREATE INDEX `documents_parent_id_idx` ON `documents`(`parent_id`);

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `public_share_otps` ADD CONSTRAINT `public_share_otps_share_id_fkey` FOREIGN KEY (`share_id`) REFERENCES `public_shares`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `public_share_sessions` ADD CONSTRAINT `public_share_sessions_share_id_fkey` FOREIGN KEY (`share_id`) REFERENCES `public_shares`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_links` ADD CONSTRAINT `document_links_source_document_id_fkey` FOREIGN KEY (`source_document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_links` ADD CONSTRAINT `document_links_target_document_id_fkey` FOREIGN KEY (`target_document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clause_mappings` ADD CONSTRAINT `clause_mappings_source_doc_id_fkey` FOREIGN KEY (`source_doc_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clause_mappings` ADD CONSTRAINT `clause_mappings_target_doc_id_fkey` FOREIGN KEY (`target_doc_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mismatch_alerts` ADD CONSTRAINT `mismatch_alerts_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
