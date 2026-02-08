import {
  Keyword,
  Site,
  StartScrapingMessage,
  CancelScrapingMessage,
} from '../types';
import { Renderer } from './ui/render';
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
  }

  private async loadAndRender() {
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
    if (input) input.value = '';
  }

  private async handleDeleteKeyword(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta keyword?')) return;

    const keyword = this.keywords.find((k) => k.id === id);
    if (keyword) {
      if (keyword.status.falabella === 'running')
        this.handleCancelScraping(id, 'falabella');
    }

    this.keywords = this.keywords.filter((k) => k.id !== id);
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
