-- CreateTable
CREATE TABLE `lawfirm_ocr_cache` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `image_hash` VARCHAR(64) NOT NULL,
    `text` LONGTEXT NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `engine_version` VARCHAR(40) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_ocr_cache_workspace_id_image_hash_key`(`workspace_id`, `image_hash`),
    INDEX `lawfirm_ocr_cache_workspace_id_idx`(`workspace_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lawfirm_ocr_cache` ADD CONSTRAINT `lawfirm_ocr_cache_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
