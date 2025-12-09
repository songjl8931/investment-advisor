import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AssetForm } from './components/AssetForm';
import { PortfolioCharts } from './components/PortfolioCharts';
import { Asset, AnalysisStatus, PortfolioSummary, AIReport, MarketNews } from './types';
import { MOCK_MARKET_NEWS } from './constants';
import { analyzePortfolioWithDeepSeek } from './services/deepseekService';
import { fetchAssets, saveAssets, saveReports, fetchGoals } from './services/marketService';
import { AIReportList } from './components/AIReportList';
import { MarketNews as MarketNewsFeed } from './components/MarketNews';
import { TechnicalAnalysis } from './components/TechnicalAnalysis';
import { Modal } from './components/Modal';
import { InvestmentGoalSettings } from './components/InvestmentGoalSettings';
import { MacroData } from './components/MacroData';
import { StockDetail } from './components/StockDetail';
import { useAuth, AuthProvider } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { LoginPage } from './pages/LoginPage';
import { AdminPanel } from './pages/AdminPanel';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    assets, setAssets, 
    reports, setReports, 
    marketNews, setMarketNews,
    lastUpdated, refreshAssets 
  } = useData();
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [selectedTechAsset, setSelectedTechAsset] = useState<Asset | null>(null);
  const [selectedInfoAsset, setSelectedInfoAsset] = useState<Asset | null>(null);
  const navigate = useNavigate();

  // Auto Refresh Logic (Every 10 minutes during trading hours)
  // Moved from DataContext to keep it component-specific or use a global timer?
  // Ideally DataContext should handle refresh, but for now we can keep the timer here
  // calling the refreshAssets from context
  useEffect(() => {
    const checkAndRefresh = () => {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Weekday (Mon=1 to Fri=5)
        if (day >= 1 && day <= 5) {
            // 9:30 - 11:30
            const isMorning = (hour === 9 && minute >= 30) || (hour === 10) || (hour === 11 && minute <= 30);
            // 13:00 - 15:00
            const isAfternoon = (hour >= 13 && hour < 15);
            
            if (isMorning || isAfternoon) {
                refreshAssets();
            }
        }
    };

    const intervalId = setInterval(checkAndRefresh, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(intervalId);
  }, [refreshAssets]);

  const handleAddAsset = (asset: Asset) => {
    setAssets(prev => {
      const existingIndex = prev.findIndex(a => a.id === asset.id);
      let newAssets;
      if (existingIndex >= 0) {
        newAssets = [...prev];
        newAssets[existingIndex] = asset;
      } else {
        newAssets = [...prev, asset];
      }
      saveAssets(newAssets);
      return newAssets;
    });
  };

  const handleBatchAddAsset = (newAssetsList: Asset[]) => {
    setAssets(prev => {
      // Filter out potential duplicates if IDs clash (though they shouldn't with Date.now())
      // Or just append.
      const newAssets = [...prev, ...newAssetsList];
      saveAssets(newAssets);
      return newAssets;
    });
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsAssetModalOpen(true);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(prev => {
      const newAssets = prev.filter(a => a.id !== id);
      saveAssets(newAssets);
      return newAssets;
    });
  };

  const summary: PortfolioSummary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    assets.forEach(asset => {
      totalValue += asset.quantity * asset.currentPrice;
      totalCost += asset.quantity * asset.costPrice;
    });
    const totalPnL = totalValue - totalCost;
    const pnlPercentage = totalCost === 0 ? 0 : (totalPnL / totalCost) * 100;
    return { totalValue, totalCost, totalPnL, pnlPercentage };
  }, [assets]);

  const handleStartAnalysis = async () => {
    if (assets.length === 0) return;
    setAnalysisStatus(AnalysisStatus.LOADING);
    try {
      const goals = await fetchGoals();
      const result = await analyzePortfolioWithDeepSeek(assets, marketNews.length > 0 ? marketNews : MOCK_MARKET_NEWS, goals);
      const newReport: AIReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        summary: result.summary,
        content: result.content,
        score: result.score,
        model_name: result.model_name
      };
      setReports(prev => {
        const newReports = [newReport, ...prev];
        saveReports(newReports);
        return newReports;
      });
      setAnalysisStatus(AnalysisStatus.COMPLETE);
    } catch (e) {
      console.error("Analysis failed:", e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorReport: AIReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        summary: "生成研报失败",
        content: `**错误信息**: 无法生成 AI 研报。\n\n原因: ${errorMsg}\n\n请检查本地服务器是否运行 (python server.py) 以及网络连接。`,
        score: 0
      };
      setReports(prev => [errorReport, ...prev]);
      setAnalysisStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <Layout 
      onOpenSettings={() => {
        if (user?.role === 'admin') {
            navigate('/admin');
        } else {
            alert("仅管理员可配置模型");
        }
      }} 
      onNavigate={setCurrentPage}
    >
      {currentPage === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500 font-medium">总资产净值</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                ¥{summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500 font-medium">总投入成本</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                ¥{summary.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500 font-medium">累计盈亏</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className={`text-3xl font-bold ${summary.totalPnL >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {summary.totalPnL >= 0 ? '+' : ''}{summary.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className={`text-sm font-semibold px-2 py-0.5 rounded ${summary.pnlPercentage >= 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {summary.pnlPercentage.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-8">
              <PortfolioCharts assets={assets} />
              <MarketNewsFeed initialNews={marketNews} onNewsUpdate={setMarketNews} />
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-slate-800">持仓明细</h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      更新时间: {lastUpdated}
                    </span>
                  </div>
                  <button
                    onClick={() => { setEditingAsset(null); setIsAssetModalOpen(true); }}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    录入资产
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">代码/名称</th>
                        <th className="px-6 py-3 text-right">持有数量</th>
                        <th className="px-6 py-3 text-right">成本/现价</th>
                        <th className="px-6 py-3 text-right">持仓市值</th>
                        <th className="px-6 py-3 text-right">盈亏</th>
                        <th className="px-6 py-3 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400">暂无持仓数据</td>
                        </tr>
                      ) : assets.map(asset => {
                        const marketValue = asset.quantity * asset.currentPrice;
                        const pnl = marketValue - (asset.quantity * asset.costPrice);
                        const pnlPercent = (pnl / (asset.quantity * asset.costPrice)) * 100;

                        return (
                          <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">
                              <button onClick={() => setSelectedInfoAsset(asset)} className="hover:text-indigo-600 hover:underline text-left">
                                <div className="font-mono font-bold">{asset.symbol}</div>
                              </button>
                              <div className="text-xs text-slate-500 font-normal">{asset.name}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-600">{asset.quantity}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-slate-900">¥{asset.currentPrice.toFixed(2)}</div>
                              <div className="text-xs text-slate-400">¥{asset.costPrice.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-900">¥{marketValue.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <div className={pnl >= 0 ? 'text-rose-600' : 'text-emerald-600'}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</div>
                              <div className={`text-xs ${pnlPercent >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{pnlPercent.toFixed(2)}%</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleEditAsset(asset)} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => setSelectedTechAsset(asset)} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteAsset(asset.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">AI 投资顾问</h3>
                  <div className="flex gap-3">
                    <button onClick={() => setShowGoalSettings(true)} className="px-3 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium text-sm transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      投顾数据
                    </button>
                    <button onClick={handleStartAnalysis} disabled={assets.length === 0 || analysisStatus === AnalysisStatus.LOADING} className={`px-4 py-2 rounded-lg text-white font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 ${assets.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500'}`}>
                      {analysisStatus === AnalysisStatus.LOADING ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          分析中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          生成 AI 研报
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <AIReportList reports={reports} onDelete={(id) => setReports(prev => { const newReports = prev.filter(r => r.id !== id); saveReports(newReports); return newReports; })} />
              </div>
            </div>
          </div>
        </>
      )}

      {currentPage === 'macro_data' && <MacroData />}

      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title={editingAsset ? "编辑资产" : "录入新资产"}>
        <AssetForm 
            onAddAsset={(asset) => { handleAddAsset(asset); setIsAssetModalOpen(false); }} 
            onBatchAdd={(assets) => { handleBatchAddAsset(assets); setIsAssetModalOpen(false); }}
            initialData={editingAsset} 
        />
      </Modal>

      <Modal isOpen={!!selectedTechAsset} onClose={() => setSelectedTechAsset(null)} title={`${selectedTechAsset?.name} (${selectedTechAsset?.symbol}) - 技术指标`} maxWidth="max-w-4xl">
        {selectedTechAsset && <TechnicalAnalysis symbol={selectedTechAsset.symbol} name={selectedTechAsset.name} />}
      </Modal>

      <Modal isOpen={!!selectedInfoAsset} onClose={() => setSelectedInfoAsset(null)} title="个股基本信息" maxWidth="max-w-2xl">
        {selectedInfoAsset && <StockDetail symbol={selectedInfoAsset.symbol} />}
      </Modal>

      {showGoalSettings && <InvestmentGoalSettings onClose={() => setShowGoalSettings(false)} />}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        </Routes>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
