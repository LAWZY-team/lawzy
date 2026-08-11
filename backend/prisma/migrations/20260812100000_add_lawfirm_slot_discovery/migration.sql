-- CreateIndex before dropping the unique index because MySQL requires an
-- index to remain available for the existing foreign-key constraint.
CREATE INDEX `lawfirm_document_slots_legacy_template_field_id_idx` ON `lawfirm_document_slots`(`legacy_template_field_id`);

-- DropIndex
DROP INDEX `lawfirm_document_slots_legacy_template_field_id_key` ON `lawfirm_document_slots`;

-- AlterTable
ALTER TABLE `lawfirm_template_fields` ADD COLUMN `discovery` JSON NULL;
