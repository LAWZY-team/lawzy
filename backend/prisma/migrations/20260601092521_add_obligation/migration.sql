-- CreateTable
CREATE TABLE `obligations` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `pic_id` VARCHAR(191) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `due_date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount` DECIMAL(15, 2) NULL,
    `percentage` DOUBLE NULL,
    `trigger_condition` TEXT NULL,
    `obligation_type` VARCHAR(191) NULL,
    `effective_period` VARCHAR(255) NULL,
    `responsible_vendor` VARCHAR(255) NULL,
    `notified_stages` JSON NOT NULL,

    INDEX `obligations_document_id_idx`(`document_id`),
    INDEX `obligations_workspace_id_idx`(`workspace_id`),
    INDEX `obligations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `obligations` ADD CONSTRAINT `obligations_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `obligations` ADD CONSTRAINT `obligations_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
