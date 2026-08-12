-- CreateTable
CREATE TABLE `lawfirm_template_upload_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `template_set_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'receiving',
    `total_documents` INTEGER NOT NULL DEFAULT 0,
    `processed_documents` INTEGER NOT NULL DEFAULT 0,
    `failed_documents` INTEGER NOT NULL DEFAULT 0,
    `finalized_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_template_upload_sessions_idempotency_key_key`(`idempotency_key`),
    INDEX `lawfirm_template_upload_sessions_template_set_id_status_idx`(`template_set_id`, `status`),
    INDEX `lawfirm_template_upload_sessions_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `lawfirm_template_documents` ADD COLUMN `upload_session_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `lawfirm_template_documents_upload_session_id_idx` ON `lawfirm_template_documents`(`upload_session_id`);

-- CreateTable
CREATE TABLE `lawfirm_template_scan_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `upload_session_id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NULL,
    `kind` VARCHAR(32) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'queued',
    `idempotency_key` VARCHAR(191) NOT NULL,
    `content_fingerprint` VARCHAR(64) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 3,
    `available_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lease_owner` VARCHAR(120) NULL,
    `lease_expires_at` DATETIME(3) NULL,
    `result` JSON NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_template_scan_jobs_idempotency_key_key`(`idempotency_key`),
    INDEX `lawfirm_template_scan_jobs_status_available_at_idx`(`status`, `available_at`),
    INDEX `lawfirm_template_scan_jobs_upload_session_id_kind_status_idx`(`upload_session_id`, `kind`, `status`),
    INDEX `lawfirm_template_scan_jobs_document_id_idx`(`document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lawfirm_template_upload_sessions` ADD CONSTRAINT `lawfirm_template_upload_sessions_template_set_id_fkey` FOREIGN KEY (`template_set_id`) REFERENCES `lawfirm_template_sets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_upload_sessions` ADD CONSTRAINT `lawfirm_template_upload_sessions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_documents` ADD CONSTRAINT `lawfirm_template_documents_upload_session_id_fkey` FOREIGN KEY (`upload_session_id`) REFERENCES `lawfirm_template_upload_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_scan_jobs` ADD CONSTRAINT `lawfirm_template_scan_jobs_upload_session_id_fkey` FOREIGN KEY (`upload_session_id`) REFERENCES `lawfirm_template_upload_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_scan_jobs` ADD CONSTRAINT `lawfirm_template_scan_jobs_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `lawfirm_template_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
