import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Globe, Mail, MapPin, Users, Briefcase, Calendar, Info } from 'lucide-react';

interface StockDetailProps {
  symbol: string;
}

interface StockInfo {
  symbol: string;
  name: string;
  industry: string;
  area: string;
  market: string;
  list_date: string;
  pe_ttm: number;
  pb: number;
  total_market_cap: number;
  float_market_cap: number;
  revenue_growth: number;
  profit_growth: number;
  description: string;
  chairman: string;
  manager: string;
  secretary: string;
  reg_capital: number;
  setup_date: string;
  province: string;
  city: string;
  website: string;
  email: string;
  office: string;
  employees: number;
  main_business: string;
  business_scope: string;
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
        const response = await axios.get(`/api/stock_info/${symbol}`);
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
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{info.name}</h2>
            <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
              {info.symbol}
            </span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
              {info.market}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {info.industry}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {info.area || info.province} {info.city}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> 上市: {info.list_date}</span>
          </div>
        </div>
      </div>

      {/* Market Data Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">市盈率 (TTM)</p>
          <p className="text-lg font-bold text-slate-900">{info.pe_ttm || '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">市净率 (PB)</p>
          <p className="text-lg font-bold text-slate-900">{info.pb || '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">总市值 (亿)</p>
          <p className="text-lg font-bold text-slate-900">{info.total_market_cap || '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">流通市值 (亿)</p>
          <p className="text-lg font-bold text-slate-900">{info.float_market_cap || '-'}</p>
        </div>
      </div>

      {/* Basic Info & Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500" /> 基本信息
            </h3>
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
                <div className="grid grid-cols-3 border-b border-slate-100">
                    <div className="bg-slate-50 p-2 text-slate-500">法人代表</div>
                    <div className="col-span-2 p-2">{info.chairman || '-'}</div>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100">
                    <div className="bg-slate-50 p-2 text-slate-500">总经理</div>
                    <div className="col-span-2 p-2">{info.manager || '-'}</div>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100">
                    <div className="bg-slate-50 p-2 text-slate-500">董秘</div>
                    <div className="col-span-2 p-2">{info.secretary || '-'}</div>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100">
                    <div className="bg-slate-50 p-2 text-slate-500">注册资本</div>
                    <div className="col-span-2 p-2">{info.reg_capital ? `${info.reg_capital}万` : '-'}</div>
                </div>
                 <div className="grid grid-cols-3 border-b border-slate-100">
                    <div className="bg-slate-50 p-2 text-slate-500">成立日期</div>
                    <div className="col-span-2 p-2">{info.setup_date || '-'}</div>
                </div>
                <div className="grid grid-cols-3">
                    <div className="bg-slate-50 p-2 text-slate-500">员工人数</div>
                    <div className="col-span-2 p-2">{info.employees || '-'}</div>
                </div>
            </div>
        </div>

        <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" /> 联系方式
            </h3>
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
                <div className="grid grid-cols-3 border-b border-slate-100">
                    <div className="bg-slate-50 p-2 text-slate-500">公司网址</div>
                    <div className="col-span-2 p-2 truncate">
                        {info.website ? <a href={info.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{info.website}</a> : '-'}
                    </div>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100">
                    <div className="bg-slate-50 p-2 text-slate-500">电子邮箱</div>
                    <div className="col-span-2 p-2 truncate">{info.email || '-'}</div>
                </div>
                <div className="grid grid-cols-3 h-full">
                    <div className="bg-slate-50 p-2 text-slate-500">办公地址</div>
                    <div className="col-span-2 p-2">{info.office || '-'}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-500" /> 业务概览
        </h3>
        <div className="space-y-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">主要业务</span>
                <p className="text-sm text-slate-800">{info.main_business || '暂无信息'}</p>
            </div>
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">经营范围</span>
                <p className="text-sm text-slate-600">{info.business_scope || '暂无信息'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">公司简介</span>
                <p className="text-sm text-slate-600 leading-relaxed">{info.description || info.introduction || '暂无信息'}</p>
            </div>
        </div>
      </div>
    </div>
  );
};
