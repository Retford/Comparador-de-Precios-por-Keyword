import { Keyword } from '../types';
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
  }

  private async loadAndRender() {
    this.render();
  }

  private render() {
    this.renderer.renderKeywords(this.keywords, {
      onDelete: () => {},
      onStartScraping: () => {},
      onCancelScraping: () => {},
      onShowStats: () => {},
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.init();
});
