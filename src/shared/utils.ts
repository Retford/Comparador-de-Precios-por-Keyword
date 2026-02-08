export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const parsePrice = (priceText: string | null): number => {
  if (!priceText) return 0;
  const clean = priceText.replace(/[^0-9.,]/g, '');
  let numeric = clean.replace(/\./g, '');
  if (numeric.includes(',')) {
    numeric = numeric.replace(',', '.');
  }
  return parseFloat(numeric) || 0;
};
