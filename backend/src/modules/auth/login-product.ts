export const LOGIN_PRODUCTS = ['clm', 'lpms', 'lawfirm'] as const;
export type LoginProduct = (typeof LOGIN_PRODUCTS)[number];

export const normalizeLoginProduct = (
  value?: string | null,
): LoginProduct | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return LOGIN_PRODUCTS.includes(normalized as LoginProduct)
    ? (normalized as LoginProduct)
    : null;
};
