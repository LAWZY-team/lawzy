-- CreateTable
CREATE TABLE `lawfirm_client_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `investor_type` VARCHAR(191) NOT NULL DEFAULT 'organization',
    `revision` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lawfirm_client_profiles_workspace_id_idx`(`workspace_id`),
    INDEX `lawfirm_client_profiles_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_profile_fields` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `field_key` VARCHAR(80) NOT NULL,
    `group` VARCHAR(40) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `aliases` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `lawfirm_profile_fields_profile_id_idx`(`profile_id`),
    UNIQUE INDEX `lawfirm_profile_fields_profile_id_field_key_key`(`profile_id`, `field_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_template_sets` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'private',
    `revision` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lawfirm_template_sets_workspace_id_idx`(`workspace_id`),
    INDEX `lawfirm_template_sets_visibility_idx`(`visibility`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_template_documents` (
    `id` VARCHAR(191) NOT NULL,
    `template_set_id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `file_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `storage_key` VARCHAR(191) NOT NULL,
    `plain_text` LONGTEXT NULL,
    `preview_mode` VARCHAR(191) NOT NULL DEFAULT 'highlight',
    `preview_html` LONGTEXT NULL,
    `file_id` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lawfirm_template_documents_template_set_id_idx`(`template_set_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_template_fields` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `placeholder` VARCHAR(191) NOT NULL,
    `mapped_key` VARCHAR(80) NOT NULL DEFAULT '',
    `source` VARCHAR(191) NOT NULL DEFAULT 'auto',
    `count` INTEGER NOT NULL DEFAULT 1,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `lawfirm_template_fields_document_id_idx`(`document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_ai_extractions` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NULL,
    `document_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `suggestions` JSON NOT NULL,
    `provenance` JSON NULL,
    `storage_key` VARCHAR(191) NULL,
    `model_name` VARCHAR(191) NULL,
    `idempotency_key` VARCHAR(120) NULL,
    `error_message` TEXT NULL,
    `expires_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_ai_extractions_idempotency_key_key`(`idempotency_key`),
    INDEX `lawfirm_ai_extractions_workspace_id_idx`(`workspace_id`),
    INDEX `lawfirm_ai_extractions_profile_id_idx`(`profile_id`),
    INDEX `lawfirm_ai_extractions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_fill_runs` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `template_set_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'processing',
    `match_summary` JSON NULL,
    `zip_storage_key` VARCHAR(191) NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lawfirm_fill_runs_workspace_id_idx`(`workspace_id`),
    INDEX `lawfirm_fill_runs_profile_id_idx`(`profile_id`),
    INDEX `lawfirm_fill_runs_template_set_id_idx`(`template_set_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_fill_outputs` (
    `id` VARCHAR(191) NOT NULL,
    `fill_run_id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `storage_key` VARCHAR(191) NOT NULL,
    `file_type` VARCHAR(191) NOT NULL,
    `fill_count` INTEGER NOT NULL DEFAULT 0,
    `state` VARCHAR(191) NOT NULL DEFAULT 'success',

    INDEX `lawfirm_fill_outputs_fill_run_id_idx`(`fill_run_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_audit_events` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lawfirm_audit_events_workspace_id_idx`(`workspace_id`),
    INDEX `lawfirm_audit_events_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lawfirm_client_profiles` ADD CONSTRAINT `lawfirm_client_profiles_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_client_profiles` ADD CONSTRAINT `lawfirm_client_profiles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_profile_fields` ADD CONSTRAINT `lawfirm_profile_fields_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `lawfirm_client_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_sets` ADD CONSTRAINT `lawfirm_template_sets_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_sets` ADD CONSTRAINT `lawfirm_template_sets_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_documents` ADD CONSTRAINT `lawfirm_template_documents_template_set_id_fkey` FOREIGN KEY (`template_set_id`) REFERENCES `lawfirm_template_sets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_documents` ADD CONSTRAINT `lawfirm_template_documents_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_template_fields` ADD CONSTRAINT `lawfirm_template_fields_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `lawfirm_template_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_ai_extractions` ADD CONSTRAINT `lawfirm_ai_extractions_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_ai_extractions` ADD CONSTRAINT `lawfirm_ai_extractions_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `lawfirm_client_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_ai_extractions` ADD CONSTRAINT `lawfirm_ai_extractions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_fill_runs` ADD CONSTRAINT `lawfirm_fill_runs_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_fill_runs` ADD CONSTRAINT `lawfirm_fill_runs_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `lawfirm_client_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_fill_runs` ADD CONSTRAINT `lawfirm_fill_runs_template_set_id_fkey` FOREIGN KEY (`template_set_id`) REFERENCES `lawfirm_template_sets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_fill_runs` ADD CONSTRAINT `lawfirm_fill_runs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_fill_outputs` ADD CONSTRAINT `lawfirm_fill_outputs_fill_run_id_fkey` FOREIGN KEY (`fill_run_id`) REFERENCES `lawfirm_fill_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_audit_events` ADD CONSTRAINT `lawfirm_audit_events_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_audit_events` ADD CONSTRAINT `lawfirm_audit_events_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
