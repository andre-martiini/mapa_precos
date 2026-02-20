import { Stats, Quote } from "./types";

export function calculateStats(quotes: Quote[], quantity: number): Stats {
  const prices = quotes.map(q => q.unit_price).sort((a, b) => a - b);
  const n = prices.length;

  if (n === 0) {
    return {
      min: 0, mean: 0, median: 0, stdDev: 0, cv: 0,
      lowerLimit: 0, upperLimit: 0, sanitizedMean: 0,
      totalEstimated: 0, validQuotes: 0, outliersCount: 0
    };
  }

  const min = prices[0];
  const sum = prices.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const median = n % 2 === 0 
    ? (prices[n / 2 - 1] + prices[n / 2]) / 2 
    : prices[Math.floor(n / 2)];

  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

  // New formulas as requested
  const lowerLimit = mean - stdDev;
  const upperLimit = mean + stdDev;

  // Sanitized Mean: average of values where lowerLimit <= value <= upperLimit
  const sanitizedPrices = prices.filter(p => p >= lowerLimit && p <= upperLimit);
  const sanitizedMean = sanitizedPrices.length > 0 
    ? sanitizedPrices.reduce((a, b) => a + b, 0) / sanitizedPrices.length 
    : mean;

  return {
    min,
    mean,
    median,
    stdDev,
    cv,
    lowerLimit,
    upperLimit,
    sanitizedMean,
    totalEstimated: sanitizedMean * quantity, // Default to sanitized, but UI will override based on strategy
    validQuotes: sanitizedPrices.length,
    outliersCount: n - sanitizedPrices.length
  };
}

export type ExpiryStatus = 'expired' | 'warning' | 'attention' | 'valid';

export function getQuoteExpiryStatus(quote: Quote): ExpiryStatus {
  const now = new Date();
  const quoteDate = new Date(quote.quote_date);
  // Reset hours to compare only dates
  now.setHours(0, 0, 0, 0);
  quoteDate.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - quoteDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const limit = quote.quote_type === 'public' ? 360 : 180;
  const daysRemaining = limit - diffDays;

  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 15) return 'warning';
  if (daysRemaining <= 30) return 'attention';
  return 'valid';
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};
