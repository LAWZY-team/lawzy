-- AlterTable: add processing fields and scope to sources
ALTER TABLE `sources` ADD COLUMN `scope` VARCHAR(191) NOT NULL DEFAULT 'workspace';
ALTER TABLE `sources` ADD COLUMN `source_url` TEXT NULL;
ALTER TABLE `sources` ADD COLUMN `page_count` INTEGER NULL;
ALTER TABLE `sources` ADD COLUMN `chunk_count` INTEGER NULL;
ALTER TABLE `sources` ADD COLUMN `processing_error` TEXT NULL;
ALTER TABLE `sources` MODIFY COLUMN `workspace_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `sources_scope_idx` ON `sources`(`scope`);

-- CreateTable
CREATE TABLE `source_chunks` (
    `id` VARCHAR(191) NOT NULL,
    `source_id` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL,
    `page_number` INTEGER NULL,
    `chunk_index` INTEGER NOT NULL,
    `token_count` INTEGER NOT NULL DEFAULT 0,
    `embedding` JSON NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `source_chunks_source_id_idx`(`source_id`),
    INDEX `source_chunks_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `source_chunks` ADD CONSTRAINT `source_chunks_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `source_chunks` ADD CONSTRAINT `source_chunks_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `source_chunks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
