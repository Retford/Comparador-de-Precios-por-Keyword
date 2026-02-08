import { Product, ContentToBackgroundMessage } from '../../types';

export interface IScraper {
  scrape(keyword: string, targetCount: number): Promise<Product[]>;
  stop(): void;
}

export abstract class BaseScraper implements IScraper {
  protected isRunning: boolean = false;
  protected port: chrome.runtime.Port;

  constructor(port: chrome.runtime.Port) {
    this.port = port;
  }

  public abstract scrape(
    keyword: string,
    targetCount: number,
  ): Promise<Product[]>;

  public stop(): void {
    this.isRunning = false;
  }

  protected reportProgress(count: number): void {
    this.port.postMessage({
      type: 'progress',
      count,
    } as ContentToBackgroundMessage);
  }
}
