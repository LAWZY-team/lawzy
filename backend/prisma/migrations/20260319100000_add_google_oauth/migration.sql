-- AlterTable
ALTER TABLE `users` ADD COLUMN `provider` VARCHAR(191) NULL, ADD COLUMN `provider_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_provider_id_key` ON `users`(`provider_id`);
