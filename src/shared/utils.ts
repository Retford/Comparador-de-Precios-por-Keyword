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

export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const waitForContent = (
  selector: string,
  timeout: number = 5000,
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) return resolve(true);

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(true);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(!!document.querySelector(selector));
    }, timeout);
  });
};
