import {
  Keyword,
  Site,
  StartScrapingMessage,
  CancelScrapingMessage,
} from '../types';
import { statisticsService } from './services/stats';
import { Renderer } from './ui/render';
import { storageService } from '../shared/storage';
import './style.css';

class PopupController {
  private renderer: Renderer;
  private keywords: Keyword[] = [];

  constructor() {
    this.renderer = new Renderer();
  }

  public async init() {
    await this.loadAndRender();
    this.setupEventListeners();
    this.setupStorageListener();
  }

  private async loadAndRender() {
    this.keywords = await storageService.getKeywords();
    this.render();
  }

  private setupEventListeners() {
    const addBtn = document.getElementById(
      'addKeywordBtn',
    ) as HTMLButtonElement;
    const input = document.getElementById('keywordInput') as HTMLInputElement;

    addBtn?.addEventListener('click', () => this.handleAddKeyword());
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddKeyword();
    });
  }

  private setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.keywords) {
        this.keywords = (changes.keywords.newValue || []) as Keyword[];
        this.render();
      }
    });
  }

  private async handleAddKeyword() {
    const input = document.getElementById('keywordInput') as HTMLInputElement;
    const text = input?.value.trim();

    if (!text) {
      alert('Por favor ingresa una keyword válida');
      return;
    }

    if (
      this.keywords.some((k) => k.text.toLowerCase() === text.toLowerCase())
    ) {
      alert('Esta keyword ya existe');
      return;
    }

    const newKeyword: Keyword = {
      id: Date.now().toString(),
      text,
      status: { falabella: 'idle', mercadolibre: 'idle' },
      progress: { falabella: 0, mercadolibre: 0 },
      results: { falabella: [], mercadolibre: [] },
      timestamp: new Date().toISOString(),
    };

    this.keywords.push(newKeyword);
    await storageService.setKeywords(this.keywords);
    if (input) input.value = '';
  }

  private async handleDeleteKeyword(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta keyword?')) return;

    const keyword = this.keywords.find((k) => k.id === id);
    if (keyword) {
      if (keyword.status.falabella === 'running')
        this.handleCancelScraping(id, 'falabella');
      if (keyword.status.mercadolibre === 'running')
        this.handleCancelScraping(id, 'mercadolibre');
    }

    this.keywords = this.keywords.filter((k) => k.id !== id);
    await storageService.setKeywords(this.keywords);
  }

  private handleStartScraping(id: string, site: Site) {
    const keyword = this.keywords.find((k) => k.id === id);
    if (!keyword) return;

    if (keyword.status[site] === 'running') {
      alert('Ya hay un scraping en proceso para este sitio');
      return;
    }

    const message: StartScrapingMessage = {
      type: 'START_SCRAPING',
      keywordId: id,
      site,
      keywordText: keyword.text,
    };
    chrome.runtime.sendMessage(message);
  }

  private handleCancelScraping(id: string, site: Site) {
    const message: CancelScrapingMessage = {
      type: 'CANCEL_SCRAPING',
      keywordId: id,
      site,
    };
    chrome.runtime.sendMessage(message);
  }

  private handleShowStats(id: string) {
    const keyword = this.keywords.find((k) => k.id === id);
    if (!keyword) return;

    const stats = statisticsService.calculateStats(
      keyword.results.falabella || [],
      keyword.results.mercadolibre || [],
    );

    if (stats.length === 0) {
      alert(
        'No hay datos suficientes o no se encontraron productos similares.',
      );
      return;
    }

    this.renderer.showStatsModal(keyword.text, stats);
  }

  private render() {
    this.renderer.renderKeywords(this.keywords, {
      onDelete: (id) => this.handleDeleteKeyword(id),
      onStartScraping: (id, site) => this.handleStartScraping(id, site),
      onCancelScraping: (id, site) => this.handleCancelScraping(id, site),
      onShowStats: (id) => this.handleShowStats(id),
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.init();
});
