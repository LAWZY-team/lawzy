-- CreateTable
CREATE TABLE `articles` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NULL,
    `content` JSON NULL,
    `contentText` LONGTEXT NULL,
    `cover_image` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `published_at` DATETIME(3) NULL,
    `author_id` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `articles_slug_key`(`slug`),
    INDEX `articles_type_idx`(`type`),
    INDEX `articles_status_idx`(`status`),
    INDEX `articles_published_at_idx`(`published_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `articles` ADD CONSTRAINT `articles_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
