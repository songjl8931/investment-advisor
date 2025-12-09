import { Asset } from "../types";

export interface TechnicalIndicator {
  symbol: string;
  ma5: number;
  ma10: number;
  ma20: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  macd: {
    diff: number;
    dea: number;
    hist: number;
    signal: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'NEUTRAL';
  };
  boll: {
    upper: number;
    mid: number;
    lower: number;
    position: 'ABOVE_UPPER' | 'BELOW_LOWER' | 'INSIDE';
  };
}

export const calculateTechnicalIndicators = (asset: Asset): TechnicalIndicator => {
  // In a real app, we would fetch historical data here.
  // For this mock, we generate consistent mock data based on the asset ID/Symbol hash or random.
  // To keep it simple but somewhat realistic for the AI, we'll generate data that might trigger signals.
  
  let seed = asset.symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
  };

  // Base mock values
  const currentPrice = asset.currentPrice;
  
  // Mock MAs around current price
  const ma5 = currentPrice * (1 + (random() - 0.5) * 0.05);
  const ma10 = currentPrice * (1 + (random() - 0.5) * 0.10);
  const ma20 = currentPrice * (1 + (random() - 0.5) * 0.15);
  
  // Determine trend based on MA alignment
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (currentPrice > ma5 && ma5 > ma10 && ma10 > ma20) trend = 'BULLISH';
  else if (currentPrice < ma5 && ma5 < ma10 && ma10 < ma20) trend = 'BEARISH';
  
  // Mock MACD
  const diff = (random() - 0.5) * 2;
  const dea = (random() - 0.5) * 2;
  const hist = (diff - dea) * 2;
  let macdSignal: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'NEUTRAL' = 'NEUTRAL';
  if (hist > 0 && hist < 0.2) macdSignal = 'GOLDEN_CROSS'; // Just turning positive
  if (hist < 0 && hist > -0.2) macdSignal = 'DEATH_CROSS'; // Just turning negative

  // Mock BOLL
  const bollMid = ma20;
  const std = currentPrice * 0.05; // 5% volatility
  const bollUpper = bollMid + 2 * std;
  const bollLower = bollMid - 2 * std;
  
  let bollPos: 'ABOVE_UPPER' | 'BELOW_LOWER' | 'INSIDE' = 'INSIDE';
  if (currentPrice > bollUpper) bollPos = 'ABOVE_UPPER';
  if (currentPrice < bollLower) bollPos = 'BELOW_LOWER';

  return {
    symbol: asset.symbol,
    ma5,
    ma10,
    ma20,
    trend,
    macd: {
      diff,
      dea,
      hist,
      signal: macdSignal
    },
    boll: {
      upper: bollUpper,
      mid: bollMid,
      lower: bollLower,
      position: bollPos
    }
  };
};
