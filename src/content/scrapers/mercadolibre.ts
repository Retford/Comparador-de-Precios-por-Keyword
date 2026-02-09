import { BaseScraper } from './base';
import { Product } from '../../types';
import { parsePrice, sleep } from '../../shared/utils';

export class MercadoLibreScraper extends BaseScraper {
  private readonly ITEMS_PER_PAGE = 48;

  public async scrape(
    keyword: string,
    targetCount: number,
  ): Promise<Product[]> {
    this.isRunning = true;
    const products: Product[] = [];

    try {
      const baseUrl = this.getCleanBaseUrl();
      let page = 1;
      let position = 1;

      while (products.length < targetCount && this.isRunning) {
        const offset = page === 1 ? null : (page - 1) * this.ITEMS_PER_PAGE + 1;

        const url = this.buildPageUrl(baseUrl, offset);

        console.log(`[ML Scraper] Scrapeando página ${page}: ${url}`);

        const html = await this.fetchPage(url);
        if (!html) break;

        const doc = new DOMParser().parseFromString(html, 'text/html');

        const pageProducts = this.extractFromDocument(doc, keyword, position);

        if (pageProducts.length === 0) {
          console.log('[ML Scraper] No se encontraron más productos');
          break;
        }

        const remainingCount = targetCount - products.length;
        const productsToAdd = pageProducts.slice(0, remainingCount);
        products.push(...productsToAdd);
        position += productsToAdd.length;

        this.reportProgress(products.length);

        const hasNext = this.hasNextPage(doc);
        if (!hasNext) {
          console.log('[ML Scraper] No hay más páginas disponibles');
          break;
        }

        if (products.length >= targetCount) break;

        await sleep(1000);
        page++;
      }

      console.log(
        `[ML Scraper] Scraping completado. Total: ${products.length} productos`,
      );
      return products;
    } catch (error) {
      console.error('[ML Scraper] Error durante scraping:', error);
      throw error;
    }
  }

  private getCleanBaseUrl(): string {
    return window.location.href
      .split('#')[0]
      .replace(/_Desde_\d+/g, '')
      .replace(/_NoIndex_True/g, '');
  }

  private buildPageUrl(baseUrl: string, offset: number | null): string {
    if (offset === null) {
      return `${baseUrl}_NoIndex_True`;
    }
    return `${baseUrl}_Desde_${offset}_NoIndex_True`;
  }

  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[ML Scraper] Error HTTP: ${response.status}`);
        return null;
      }
      return await response.text();
    } catch (error) {
      console.error('[ML Scraper] Error en fetch:', error);
      return null;
    }
  }

  private extractFromDocument(
    doc: Document,
    keyword: string,
    startPosition: number,
  ): Product[] {
    const extracted: Product[] = [];
    const items = doc.querySelectorAll<HTMLElement>('.ui-search-layout__item');

    items.forEach((producto, index) => {
      try {
        const titleEl = producto.querySelector('.poly-component__title');
        const nombreArticulo = titleEl?.textContent.trim() ?? null;

        const brandEl = producto.querySelector(
          '.ui-search-item__brand, [class*="brand"]',
        );
        const marca = brandEl?.textContent?.trim() ?? null;

        const sellerEl = producto.querySelector('.poly-component__seller');
        const seller = sellerEl?.textContent?.trim() ?? null;

        const priceEl =
          producto.querySelector('.andes-money-amount__fraction') ||
          producto.querySelector('[aria-label*="$"]');

        const precioArticulo = priceEl?.textContent?.trim() ?? null;

        const linkEl = producto.querySelector('a') as HTMLAnchorElement;
        const url = linkEl?.href || null;

        if (nombreArticulo && url) {
          extracted.push({
            site: 'mercadolibre',
            keyword,
            timestamp: new Date().toISOString(),
            position: startPosition + index,
            title: nombreArticulo,
            priceVisible: precioArticulo,
            priceNumeric: parsePrice(precioArticulo),
            url,
            brand: marca,
            seller: seller,
          });
        }
      } catch (error) {
        console.warn(`[ML Scraper] Error extrayendo producto ${index}:`, error);
      }
    });

    return extracted;
  }

  private hasNextPage(doc: Document): boolean {
    const nextButton = doc.querySelector<HTMLElement>(
      '[data-andes-pagination-control="next"]:not([aria-disabled="true"])',
    );
    return nextButton !== null;
  }
}
