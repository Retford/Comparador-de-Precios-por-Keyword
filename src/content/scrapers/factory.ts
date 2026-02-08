import { IScraper } from './base';
import { FalabellaScraper } from './falabella';
import { Site } from '../../types';

export class ScraperFactory {
  public static createScraper(site: Site, port: chrome.runtime.Port): IScraper {
    switch (site) {
      case 'falabella':
        return new FalabellaScraper(port);
      default:
        throw new Error(
          `El scraper no está implementado para este sitio: ${site}`,
        );
    }
  }
}
