import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset } from '../types';

interface PortfolioChartsProps {
  assets: Asset[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b'];

export const PortfolioCharts: React.FC<PortfolioChartsProps> = ({ assets }) => {
  const data = assets.map(asset => ({
    name: asset.name,
    value: asset.quantity * asset.currentPrice,
    symbol: asset.symbol
  })).sort((a, b) => b.value - a.value);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  if (assets.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
        <span className="text-slate-400">暂无数据，请添加资产</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-auto min-h-[260px] flex flex-col">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">资产分布</h3>
      <div className="flex-1 flex flex-col items-center">
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => {
                  const percent = totalValue > 0 ? (value / totalValue * 100).toFixed(1) : '0.0';
                  return [`¥${value.toLocaleString()} (${percent}%)`, '市值'];
                }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Custom Legend that allows vertical expansion */}
        <div className="w-full mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
          {data.map((entry, index) => {
            const percent = totalValue > 0 ? (entry.value / totalValue * 100).toFixed(1) : '0.0';
            return (
              <div key={`legend-${index}`} className="flex items-center text-xs">
                <div 
                  className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-slate-600 truncate flex-1" title={entry.name}>{entry.name}</span>
                <span className="text-slate-400 ml-1 tabular-nums">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
