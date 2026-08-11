-- CreateTable
CREATE TABLE `lawfirm_template_set_fields` (
    `id` VARCHAR(191) NOT NULL,
    `template_set_id` VARCHAR(191) NOT NULL,
    `normalized_slot` VARCHAR(191) NOT NULL,
    `display_slot` VARCHAR(191) NOT NULL,
    `default_field_definition_id` VARCHAR(191) NULL,
    `default_entity_selector` VARCHAR(120) NULL,
    `mapping_status` VARCHAR(20) NOT NULL DEFAULT 'unmapped',
    `mapping_source` VARCHAR(20) NOT NULL DEFAULT 'deterministic',
    `confidence` DOUBLE NULL,
    `context_fingerprint` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_template_set_fields_template_set_id_normalized_slot_key`(`template_set_id`, `normalized_slot`),
    INDEX `lawfirm_template_set_fields_default_field_definition_id_idx`(`default_field_definition_id`),
    INDEX `lawfirm_template_set_fields_template_set_id_mapping_status_idx`(`template_set_id`, `mapping_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_document_slots` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `template_set_field_id` VARCHAR(191) NOT NULL,
    `legacy_template_field_id` VARCHAR(191) NULL,
    `occurrence_key` VARCHAR(191) NOT NULL,
    `source_kind` VARCHAR(40) NOT NULL,
    `raw_text` TEXT NOT NULL,
    `label_text` TEXT NULL,
    `current_value` TEXT NULL,
    `left_context` TEXT NULL,
    `right_context` TEXT NULL,
    `anchor` JSON NULL,
    `occurrence_count` INTEGER NOT NULL DEFAULT 1,
    `binding_id` VARCHAR(191) NULL,
    `binding_override` JSON NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_document_slots_legacy_template_field_id_key`(`legacy_template_field_id`),
    UNIQUE INDEX `lawfirm_document_slots_occurrence_key_key`(`occurrence_key`),
    UNIQUE INDEX `lawfirm_document_slots_binding_id_key`(`binding_id`),
    INDEX `lawfirm_document_slots_document_id_idx`(`document_id`),
    INDEX `lawfirm_document_slots_template_set_field_id_idx`(`template_set_field_id`),
    INDEX `lawfirm_document_slots_document_id_sort_order_idx`(`document_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lawfirm_template_set_fields` ADD CONSTRAINT `lawfirm_template_set_fields_template_set_id_fkey` FOREIGN KEY (`template_set_id`) REFERENCES `lawfirm_template_sets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_set_fields` ADD CONSTRAINT `lawfirm_template_set_fields_default_field_definition_id_fkey` FOREIGN KEY (`default_field_definition_id`) REFERENCES `lawfirm_field_definitions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_document_slots` ADD CONSTRAINT `lawfirm_document_slots_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `lawfirm_template_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_document_slots` ADD CONSTRAINT `lawfirm_document_slots_template_set_field_id_fkey` FOREIGN KEY (`template_set_field_id`) REFERENCES `lawfirm_template_set_fields`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_document_slots` ADD CONSTRAINT `lawfirm_document_slots_legacy_template_field_id_fkey` FOREIGN KEY (`legacy_template_field_id`) REFERENCES `lawfirm_template_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
