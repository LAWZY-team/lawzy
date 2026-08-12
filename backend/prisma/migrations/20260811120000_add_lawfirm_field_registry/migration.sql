-- CreateTable
CREATE TABLE `lawfirm_field_definitions` (
    `id` VARCHAR(191) NOT NULL,
    `registry_key` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(191) NULL,
    `canonical_key` VARCHAR(120) NOT NULL,
    `current_profile_key` VARCHAR(80) NULL,
    `group` VARCHAR(40) NOT NULL,
    `data_type` VARCHAR(40) NOT NULL DEFAULT 'string',
    `label_vi` VARCHAR(191) NOT NULL,
    `label_en` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(20) NOT NULL DEFAULT 'system',
    `taxonomy_version` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_by` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawfirm_field_definitions_registry_key_key`(`registry_key`),
    UNIQUE INDEX `lawfirm_field_definitions_workspace_id_canonical_key_key`(`workspace_id`, `canonical_key`),
    INDEX `lawfirm_field_definitions_workspace_id_idx`(`workspace_id`),
    INDEX `lawfirm_field_definitions_canonical_key_idx`(`canonical_key`),
    INDEX `lawfirm_field_definitions_scope_status_idx`(`scope`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawfirm_field_aliases` (
    `id` VARCHAR(191) NOT NULL,
    `field_definition_id` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `normalized_alias` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(10) NULL,
    `source` VARCHAR(20) NOT NULL DEFAULT 'seed',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lawfirm_field_aliases_field_definition_id_normalized_alias_key`(`field_definition_id`, `normalized_alias`),
    INDEX `lawfirm_field_aliases_normalized_alias_idx`(`normalized_alias`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lawfirm_field_definitions` ADD CONSTRAINT `lawfirm_field_definitions_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_field_definitions` ADD CONSTRAINT `lawfirm_field_definitions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawfirm_field_aliases` ADD CONSTRAINT `lawfirm_field_aliases_field_definition_id_fkey` FOREIGN KEY (`field_definition_id`) REFERENCES `lawfirm_field_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
