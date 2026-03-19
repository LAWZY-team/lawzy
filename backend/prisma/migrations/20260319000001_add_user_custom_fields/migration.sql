-- CreateTable
CREATE TABLE `user_custom_fields` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(80) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `default_value` TEXT NULL,
    `is_hidden` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_custom_fields_user_id_key_key`(`user_id`, `key`),
    INDEX `user_custom_fields_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_custom_fields` ADD CONSTRAINT `user_custom_fields_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

