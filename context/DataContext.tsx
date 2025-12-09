import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Asset, AIReport, MarketNews, InvestmentGoals } from '../types';
import { fetchAssets, fetchReports, fetchMarketNews, fetchGoals } from '../services/marketService';
import { useAuth } from './AuthContext';

interface MacroDataState {
  cpi: any[];
  ppi: any[];
  lpr: any[];
  gdp: any[]; // Added
  pmi: any[]; // Added
  fx_reserves: any[]; // Added
  exchange_rate: any[];
  deposit_volume: any[];
  deposit_rates: any[];
}

interface DataContextType {
  assets: Asset[];
  reports: AIReport[];
  marketNews: MarketNews[];
  goals: InvestmentGoals;
  macroData: MacroDataState | null;
  isLoading: boolean;
  lastUpdated: string;
  refreshAssets: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  setReports: React.Dispatch<React.SetStateAction<AIReport[]>>;
  setMarketNews: React.Dispatch<React.SetStateAction<MarketNews[]>>;
  setGoals: React.Dispatch<React.SetStateAction<InvestmentGoals>>;
}

const DataContext = createContext<DataContextType | null>(null);

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [marketNews, setMarketNews] = useState<MarketNews[]>([]);
  const [goals, setGoals] = useState<InvestmentGoals>({ targetProfit: 0, targetDate: "", availableCapital: 0 });
  const [macroData, setMacroData] = useState<MacroDataState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('-');
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchData = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    if (!force && now - lastFetchTime < CACHE_DURATION && assets.length > 0) {
      // Use cache if available and fresh enough
      return;
    }

    setIsLoading(true);
    try {
      const [fetchedAssets, fetchedReports, fetchedNews, fetchedGoals] = await Promise.all([
        fetchAssets(),
        fetchReports(),
        fetchMarketNews(20),
        fetchGoals()
      ]);

      setAssets(fetchedAssets);
      setReports(fetchedReports);
      setMarketNews(fetchedNews);
      setGoals(fetchedGoals);
      
      // Fetch macro data separately as it's less frequent
      if (!macroData || force) {
          try {
            // Updated endpoint to /api/macro to match server.py
            const macroRes = await fetch('http://localhost:8000/api/macro');
            if (macroRes.ok) {
                const macroResult = await macroRes.json();
                // Data format from server.py is already { date: '...', value: ... }
                // So we don't need complex mapping if the keys match what MacroData.tsx expects
                
                // MacroData.tsx expects:
                // cpi: { date, value }
                // ppi: { date, value }
                // lpr: { date, value, value5y } -> Server returns { date, value_1y, value_5y }
                // gdp: { date, value }
                // deposit_volume: { date, value }
                // exchange_rate: { date, value }
                
                setMacroData({
                    cpi: macroResult.cpi || [],
                    ppi: macroResult.ppi || [],
                    lpr: macroResult.lpr?.map((item: any) => ({
                        date: item.date,
                        value: item.value_1y,
                        value5y: item.value_5y
                    })) || [],
                    gdp: macroResult.gdp || [],
                    exchange_rate: macroResult.exchange_rate || [],
                    deposit_volume: macroResult.deposit_volume || [],
                    deposit_rates: macroResult.deposit_rates || [],
                    pmi: macroResult.pmi || [],
                    fx_reserves: macroResult.fx_reserves || []
                });
            } else {
                console.error("Macro data fetch failed:", macroRes.status, macroRes.statusText);
            }
          } catch (e) {
              console.error("Failed to fetch macro data", e);
          }
      }

      setLastUpdated(new Date().toLocaleTimeString());
      setLastFetchTime(now);
    } catch (error) {
      console.error("Failed to fetch initial data", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, lastFetchTime, assets.length, macroData]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
        fetchData();
    }
  }, [isAuthenticated]);

  const refreshAssets = async () => {
      const fetchedAssets = await fetchAssets();
      setAssets(fetchedAssets);
      setLastUpdated(new Date().toLocaleTimeString());
  };

  const refreshAll = async () => {
      await fetchData(true);
  };

  return (
    <DataContext.Provider value={{
      assets,
      reports,
      marketNews,
      goals,
      macroData,
      isLoading,
      lastUpdated,
      refreshAssets,
      refreshAll,
      setAssets,
      setReports,
      setMarketNews,
      setGoals
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
