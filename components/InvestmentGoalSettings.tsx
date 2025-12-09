import React, { useState, useEffect } from 'react';
import { InvestmentGoals } from '../types';
import { fetchGoals, saveGoals } from '../services/marketService';

interface InvestmentGoalSettingsProps {
  onClose: () => void;
}

export const InvestmentGoalSettings: React.FC<InvestmentGoalSettingsProps> = ({ onClose }) => {
  const [targetProfit, setTargetProfit] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [availableCapital, setAvailableCapital] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await fetchGoals();
      setTargetProfit(data.targetProfit === 0 ? '' : data.targetProfit.toString());
      setTargetDate(data.targetDate);
      setAvailableCapital(data.availableCapital === 0 ? '' : data.availableCapital.toString());
    } catch (error) {
      console.error("Failed to load goals", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const goals: InvestmentGoals = {
        targetProfit: parseFloat(targetProfit) || 0,
        targetDate: targetDate,
        availableCapital: parseFloat(availableCapital) || 0
      };
      await saveGoals(goals);
      onClose();
    } catch (error) {
      console.error("Failed to save goals", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">加载中...</div></div>;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">AI 投顾数据设置</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              盈利目标金额 (¥)
            </label>
            <input
              type="text"
              value={targetProfit}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  setTargetProfit(val);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="例如: 100000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              期望目标达成时间
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              可用金额 (¥)
            </label>
            <input
              type="text"
              value={availableCapital}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  setAvailableCapital(val);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="例如: 50000"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
};
