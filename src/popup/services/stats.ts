import { Product } from '../../types';

export interface GroupedProducts {
  name: string;
  products: Product[];
}

export interface SimilarityStats {
  name: string;
  countFalabella: number;
  countMercadoLibre: number;
  avgFalabella: number;
  avgMercadoLibre: number;
  minFalabella: number;
  minMercadoLibre: number;
  maxFalabella: number;
  maxMercadoLibre: number;
  savings: number;
  savingsPercentage: number;
  cheaperSite: string;
}

export class StatisticsService {
  public calculateStats(
    productsFalabella: Product[],
    productsMercadoLibre: Product[],
  ): SimilarityStats[] {
    const groups = this.findSimilarProducts(
      productsFalabella,
      productsMercadoLibre,
    );

    const stats = groups.map((group) => {
      const falabellaProducts = group.products.filter(
        (p) => p.site === 'falabella',
      );
      const mercadoLibreProducts = group.products.filter(
        (p) => p.site === 'mercadolibre',
      );

      const falabellaPrices = falabellaProducts
        .map((p) => p.priceNumeric)
        .filter((p) => p > 0);
      const mercadoLibrePrices = mercadoLibreProducts
        .map((p) => p.priceNumeric)
        .filter((p) => p > 0);

      const avgFalabella = this.average(falabellaPrices);
      const avgMercadoLibre = this.average(mercadoLibrePrices);

      const minFalabella =
        falabellaPrices.length > 0 ? Math.min(...falabellaPrices) : 0;
      const minMercadoLibre =
        mercadoLibrePrices.length > 0 ? Math.min(...mercadoLibrePrices) : 0;

      const maxFalabella =
        falabellaPrices.length > 0 ? Math.max(...falabellaPrices) : 0;
      const maxMercadoLibre =
        mercadoLibrePrices.length > 0 ? Math.max(...mercadoLibrePrices) : 0;

      let savings = 0;
      let savingsPercentage = 0;

      if (avgFalabella > 0 && avgMercadoLibre > 0) {
        savings = Math.abs(avgFalabella - avgMercadoLibre);
        savingsPercentage =
          (savings / Math.max(avgFalabella, avgMercadoLibre)) * 100;
      }

      return {
        name: group.name,
        countFalabella: falabellaProducts.length,
        countMercadoLibre: mercadoLibreProducts.length,
        avgFalabella,
        avgMercadoLibre,
        minFalabella,
        minMercadoLibre,
        maxFalabella,
        maxMercadoLibre,
        savings,
        savingsPercentage,
        cheaperSite:
          avgFalabella < avgMercadoLibre ? 'Falabella' : 'MercadoLibre',
      };
    });

    return stats.sort((a, b) => b.savingsPercentage - a.savingsPercentage);
  }

  private findSimilarProducts(
    productsFalabella: Product[],
    productsMercadoLibre: Product[],
  ): GroupedProducts[] {
    const allProducts = [...productsFalabella, ...productsMercadoLibre];
    const groups: GroupedProducts[] = [];
    const processed = new Set<number>();

    allProducts.forEach((product, index) => {
      if (processed.has(index)) return;

      const similarProducts = [product];
      processed.add(index);

      allProducts.forEach((otherProduct, otherIndex) => {
        if (processed.has(otherIndex)) return;
        if (index === otherIndex) return;

        if (this.areProductsSimilar(product, otherProduct)) {
          similarProducts.push(otherProduct);
          processed.add(otherIndex);
        }
      });

      if (similarProducts.length > 1) {
        groups.push({
          name: this.extractProductName(product.title),
          products: similarProducts,
        });
      }
    });

    return groups;
  }

  private areProductsSimilar(p1: Product, p2: Product): boolean {
    const textSimilarity = this.calculateTextSimilarity(p1.title, p2.title);

    if (textSimilarity < 0.55) return false;

    const sameSeller = !p1.seller || !p2.seller || p1.seller === p2.seller;

    if (!sameSeller) return false;

    if (p1.priceNumeric > 0 && p2.priceNumeric > 0) {
      const priceDiff =
        Math.abs(p1.priceNumeric - p2.priceNumeric) /
        Math.max(p1.priceNumeric, p2.priceNumeric);

      if (priceDiff > 0.4) return false;
    }

    return true;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const t1 = this.normalize(text1);
    const t2 = this.normalize(text2);

    const tokens1 = new Set(t1.split(/\s+/));
    const tokens2 = new Set(t2.split(/\s+/));

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    const jaccardSimilarity =
      union.size > 0 ? intersection.size / union.size : 0;

    const bigrams1 = this.getBigrams(t1);
    const bigrams2 = this.getBigrams(t2);

    const bigramIntersection = new Set(
      [...bigrams1].filter((x) => bigrams2.has(x)),
    );
    const bigramUnion = new Set([...bigrams1, ...bigrams2]);

    const bigramSimilarity =
      bigramUnion.size > 0 ? bigramIntersection.size / bigramUnion.size : 0;

    return jaccardSimilarity * 0.7 + bigramSimilarity * 0.3;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .trim();
  }

  private getBigrams(text: string): Set<string> {
    const bigrams = [];
    for (let i = 0; i < text.length - 1; i++) {
      bigrams.push(text.substring(i, i + 2));
    }
    return new Set(bigrams);
  }

  private extractProductName(title: string): string {
    const normalized = this.normalize(title);
    const stopWords = new Set([
      'de',
      'la',
      'el',
      'para',
      'con',
      'en',
      'y',
      'a',
      'un',
      'una',
    ]);

    const words = normalized
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
      .slice(0, 5);

    return words.join(' ');
  }

  private average(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : 0;
  }
}

export const statisticsService = new StatisticsService();
