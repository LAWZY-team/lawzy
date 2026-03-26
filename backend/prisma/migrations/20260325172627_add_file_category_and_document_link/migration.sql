-- AlterTable
ALTER TABLE `files` ADD COLUMN `category` ENUM('input_upload', 'template', 'export_output') NOT NULL DEFAULT 'input_upload',
    ADD COLUMN `document_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `workspace_custom_fields` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(80) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `default_value` TEXT NULL,
    `is_hidden` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workspace_custom_fields_workspace_id_idx`(`workspace_id`),
    UNIQUE INDEX `workspace_custom_fields_workspace_id_key_key`(`workspace_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `document_versions_created_by_idx` ON `document_versions`(`created_by`);

-- CreateIndex
CREATE INDEX `email_templates_code_idx` ON `email_templates`(`code`);

-- CreateIndex
CREATE INDEX `files_category_idx` ON `files`(`category`);

-- CreateIndex
CREATE INDEX `files_document_id_idx` ON `files`(`document_id`);

-- AddForeignKey
ALTER TABLE `workspace_custom_fields` ADD CONSTRAINT `workspace_custom_fields_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
