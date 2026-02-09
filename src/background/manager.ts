import { 
  ScraperState, 
  Site, 
  ScraperStatus, 
  Product, 
  ContentToBackgroundMessage, 
  BackgroundToContentMessage 
} from '../types';
import { storageService } from '../shared/storage';

export class ScraperManager {
  private activeScrapers = new Map<string, ScraperState>();

  public async launchScraper(keywordId: string, site: Site, keywordText: string) {
    const key = this.getKey(keywordId, site);
    
    if (this.activeScrapers.has(key)) return;

    try {
      await storageService.updateKeywordStatus(keywordId, site, 'running', 0);

      const searchUrl = site === 'falabella' 
        ? `https://www.falabella.com.pe/falabella-pe/search?Ntt=${encodeURIComponent(keywordText)}`
        : `https://listado.mercadolibre.com.pe/${encodeURIComponent(keywordText)}`;

      const tab = await chrome.tabs.create({ url: searchUrl, active: false });
      if (!tab.id) throw new Error('Failed to create tab');

      const state: ScraperState = {
        keywordId, site, keywordText,
        tabId: tab.id,
        products: [],
        targetCount: site === 'falabella' ? 60 : 100,
        isComplete: false,
        port: null,
        isConnecting: false
      };
      
      this.activeScrapers.set(key, state);
    } catch (error: any) {
      console.error('Error launching scraper:', error);
      await storageService.updateKeywordStatus(keywordId, site, 'error', 0, null);
    }
  }

  public handleTabUpdate(tabId: number, status: string) {
    if (status !== 'complete') return;

    for (const [key, scraper] of this.activeScrapers.entries()) {
      if (scraper.tabId === tabId && !scraper.isComplete) {
        if (scraper.port && scraper.port.name === 'scraper') continue;
        if (scraper.isConnecting) continue;
        
        this.connectToContentScript(scraper, key);
        break;
      }
    }
  }

  private connectToContentScript(scraper: ScraperState, key: string) {
    scraper.isConnecting = true;
    try {
      const port = chrome.tabs.connect(scraper.tabId, { name: 'scraper' });
      scraper.port = port;

      port.onMessage.addListener((msg: ContentToBackgroundMessage) => {
        this.handleMessage(scraper, msg, key);
      });

      port.onDisconnect.addListener(() => {
        scraper.port = null;
        scraper.isConnecting = false;
      });

      port.postMessage({
        type: 'start',
        keyword: scraper.keywordText,
        site: scraper.site,
        targetCount: scraper.targetCount
      } as BackgroundToContentMessage);
      
      scraper.isConnecting = false;
    } catch (e) {
      console.error(`Error connecting to tab ${scraper.tabId}:`, e);
      scraper.port = null;
      scraper.isConnecting = false;
    }
  }

  private async handleMessage(scraper: ScraperState, msg: ContentToBackgroundMessage, key: string) {
    switch (msg.type) {
      case 'progress':
        await storageService.updateKeywordProgress(scraper.keywordId, scraper.site, scraper.products.length + msg.count);
        break;
      case 'result':
        this.accumulateResults(scraper, msg.products);
        await storageService.updateKeywordProgress(scraper.keywordId, scraper.site, scraper.products.length);
        if (scraper.products.length >= scraper.targetCount) {
          this.finish(scraper, key, 'done');
        } else {
          this.setSafetyTimeout(scraper, key);
        }
        break;
      case 'error':
        this.finish(scraper, key, scraper.products.length > 0 ? 'done' : 'error');
        break;
      case 'cancel':
        this.finish(scraper, key, 'cancelled');
        break;
    }
  }

  private accumulateResults(scraper: ScraperState, newProducts: Product[]) {
    newProducts.forEach(p => {
      if (!scraper.products.some(existing => existing.url === p.url)) {
        scraper.products.push(p);
      }
    });
  }

  private setSafetyTimeout(scraper: ScraperState, key: string) {
    if (scraper.timeout) clearTimeout(scraper.timeout);
    scraper.timeout = setTimeout(() => this.finish(scraper, key, 'done'), 10000);
  }

  public async cancel(keywordId: string, site: Site) {
    const key = this.getKey(keywordId, site);
    const scraper = this.activeScrapers.get(key);
    if (scraper) {
      scraper.port?.postMessage({ type: 'cancel' });
      this.finish(scraper, key, 'cancelled');
    }
  }

  private async finish(scraper: ScraperState, key: string, status: ScraperStatus) {
    scraper.isComplete = true;
    if (scraper.timeout) clearTimeout(scraper.timeout);
    this.activeScrapers.delete(key);
    scraper.port?.disconnect();
    chrome.tabs.remove(scraper.tabId).catch(() => {});
    
    await storageService.updateKeywordStatus(
      scraper.keywordId, scraper.site, 
      status, scraper.products.length, 
      scraper.products.length > 0 ? scraper.products : null
    );
  }

  private getKey(id: string, site: Site) { return `${id}-${site}`; }
}

export const scraperManager = new ScraperManager();
