import axios from 'axios';
import { Asset, AIReport, MarketNews, InvestmentGoals } from '../types';

const API_BASE_URL = '/api';

export interface StockData {
  price: number;
  name: string;
}

export const fetchCurrentPrice = async (symbol: string): Promise<StockData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stock/${symbol}`);
    const data = response.data;
    return {
      price: data.current_price,
      name: data.name || symbol
    };
  } catch (error) {
    console.error("Error fetching real stock price, falling back to mock:", error);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const basePrice = (Math.abs(hash) % 490) + 10;
    const volatility = (Math.random() * 0.1) - 0.05;
    const finalPrice = basePrice * (1 + volatility);

    return {
      price: parseFloat(finalPrice.toFixed(2)),
      name: `模拟股票 ${symbol}`
    };
  }
};

export const getMarketContext = () => {
  return "当前市场处于震荡上行区间，科技股领涨，传统能源板块回调。通胀预期略有下降，市场对美联储降息预期增强。";
};

export const fetchAssets = async (): Promise<Asset[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/assets`);
    const assets = response.data;
    
    // Refresh prices if needed (simple optimization: could be done in backend, but keeping frontend logic for now)
    // In a real app, backend should return latest prices or we fetch them in bulk
    // Let's iterate and update prices concurrently
    const updatedAssets = await Promise.all(assets.map(async (asset: Asset) => {
        try {
             // Only update stocks/funds, assume type is checked or symbol exists
             const stockData = await fetchCurrentPrice(asset.symbol);
             return { ...asset, currentPrice: stockData.price, name: stockData.name };
        } catch (e) {
            return asset;
        }
    }));
    
    return updatedAssets;
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return [];
  }
};

export const saveAssets = async (assets: Asset[]): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/assets`, assets);
  } catch (error) {
    console.error("Failed to save assets:", error);
  }
};

export const fetchReports = async (): Promise<AIReport[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/reports`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return [];
  }
};

export const saveReports = async (reports: AIReport[]): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/reports`, reports);
  } catch (error) {
    console.error("Failed to save reports:", error);
  }
};

export const fetchMarketNews = async (limit: number = 20): Promise<MarketNews[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/news?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching market news:", error);
    return [];
  }
};

export const fetchGoals = async (): Promise<InvestmentGoals> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/goals`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return { targetProfit: 0, targetDate: "", availableCapital: 0 };
  }
};

export const saveGoals = async (goals: InvestmentGoals): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/goals`, goals);
  } catch (error) {
    console.error("Failed to save goals:", error);
  }
};
