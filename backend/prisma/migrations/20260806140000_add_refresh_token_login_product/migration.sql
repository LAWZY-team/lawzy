ALTER TABLE `refresh_tokens` ADD COLUMN `login_product` VARCHAR(20) NULL;
CREATE INDEX `refresh_tokens_login_product_idx` ON `refresh_tokens`(`login_product`);
