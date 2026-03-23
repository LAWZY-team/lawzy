-- AlterTable
ALTER TABLE `user_credits` ADD COLUMN `ai_credits_used_today` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `ai_credits_used_date` DATETIME(3) NULL;
