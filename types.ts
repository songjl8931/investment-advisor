export interface InvestmentGoals {
  targetProfit: number;
  targetDate: string;
  availableCapital: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'STOCK' | 'FUND' | 'CRYPTO' | 'CASH';
  quantity: number;
  costPrice: number;
  currentPrice: number; // Simulated live data
  currency: string;
}

export interface AIReport {
  id: string;
  timestamp: string;
  summary: string;
  content: string;
  score: number;
  model_name?: string;
}

export interface ModelConfig {
  id: string;
  provider: string;
  name: string;
  api_key: string;
  base_url: string;
  modules: string[];
}

export interface MarketNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  url: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnL: number; // Profit and Loss
  pnlPercentage: number;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
