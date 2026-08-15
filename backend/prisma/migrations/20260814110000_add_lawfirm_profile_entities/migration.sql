CREATE TABLE `lawfirm_profile_entities` (
  `id` VARCHAR(191) NOT NULL,
  `profile_id` VARCHAR(191) NOT NULL,
  `entity_type` VARCHAR(80) NOT NULL,
  `role` VARCHAR(80) NOT NULL DEFAULT 'primary',
  `ordinal` INTEGER NOT NULL DEFAULT 0,
  `display_name` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `lawfirm_profile_entities_profile_id_entity_type_role_ordinal_key` (`profile_id`, `entity_type`, `role`, `ordinal`),
  INDEX `lawfirm_profile_entities_profile_id_role_idx` (`profile_id`, `role`),
  CONSTRAINT `lawfirm_profile_entities_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `lawfirm_client_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `lawfirm_profile_values` (
  `id` VARCHAR(191) NOT NULL,
  `profile_entity_id` VARCHAR(191) NOT NULL,
  `field_definition_id` VARCHAR(191) NOT NULL,
  `value_index` INTEGER NOT NULL DEFAULT 0,
  `typed_value` JSON NULL,
  `raw_value` TEXT NOT NULL,
  `source` VARCHAR(32) NOT NULL DEFAULT 'legacy',
  `confidence` DOUBLE NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `lawfirm_profile_values_entity_field_value_key` (`profile_entity_id`, `field_definition_id`, `value_index`),
  INDEX `lawfirm_profile_values_field_definition_id_idx` (`field_definition_id`),
  CONSTRAINT `lawfirm_profile_values_profile_entity_id_fkey` FOREIGN KEY (`profile_entity_id`) REFERENCES `lawfirm_profile_entities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lawfirm_profile_values_field_definition_id_fkey` FOREIGN KEY (`field_definition_id`) REFERENCES `lawfirm_field_definitions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `lawfirm_fill_runs`
  ADD COLUMN `profile_snapshot` JSON NULL,
  ADD COLUMN `template_snapshot` JSON NULL,
  ADD COLUMN `mapping_snapshot` JSON NULL;

INSERT INTO `lawfirm_profile_entities` (`id`, `profile_id`, `entity_type`, `role`, `ordinal`, `display_name`, `created_at`, `updated_at`)
SELECT UUID(), p.`id`, p.`investor_type`, 'primary', 0, p.`name`, NOW(3), NOW(3)
FROM `lawfirm_client_profiles` p;

INSERT INTO `lawfirm_profile_values` (`id`, `profile_entity_id`, `field_definition_id`, `value_index`, `raw_value`, `source`, `revision`, `created_at`, `updated_at`)
SELECT UUID(), e.`id`, d.`id`, 0, f.`value`, 'legacy', 1, NOW(3), NOW(3)
FROM `lawfirm_profile_entities` e
JOIN `lawfirm_client_profiles` p ON p.`id` = e.`profile_id`
JOIN `lawfirm_profile_fields` f ON f.`profile_id` = p.`id`
JOIN `lawfirm_field_definitions` d ON d.`workspace_id` IS NULL AND d.`current_profile_key` = f.`field_key` AND d.`status` = 'active';