export type Site = 'falabella' | 'mercadolibre';
export type ScraperStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface Product {
  site: Site;
  keyword: string;
  timestamp: string;
  position: number;
  title: string;
  priceVisible: string | null;
  priceNumeric: number;
  url: string;
  brand: string | null;
  seller: string | null;
}

export interface Keyword {
  id: string;
  text: string;
  status: Record<Site, ScraperStatus>;
  progress: Record<Site, number>;
  results: Record<Site, Product[]>;
  timestamp: string;
}

export interface ScraperState {
  keywordId: string;
  site: Site;
  keywordText: string;
  tabId: number;
  products: Product[];
  targetCount: number;
  isComplete: boolean;
  port: chrome.runtime.Port | null;
  isConnecting: boolean;
  timeout?: ReturnType<typeof setTimeout>;
}

export type MessageType =
  | 'START_SCRAPING'
  | 'CANCEL_SCRAPING'
  | 'PROGRESS'
  | 'RESULT'
  | 'ERROR'
  | 'CANCEL';

export interface BaseMessage {
  type: string;
}

export interface StartScrapingMessage extends BaseMessage {
  type: 'START_SCRAPING';
  keywordId: string;
  site: Site;
  keywordText: string;
}

export interface CancelScrapingMessage extends BaseMessage {
  type: 'CANCEL_SCRAPING';
  keywordId: string;
  site: Site;
}

export type PopupToBackgroundMessage =
  | StartScrapingMessage
  | CancelScrapingMessage;

export interface ProgressMessage extends BaseMessage {
  type: 'progress';
  count: number;
}

export interface ResultMessage extends BaseMessage {
  type: 'result';
  products: Product[];
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
}

export interface CancelMessage extends BaseMessage {
  type: 'cancel';
}

export type ContentToBackgroundMessage =
  | ProgressMessage
  | ResultMessage
  | ErrorMessage
  | CancelMessage;

export interface StartMessage extends BaseMessage {
  type: 'start';
  keyword: string;
  site: Site;
  targetCount: number;
}

export type BackgroundToContentMessage = StartMessage | CancelMessage;
