import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface StockDetailProps {
  symbol: string;
}

interface StockInfo {
  symbol: string;
  name: string;
  industry: string;
  pe_ttm: number;
  pb: number;
  total_market_cap: number;
  float_market_cap: number;
  revenue_growth: number;
  profit_growth: number;
  description: string;
}

export const StockDetail: React.FC<StockDetailProps> = ({ symbol }) => {
  const [info, setInfo] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        // Using axios to ensure auth headers are sent if needed, 
        // though stock info might be public.
        const response = await axios.get(`http://localhost:8000/api/stock_info/${symbol}`);
        setInfo(response.data);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.detail || err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchInfo();
    }
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-rose-600 bg-rose-50 rounded-lg">
        <p>获取数据失败: {error}</p>
      </div>
    );
  }

  if (!info) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {info.name}
            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {info.symbol}
            </span>
          </h2>
          <p className="text-slate-500 mt-1">{info.industry}</p>
        </div>
      </div>

      {/* Market Data Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 bg-slate-50 p-6 rounded-xl">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500">市盈率 (TTM)</p>
          <p className="text-lg font-medium text-slate-900">{info.pe_ttm}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500">市净率 (PB)</p>
          <p className="text-lg font-medium text-slate-900">{info.pb}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500">总市值 (亿)</p>
          <p className="text-lg font-medium text-slate-900">{info.total_market_cap}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500">流通市值 (亿)</p>
          <p className="text-lg font-medium text-slate-900">{info.float_market_cap}</p>
        </div>
         <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500">营收增长率</p>
          <p className={`text-lg font-medium ${info.revenue_growth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
             {info.revenue_growth > 0 ? '+' : ''}{info.revenue_growth}%
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500">净利增长率</p>
          <p className={`text-lg font-medium ${info.profit_growth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
             {info.profit_growth > 0 ? '+' : ''}{info.profit_growth}%
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-800">公司简介</h3>
        <p className="text-slate-600 leading-relaxed text-sm bg-white p-4 border border-slate-100 rounded-lg shadow-sm">
          {info.description}
        </p>
      </div>
    </div>
  );
};
