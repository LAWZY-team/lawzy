CREATE TABLE `lawfirm_mapping_cache` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `cache_key` VARCHAR(64) NOT NULL,
    `semantic_fingerprint` VARCHAR(64) NOT NULL,
    `taxonomy_version` INTEGER NOT NULL,
    `prompt_version` VARCHAR(40) NOT NULL,
    `model_name` VARCHAR(80) NOT NULL,
    `field_definition_id` VARCHAR(191) NOT NULL,
    `entity_selector` VARCHAR(120) NULL,
    `confidence` DOUBLE NOT NULL,
    `hit_count` INTEGER NOT NULL DEFAULT 0,
    `last_used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_mapping_cache_workspace_id_cache_key_key`(`workspace_id`, `cache_key`),
    INDEX `lawfirm_mapping_cache_workspace_id_semantic_fingerprint_idx`(`workspace_id`, `semantic_fingerprint`),
    INDEX `lawfirm_mapping_cache_field_definition_id_idx`(`field_definition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `lawfirm_mapping_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `template_set_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `template_set_revision` INTEGER NOT NULL,
    `input_fingerprint` VARCHAR(64) NOT NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'queued',
    `result` JSON NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_mapping_jobs_idempotency_key_key`(`idempotency_key`),
    INDEX `lawfirm_mapping_jobs_template_set_id_status_idx`(`template_set_id`, `status`),
    INDEX `lawfirm_mapping_jobs_workspace_id_created_at_idx`(`workspace_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `lawfirm_ai_usage_events` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `template_set_id` VARCHAR(191) NULL,
    `mapping_job_id` VARCHAR(191) NULL,
    `task_type` VARCHAR(60) NOT NULL,
    `task_label` VARCHAR(191) NOT NULL,
    `operation_key` VARCHAR(191) NOT NULL,
    `model_name` VARCHAR(80) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `prompt_tokens` INTEGER NOT NULL DEFAULT 0,
    `output_tokens` INTEGER NOT NULL DEFAULT 0,
    `cached_tokens` INTEGER NOT NULL DEFAULT 0,
    `thinking_tokens` INTEGER NOT NULL DEFAULT 0,
    `tool_tokens` INTEGER NOT NULL DEFAULT 0,
    `total_tokens` INTEGER NOT NULL DEFAULT 0,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `latency_ms` INTEGER NOT NULL DEFAULT 0,
    `input_items` INTEGER NOT NULL DEFAULT 0,
    `result_items` INTEGER NOT NULL DEFAULT 0,
    `error_code` VARCHAR(80) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lawfirm_ai_usage_events_workspace_id_created_at_idx`(`workspace_id`, `created_at`),
    UNIQUE INDEX `lawfirm_ai_usage_events_workspace_id_operation_key_key`(`workspace_id`, `operation_key`),
    INDEX `lawfirm_ai_usage_events_template_set_id_created_at_idx`(`template_set_id`, `created_at`),
    INDEX `lawfirm_ai_usage_events_mapping_job_id_idx`(`mapping_job_id`),
    INDEX `lawfirm_ai_usage_events_task_type_created_at_idx`(`task_type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `lawfirm_mapping_cache` ADD CONSTRAINT `lawfirm_mapping_cache_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `lawfirm_mapping_cache` ADD CONSTRAINT `lawfirm_mapping_cache_field_definition_id_fkey` FOREIGN KEY (`field_definition_id`) REFERENCES `lawfirm_field_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `lawfirm_mapping_jobs` ADD CONSTRAINT `lawfirm_mapping_jobs_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `lawfirm_mapping_jobs` ADD CONSTRAINT `lawfirm_mapping_jobs_template_set_id_fkey` FOREIGN KEY (`template_set_id`) REFERENCES `lawfirm_template_sets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `lawfirm_mapping_jobs` ADD CONSTRAINT `lawfirm_mapping_jobs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `lawfirm_ai_usage_events` ADD CONSTRAINT `lawfirm_ai_usage_events_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `lawfirm_ai_usage_events` ADD CONSTRAINT `lawfirm_ai_usage_events_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `lawfirm_ai_usage_events` ADD CONSTRAINT `lawfirm_ai_usage_events_template_set_id_fkey` FOREIGN KEY (`template_set_id`) REFERENCES `lawfirm_template_sets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `lawfirm_ai_usage_events` ADD CONSTRAINT `lawfirm_ai_usage_events_mapping_job_id_fkey` FOREIGN KEY (`mapping_job_id`) REFERENCES `lawfirm_mapping_jobs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
