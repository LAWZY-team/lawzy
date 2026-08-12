ALTER TABLE `lawfirm_template_set_fields`
  ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `lawfirm_template_set_fields_template_set_id_sort_order_idx`
  ON `lawfirm_template_set_fields`(`template_set_id`, `sort_order`);
