-- CreateTable
CREATE TABLE `contact_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `attachments` JSON NULL,
    `user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contact_submissions_type_idx`(`type`),
    INDEX `contact_submissions_status_idx`(`status`),
    INDEX `contact_submissions_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
