import { StartScrapingMessage, CancelScrapingMessage } from '../types';
import { scraperManager } from './manager';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Background Service instalado correctamente.');
});

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.type === 'START_SCRAPING') {
    const msg = request as StartScrapingMessage;
    scraperManager.launchScraper(msg.keywordId, msg.site, msg.keywordText);
  } else if (request.type === 'CANCEL_SCRAPING') {
    const msg = request as CancelScrapingMessage;
    scraperManager.cancel(msg.keywordId, msg.site);
  }
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status) {
    scraperManager.handleTabUpdate(tabId, changeInfo.status);
  }
});
