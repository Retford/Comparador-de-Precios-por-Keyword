import { StartMessage, ContentToBackgroundMessage } from '../types';
import { ScraperFactory } from './scrapers/factory';
import { IScraper } from './scrapers/base';

let currentScraper: IScraper | null = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'scraper') {
    port.onMessage.addListener(async (msg: any) => {
      if (msg.type === 'start') {
        await startScraping(msg as StartMessage, port);
      } else if (msg.type === 'cancel') {
        stopCurrentScraper();
      }
    });

    port.onDisconnect.addListener(() => {
      stopCurrentScraper();
    });
  }
});

async function startScraping(config: StartMessage, port: chrome.runtime.Port) {
  if (currentScraper) {
    console.warn('[Content] Ya hay un scraping activo, deteniendo el anterior');
    stopCurrentScraper();
  }

  console.log(
    `[Content] Scraping iniciado para ${config.site} - ${config.keyword}`,
  );

  try {
    currentScraper = ScraperFactory.createScraper(config.site, port);
    const products = await currentScraper.scrape(
      config.keyword,
      config.targetCount,
    );

    if (products.length > 0) {
      console.log(`[Scraper] Finalizado. Total productos: ${products.length}`);
      port.postMessage({
        type: 'result',
        products: products,
      } as ContentToBackgroundMessage);
    }
  } catch (error: any) {
    console.error('[Scraper] Error fatal:', error);
    port.postMessage({
      type: 'error',
      message: error.message || 'Error desconocido durante el scraping',
    } as ContentToBackgroundMessage);
  } finally {
    currentScraper = null;
  }
}

function stopCurrentScraper() {
  if (currentScraper) {
    console.log('[Content] Deteniendo scraper activo...');
    currentScraper.stop();
    currentScraper = null;
  }
}
