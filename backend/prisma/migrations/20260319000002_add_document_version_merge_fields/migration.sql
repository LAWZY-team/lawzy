-- AlterTable
ALTER TABLE `document_versions`
  ADD COLUMN `merge_field_values` JSON NULL,
  ADD COLUMN `chat_cursor_at` DATETIME(3) NULL;

