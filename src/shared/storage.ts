import { Keyword, Product, Site, ScraperStatus } from '../types';

class StorageService {
  private static instance: StorageService;
  private storageChain: Promise<any> = Promise.resolve();

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private async serializedUpdate<T>(fn: () => Promise<T>): Promise<T> {
    const prevChain = this.storageChain;
    this.storageChain = (async () => {
      await prevChain;
      return fn();
    })();
    return this.storageChain;
  }

  public async getKeywords(): Promise<Keyword[]> {
    const result = await chrome.storage.local.get(['keywords']);
    return (result.keywords || []) as Keyword[];
  }

  public async setKeywords(keywords: Keyword[]): Promise<void> {
    await this.serializedUpdate(async () => {
      await chrome.storage.local.set({ keywords });
    });
  }

  public async updateKeywordStatus(
    keywordId: string,
    site: Site,
    status: ScraperStatus,
    progress: number,
    results: Product[] | null = null,
  ): Promise<void> {
    await this.serializedUpdate(async () => {
      const keywords = await this.getKeywords();
      const index = keywords.findIndex((k) => k.id === keywordId);

      if (index !== -1) {
        keywords[index].status[site] = status;
        if (progress !== undefined) keywords[index].progress[site] = progress;
        if (results) keywords[index].results[site] = results;

        await chrome.storage.local.set({ keywords });
      }
    });
  }

  public async updateKeywordProgress(
    keywordId: string,
    site: Site,
    count: number,
  ): Promise<void> {
    await this.serializedUpdate(async () => {
      const keywords = await this.getKeywords();
      const index = keywords.findIndex((k) => k.id === keywordId);

      if (index !== -1) {
        keywords[index].progress[site] = count;
        await chrome.storage.local.set({ keywords });
      }
    });
  }
}

export const storageService = StorageService.getInstance();
