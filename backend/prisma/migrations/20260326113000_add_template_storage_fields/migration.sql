ALTER TABLE `templates`
  ADD COLUMN `file_name` VARCHAR(255) NULL,
  ADD COLUMN `file_size` INT NULL,
  ADD COLUMN `mime_type` VARCHAR(255) NULL,
  ADD COLUMN `workspace_id` VARCHAR(191) NULL;

CREATE INDEX `templates_workspace_id_idx` ON `templates`(`workspace_id`);
CREATE INDEX `templates_scope_workspace_id_idx` ON `templates`(`scope`, `workspace_id`);

ALTER TABLE `templates`
  ADD CONSTRAINT `templates_workspace_id_fkey`
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
