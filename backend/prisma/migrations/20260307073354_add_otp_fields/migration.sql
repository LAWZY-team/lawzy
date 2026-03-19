-- AlterTable
ALTER TABLE `users` ADD COLUMN `otp_code` VARCHAR(191) NULL,
    ADD COLUMN `otp_expires` DATETIME(3) NULL;
