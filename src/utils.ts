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

export function isQuoteExpired(quote: Quote): boolean {
  const now = new Date();
  const quoteDate = new Date(quote.quote_date);
  const diffTime = Math.abs(now.getTime() - quoteDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const limit = quote.quote_type === 'public' ? 360 : 180;
  return diffDays > limit;
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  // Se a string estiver apenas no formato YYYY-MM-DD, tratamos para evitar problemas de fuso horário
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  }
  return new Date(dateString).toLocaleDateString('pt-BR');
};
