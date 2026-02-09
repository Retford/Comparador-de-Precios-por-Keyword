import { BaseScraper } from './base';
import { Product } from '../../types';
import { parsePrice, sleep, waitForContent } from '../../shared/utils';

export class FalabellaScraper extends BaseScraper {
  public async scrape(
    keyword: string,
    targetCount: number,
  ): Promise<Product[]> {
    this.isRunning = true;
    const products: Product[] = [];
    let position = 1;
    let page = 1;
    const maxPages = 5;

    await waitForContent('#testId-searchResults-products', 8000);

    while (
      products.length < targetCount &&
      page <= maxPages &&
      this.isRunning
    ) {
      const currentProducts = this.extractFromDOM(keyword, position);

      for (const product of currentProducts) {
        if (products.length >= targetCount) break;
        if (!products.some((existing) => existing.url === product.url)) {
          products.push(product);
          position++;
        }
      }

      this.reportProgress(products.length);

      if (products.length >= targetCount) break;

      const loadedMore = await this.loadMore();
      if (!loadedMore) break;

      page++;
      await sleep(2000);
    }

    return products;
  }

  private extractFromDOM(keyword: string, startPosition: number): Product[] {
    const extracted: Product[] = [];
    const selectors = '.grid-pod';

    let elements: Element[] = [];
    const found = document.querySelectorAll(selectors);
    if (found.length > 0) {
      elements = Array.from(found);
    }

    elements.forEach((el, index) => {
      try {
        const titleEl = el.querySelector('.pod-subTitle.subTitle-rebrand');
        const title = titleEl ? titleEl.textContent?.trim() || null : null;

        const priceEl = el.querySelector('.copy10');
        const priceText = priceEl ? priceEl.textContent?.trim() || null : null;

        const linkEl = el.querySelector('a') as HTMLAnchorElement;
        const url = linkEl ? linkEl.href : '';

        const brandEl = el.querySelector('.pod-title.title-rebrand');
        const brand = brandEl ? brandEl.textContent?.trim() || null : null;

        const sellerEl = el.querySelector('.pod-sellerText.seller-text-rebrand');
        const seller = sellerEl ? sellerEl.textContent.split(' ').splice(1).join(' ').trim() || null : null

        if (title && url) {
          extracted.push({
            site: 'falabella',
            keyword,
            timestamp: new Date().toISOString(),
            position: startPosition + index,
            title,
            priceVisible: priceText,
            priceNumeric: parsePrice(priceText),
            url,
            brand,
            seller: seller,
          });
        }
      } catch (e) {
        console.warn('Error extrayendo producto individual Falabella', e);
      }
    });

    return extracted;
  }

  private async loadMore(): Promise<boolean> {
    window.scrollTo({
      top: document.body.scrollHeight - 1500,
      behavior: 'smooth',
    });
    await sleep(1000);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await sleep(1000);

    const buttons = [
      '#testId-pagination-top-arrow-right',
      '#testId-pagination-bottom-arrow-right',
    ];

    for (const button of buttons) {
      const btn = document.querySelector(button) as HTMLButtonElement;
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
    }

    return false;
  }
}
