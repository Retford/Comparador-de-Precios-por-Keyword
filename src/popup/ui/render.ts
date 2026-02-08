import { Keyword, Site, ScraperStatus } from '../../types';
import { escapeHtml } from '../../shared/utils';

export class Renderer {
  private container: HTMLElement | null;
  private emptyState: HTMLElement | null;

  constructor() {
    this.container = document.getElementById('keywordsList');
    this.emptyState = document.getElementById('emptyState');
  }

  public renderKeywords(
    keywords: Keyword[],
    handlers: {
      onDelete: (id: string) => void;
      onStartScraping: (id: string, site: Site) => void;
      onCancelScraping: (id: string, site: Site) => void;
      onShowStats: (id: string) => void;
    },
  ) {
    if (!this.container || !this.emptyState) return;

    if (keywords.length === 0) {
      this.container.innerHTML = '';
      this.emptyState.style.display = 'block';
      return;
    }

    this.emptyState.style.display = 'none';
    this.container.innerHTML = keywords
      .map((keyword) => this.createKeywordHTML(keyword))
      .join('');

    keywords.forEach((keyword) => {
      this.attachHandlers(keyword, handlers);
    });
  }

  private attachHandlers(keyword: Keyword, handlers: any) {
    const deleteBtn = document.querySelector(
      `[data-delete-id="${keyword.id}"]`,
    );
    deleteBtn?.addEventListener('click', () => handlers.onDelete(keyword.id));

    const falabellaBtn = document.querySelector(
      `[data-scrape-id="${keyword.id}"][data-site="falabella"]`,
    );
    falabellaBtn?.addEventListener('click', () =>
      handlers.onStartScraping(keyword.id, 'falabella'),
    );

    (['falabella', 'mercadolibre'] as Site[]).forEach((site) => {
      const cancelBtn = document.querySelector(
        `[data-cancel-id="${keyword.id}"][data-site="${site}"]`,
      );
      cancelBtn?.addEventListener('click', () =>
        handlers.onCancelScraping(keyword.id, site),
      );
    });
  }

  private createKeywordHTML(keyword: Keyword): string {
    const statusFalabella = keyword.status.falabella;
    const statusMercadoLibre = keyword.status.mercadolibre;

    return `
      <div class="keyword-item">
        <div class="keyword-header">
          <div class="keyword-title">${escapeHtml(keyword.text)}</div>
          <button class="delete-btn" data-delete-id="${keyword.id}">🗑️ Eliminar</button>
        </div>
        
        <div class="keyword-actions">
          <button 
            class="action-btn btn-falabella" 
            data-scrape-id="${keyword.id}" 
            data-site="falabella"
            ${statusFalabella === 'running' ? 'disabled' : ''}
          >
            Falabella
          </button>
          <button 
            class="action-btn btn-mercadolibre" 
            data-scrape-id="${keyword.id}" 
            data-site="mercadolibre"
            ${statusMercadoLibre === 'running' ? 'disabled' : ''}
          >
            MercadoLibre
          </button>
          <button class="action-btn btn-stats" data-stats-id="${keyword.id}">
            Estadísticas
          </button>
        </div>

        ${this.createStatusHTML(keyword, 'falabella', 'Falabella')}
        ${this.createStatusHTML(keyword, 'mercadolibre', 'MercadoLibre')}
      </div>
    `;
  }

  private createStatusHTML(
    keyword: Keyword,
    site: Site,
    siteName: string,
  ): string {
    const status = keyword.status[site];
    const progress = keyword.progress[site];

    if (status === 'idle') return '';

    const statusTexts: Record<ScraperStatus, string> = {
      running: `⏳ Scrapeando ${siteName}...`,
      done: `${siteName} completado`,
      error: `Error en ${siteName}`,
      cancelled: `${siteName} cancelado`,
      idle: '',
    };

    return `
      <div class="keyword-status status-${status}">
        <div>
          ${statusTexts[status]}
          ${status === 'done' || status === 'running' ? `<span class="product-count">(${progress} productos)</span>` : ''}
        </div>
        ${
          status === 'running'
            ? `
          <button class="cancel-btn" data-cancel-id="${keyword.id}" data-site="${site}">
            Cancelar
          </button>
        `
            : ''
        }
      </div>
    `;
  }
}
