-- AlterTable
ALTER TABLE `files` MODIFY `s3_key` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `sources` MODIFY `s3_key` TEXT NULL;
