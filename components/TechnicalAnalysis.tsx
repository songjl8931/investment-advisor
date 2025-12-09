import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';

interface TechnicalAnalysisProps {
  symbol: string;
  name: string;
}

// Color constants
const COLOR_UP = '#ef4444';   // Red for Rise
const COLOR_DOWN = '#22c55e'; // Green for Fall
const COLOR_MA5 = '#f59e0b';
const COLOR_MA10 = '#3b82f6';
const COLOR_MA20 = '#8b5cf6';

// Custom shape for Candlestick
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  
  const isRising = close > open;
  const color = isRising ? COLOR_UP : COLOR_DOWN;
  
  // Calculate pixel positions based on the Bar's range [low, high]
  // The Bar is rendered from 'low' to 'high', so:
  // y is the top position (corresponding to high value)
  // height is the total height (corresponding to high - low)
  
  // Avoid division by zero
  const range = high - low;
  const ratio = range === 0 ? 0 : height / range;
  
  const yHigh = y;
  const yLow = y + height;
  const yOpen = y + (high - open) * ratio;
  const yClose = y + (high - close) * ratio;
  
  const bodyTop = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);
  
  // Center x
  const cx = x + width / 2;
  
  return (
    <g stroke={color} fill={color} strokeWidth={1.5}>
      {/* Wick */}
      <line x1={cx} y1={yHigh} x2={cx} y2={yLow} />
      {/* Body */}
      <rect 
        x={x} 
        y={bodyTop} 
        width={width} 
        height={bodyHeight} 
        fill={isRising ? 'none' : color} // Hollow for rising (optional style) or filled. Let's do solid for both for better visibility, or mimic Chinese style: Red (Hollow or Solid), Green (Solid).
        // Standard Chinese: Red = Solid/Hollow, Green = Solid. Let's stick to Solid for both for simplicity first, or Solid Red / Solid Green.
        // User asked for "Red = Up", "Green = Down".
        stroke={color}
      />
    </g>
  );
};

export const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({ symbol, name }) => {
  // Generate mock historical data
  const data = React.useMemo(() => {
    const result = [];
    let price = 100;
    const now = new Date();
    const days = 60; // Increase days for MA calculation

    // Generate base price series
    const prices = [];
    for (let i = 0; i < days; i++) {
        const change = (Math.random() - 0.5) * 5;
        price += change;
        prices.push(price);
    }

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - i));
      
      const currentPrice = prices[i];
      // Generate OHLC based on currentPrice
      const volatility = 2;
      const open = currentPrice + (Math.random() - 0.5) * volatility;
      const close = currentPrice + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;

      // Calculate MAs
      const getMA = (n: number, idx: number) => {
          if (idx < n - 1) return null;
          let sum = 0;
          for(let k=0; k<n; k++) sum += prices[idx-k];
          return sum / n;
      };

      const ma5 = getMA(5, i);
      const ma10 = getMA(10, i);
      const ma20 = getMA(20, i);

      // Calculate BOLL (using MA20 as mid)
      // Standard deviation of last 20 closes
      let bollUpper = null;
      let bollLower = null;
      if (i >= 19) {
          let sumSq = 0;
          const mean = ma20 || 0;
          for(let k=0; k<20; k++) {
              sumSq += Math.pow(prices[i-k] - mean, 2);
          }
          const std = Math.sqrt(sumSq / 20);
          bollUpper = mean + 2 * std;
          bollLower = mean - 2 * std;
      }

      // Calculate mock MACD
      const macd = (Math.random() - 0.5) * 2;
      const signal = (Math.random() - 0.5) * 2;
      const hist = macd - signal;

      result.push({
        date: date.toLocaleDateString(),
        open,
        high,
        low,
        close,
        range: [low, high], // For the candlestick bar y-range
        volume: Math.floor(Math.random() * 1000000),
        ma5,
        ma10,
        ma20,
        bollMid: ma20,
        bollUpper,
        bollLower,
        bollRange: [bollLower, bollUpper], // For Area chart
        macd,
        signal,
        hist
      });
    }
    return result.slice(20); // Slice to remove initial null MAs
  }, [symbol]);

  return (
    <div className="space-y-8">
      {/* Price Chart (Candlestick + MA) */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h4 className="text-sm font-bold text-slate-700 mb-4">价格走势 (日K线)</h4>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{fontSize: 10}} />
              <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10}} />
              <Tooltip 
                contentStyle={{ fontSize: '12px' }}
                formatter={(value: any, name: string) => {
                    if (typeof value === 'number') return value.toFixed(2);
                    if (Array.isArray(value)) return value.map(v => v.toFixed(2)).join(' - ');
                    return value;
                }}
              />
              <Legend />
              
              {/* Volume Bar */}
              <Bar yAxisId="right" dataKey="volume" fill="#cbd5e1" name="成交量" barSize={20} />
              
              {/* MAs */}
              <Line yAxisId="left" type="monotone" dataKey="ma5" stroke={COLOR_MA5} dot={false} strokeWidth={1} name="MA5" />
              <Line yAxisId="left" type="monotone" dataKey="ma10" stroke={COLOR_MA10} dot={false} strokeWidth={1} name="MA10" />
              <Line yAxisId="left" type="monotone" dataKey="ma20" stroke={COLOR_MA20} dot={false} strokeWidth={1} name="MA20" />

              {/* Candlestick Bar */}
              {/* dataKey="range" passes [low, high] to the shape props */}
              <Bar 
                yAxisId="left"
                dataKey="range" 
                shape={<CandlestickShape />} 
                name="K线"
                barSize={10}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MACD Chart */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="text-sm font-bold text-slate-700 mb-4">MACD (12, 26, 9)</h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hist" name="MACD柱">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hist >= 0 ? COLOR_UP : COLOR_DOWN} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="macd" stroke="#f59e0b" dot={false} strokeWidth={1} />
                <Line type="monotone" dataKey="signal" stroke="#3b82f6" dot={false} strokeWidth={1} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BOLL Chart */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="text-sm font-bold text-slate-700 mb-4">BOLL (20, 2)</h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                <Tooltip />
                <Legend />
                
                {/* Band Area */}
                <Area 
                  dataKey="bollRange" 
                  fill="#e0e7ff" 
                  stroke="none" 
                  opacity={0.5} 
                  name="通道"
                />
                
                {/* Lines */}
                <Line type="monotone" dataKey="bollUpper" stroke="#818cf8" dot={false} strokeWidth={1} name="上轨" />
                <Line type="monotone" dataKey="bollMid" stroke="#4f46e5" dot={false} strokeWidth={1} name="中轨" />
                <Line type="monotone" dataKey="bollLower" stroke="#818cf8" dot={false} strokeWidth={1} name="下轨" />
                
                {/* Close Price Line for reference inside BOLL */}
                <Line type="monotone" dataKey="close" stroke="#94a3b8" dot={false} strokeWidth={1} strokeDasharray="3 3" name="收盘价" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
