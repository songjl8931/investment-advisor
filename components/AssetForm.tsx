import React, { useState, useRef } from 'react';
import { Asset } from '../types';
import { ASSET_TYPES } from '../constants';
import { fetchCurrentPrice } from '../services/marketService';
import axios from 'axios';

interface AssetFormProps {
  onAddAsset: (asset: Asset) => void;
  onBatchAdd?: (assets: Asset[]) => void;
  initialData?: Asset | null;
}

export const AssetForm: React.FC<AssetFormProps> = ({ onAddAsset, onBatchAdd, initialData }) => {
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState(initialData?.type || ASSET_TYPES[0].value);
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '');
  const [costPrice, setCostPrice] = useState(initialData?.costPrice?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialData) {
      setSymbol(initialData.symbol);
      setName(initialData.name);
      setType(initialData.type);
      setQuantity(initialData.quantity.toString());
      setCostPrice(initialData.costPrice.toString());
    } else {
      setSymbol('');
      setName('');
      setType(ASSET_TYPES[0].value);
      setQuantity('');
      setCostPrice('');
    }
  }, [initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRecognizing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('http://localhost:8000/api/recognize_assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const results: any[] = response.data;

      if (Array.isArray(results) && results.length > 0) {
        // Fetch prices for all
        const enrichedAssets = await Promise.all(results.map(async (item) => {
             let currentPrice = 0;
             try {
                const priceData = await fetchCurrentPrice(item.symbol);
                currentPrice = priceData.price;
             } catch (err) {
                console.error("Price fetch failed for", item.symbol);
             }

             return {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                symbol: item.symbol,
                name: item.name,
                type: 'STOCK', // Default to stock, or guess
                quantity: parseFloat(item.quantity),
                costPrice: parseFloat(item.costPrice),
                currentPrice: currentPrice,
                currency: item.currency || 'CNY'
             } as Asset;
        }));

        if (enrichedAssets.length === 1) {
            const asset = enrichedAssets[0];
            setSymbol(asset.symbol);
            setName(asset.name);
            setQuantity(asset.quantity.toString());
            setCostPrice(asset.costPrice.toString());
            alert("已成功识别并填充信息！");
        } else if (enrichedAssets.length > 1) {
            if (onBatchAdd) {
                onBatchAdd(enrichedAssets);
                alert(`已批量添加 ${enrichedAssets.length} 条持仓记录！`);
            } else {
                alert(`识别到 ${enrichedAssets.length} 条记录，将填充第一条。建议使用批量导入功能。`);
                const asset = enrichedAssets[0];
                setSymbol(asset.symbol);
                setName(asset.name);
                setQuantity(asset.quantity.toString());
                setCostPrice(asset.costPrice.toString());
            }
        }
      } else {
        alert("未能识别到有效持仓信息，请确保图片清晰。");
      }

    } catch (error: any) {
      console.error("Recognition failed", error);
      let msg = error instanceof Error ? error.message : "未知错误";
      if (error.response && error.response.data && error.response.data.detail) {
        msg = error.response.data.detail;
      }
      alert("识别失败: " + msg);
    } finally {
      setIsRecognizing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity || !costPrice) return;

    setIsLoading(true);
    try {
      let currentPrice = initialData?.currentPrice || 0;
      let assetName = name;

      if (!initialData || symbol !== initialData.symbol) {
         const stockData = await fetchCurrentPrice(symbol);
         currentPrice = stockData.price;
         if (!name) assetName = stockData.name || symbol.toUpperCase();
      }

      const newAsset: Asset = {
        id: initialData?.id || Date.now().toString(),
        symbol: symbol.toUpperCase(),
        name: assetName,
        type: type as any,
        quantity: parseFloat(quantity),
        costPrice: parseFloat(costPrice),
        currentPrice: currentPrice,
        currency: 'CNY'
      };

      onAddAsset(newAsset);
      
      if (!initialData) {
        setSymbol('');
        setName('');
        setQuantity('');
        setCostPrice('');
      }
    } catch (error) {
      console.error("Failed to save asset", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          {initialData ? '编辑资产' : '录入资产'}
        </h3>
        
        {!initialData && (
          <div className="relative">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecognizing}
                className="text-sm px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
            >
                {isRecognizing ? (
                    <>
                        <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                        识别中...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        截图录入
                    </>
                )}
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">代码 (Symbol)</label>
            <input
              type="text"
              required
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">名称 (可选)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">资产类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            >
              {ASSET_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">持有数量</label>
            <input
              type="number"
              required
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">持仓成本</label>
            <input
              type="number"
              required
              step="any"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            initialData ? '确认修改' : '确认添加'
          )}
        </button>
      </form>
    </div>
  );
};
