-- AlterTable
ALTER TABLE `workspaces` ADD COLUMN `company_code` VARCHAR(20) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `workspaces_company_code_key` ON `workspaces`(`company_code`);
