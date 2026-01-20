import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Plus, Trash2, TrendingUp, BarChart2, Activity, List, FileText, Settings, RefreshCw, Zap, ArrowUp, ArrowDown, X, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Modal } from '../components/Modal';
import { StockDetail } from '../components/StockDetail';

interface Strategy {
  id: number;
  name: string;
  description: string;
  params: {
    min_change?: number;
    max_change?: number;
    min_turnover?: number;
    max_turnover?: number;
    min_volume_ratio?: number;
    min_market_cap?: number; // 亿
    max_market_cap?: number;
    check_ma_alignment?: boolean; // 均线多头
    check_volume_up?: boolean; // 成交量温和放大
    check_strong_trend?: boolean; // 站稳均价线
    check_new_high_pullback?: boolean; // 创新高回踩
  };
  priority: number;
  is_active: boolean;
}

interface StockRecommendation {
  id: number;
  symbol: string;
  name: string;
  date: string;
  price: number;
  change_percent: number;
  volume_ratio: number;
  turnover_rate: number;
  reason: {
    hit_criteria: string[];
  };
  ai_analysis?: string;
}

interface StrategyExecution {
  id: number;
  strategy_id: number;
  created_at: string;
  ai_analysis?: string;
}

interface StockTrackingItem {
  id: number;
  symbol: string;
  name: string;
  strategy_name: string;
  execution_date: string;
  recommend_price: number;
  current_price: number;
  return_percent: number;
  execution_id: number;
}

const AIStockSelection: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [executions, setExecutions] = useState<StrategyExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<StrategyExecution | null>(null);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [trackingItems, setTrackingItems] = useState<StockTrackingItem[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [isRefreshingTracking, setIsRefreshingTracking] = useState(false);
  
  // New Strategy Form State
  const [formData, setFormData] = useState<Partial<Strategy>>({
    name: '新策略',
    description: '短线策略',
    params: {
        min_change: 3,
        min_volume_ratio: 1.5,
        min_turnover: 5
    },
    priority: 0,
    is_active: true
  });

  useEffect(() => {
    fetchStrategies();
  }, []);

  useEffect(() => {
    if (selectedStrategy) {
      fetchExecutions(selectedStrategy.id);
    }
  }, [selectedStrategy]);

  useEffect(() => {
    if (selectedExecution) {
      fetchRecommendations(selectedExecution.id);
      fetchTrackingItems(selectedExecution.id);
    } else {
      setRecommendations([]);
      setTrackingItems([]);
    }
  }, [selectedExecution]);

  const fetchTrackingItems = async (executionId: number) => {
      try {
          const res = await axios.get(`/api/strategies/tracking?execution_id=${executionId}`);
          setTrackingItems(res.data);
      } catch (err) {
          console.error("Failed to fetch tracking items", err);
      }
  };

  const handleRefreshTracking = async () => {
      if (!selectedExecution) return;
      setIsRefreshingTracking(true);
      try {
          await fetchTrackingItems(selectedExecution.id);
          alert('策略跟踪数据已更新');
      } catch (error) {
          console.error('Failed to refresh tracking items', error);
      } finally {
          setIsRefreshingTracking(false);
      }
  };

  const fetchStrategies = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/strategies');
      setStrategies(res.data);
      if (res.data.length > 0 && !selectedStrategy) {
        setSelectedStrategy(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExecutions = async (strategyId: number) => {
    try {
      const res = await axios.get(`/api/strategies/${strategyId}/executions`);
      setExecutions(res.data);
      if (res.data.length > 0) {
        setSelectedExecution(res.data[0]);
      } else {
        setSelectedExecution(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecommendations = async (executionId: number) => {
    try {
      const res = await axios.get(`/api/strategies/executions/${executionId}/recommendations`);
      setRecommendations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecute = async (strategy: Strategy, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExecuting(true);
    try {
      const res = await axios.post(`/api/strategies/${strategy.id}/execute`);
      // Refresh executions and select latest
      await fetchExecutions(strategy.id);
      alert(`执行完成，筛选出 ${res.data.length} 只股票`);
    } catch (err) {
      console.error(err);
      alert('执行失败');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedExecution) return;
    setIsAnalyzing(true);
    try {
      const res = await axios.post(`/api/strategies/executions/${selectedExecution.id}/analyze`);
      // Update selected execution with analysis
      setSelectedExecution({...selectedExecution, ai_analysis: res.data.analysis});
      // Also update in list
      setExecutions(prev => prev.map(e => e.id === selectedExecution.id ? {...e, ai_analysis: res.data.analysis} : e));
      
      alert('AI 分析完成');
    } catch (err) {
      console.error(err);
      alert('AI 分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('ai-analysis-report');
    if (!element) return;

    setIsDownloading(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`AI_Analysis_${selectedExecution?.id}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('PDF 生成失败，请重试');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveStrategy = async () => {
    try {
        if (selectedStrategy) {
             // Update
             await axios.put(`http://localhost:8000/api/strategies/${selectedStrategy.id}`, formData);
        } else {
            // Create
            await axios.post('/api/strategies', formData);
        }
        setIsStrategyModalOpen(false);
        fetchStrategies();
    } catch (err) {
        console.error(err);
        alert("保存失败");
    }
  };

  const handleDeleteStrategy = async (id: number) => {
      if(!confirm("确定删除该策略吗？")) return;
      try {
          await axios.delete(`/api/strategies/${id}`);
          fetchStrategies();
          if (selectedStrategy?.id === id) setSelectedStrategy(null);
      } catch(err) {
          console.error(err);
      }
  }
  
  const handleDeleteExecution = async (id: number) => {
      // confirm moved to button onClick for better control
      try {
          await axios.delete(`/api/strategies/executions/${id}`);
          if (selectedStrategy) fetchExecutions(selectedStrategy.id);
          if (selectedExecution?.id === id) {
              setSelectedExecution(null);
          }
      } catch(err) {
          console.error(err);
          alert("删除失败");
      }
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRecommendations = React.useMemo(() => {
    if (!sortConfig) return recommendations;
    return [...recommendations].sort((a, b) => {
      // @ts-ignore
      const aValue = a[sortConfig.key];
      // @ts-ignore
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [recommendations, sortConfig]);

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      {/* Left: Strategy List & Executions */}
      <div className="w-1/5 flex flex-col gap-4">
        {/* Strategy List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 overflow-hidden flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <List className="w-5 h-5 text-indigo-600" />
              策略选择
            </h3>
            <button 
                onClick={() => {
                    setSelectedStrategy(null);
                    setFormData({
                        name: '新策略',
                        description: '',
                        params: { min_change: 3, min_volume_ratio: 1.5, min_turnover: 5 },
                        priority: 0,
                        is_active: true
                    });
                    setIsStrategyModalOpen(true);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {strategies.map(s => (
              <div 
                key={s.id}
                onClick={() => setSelectedStrategy(s)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedStrategy?.id === s.id 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                    : 'bg-slate-50 border-slate-200 hover:border-indigo-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className={`font-medium ${selectedStrategy?.id === s.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {s.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                  </div>
                  <div className="flex gap-1">
                      <button 
                        onClick={(e) => handleExecute(s, e)}
                        disabled={isExecuting}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                        title="执行策略"
                      >
                          {isExecuting && selectedStrategy?.id === s.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStrategy(s);
                            setFormData(s);
                            setIsStrategyModalOpen(true);
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="编辑策略"
                      >
                          <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStrategy(s.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="删除策略"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution History (Only visible when strategy selected) */}
        {selectedStrategy && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 overflow-hidden flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        执行记录
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {executions.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">暂无执行记录</p>
                    ) : (
                        executions.map(ex => (
                            <div 
                                key={ex.id}
                                onClick={() => {
                                    setSelectedExecution(ex);
                                }}
                                className="p-3 rounded-lg border bg-slate-50 border-slate-200 hover:border-indigo-200 cursor-pointer flex justify-between items-center group"
                            >
                                <div 
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => {
                                        setSelectedExecution(ex);
                                    }}
                                >
                                    <FileText className={`w-4 h-4 ${selectedExecution?.id === ex.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    <div>
                                        <div className={`text-sm font-medium ${selectedExecution?.id === ex.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                            {new Date(ex.created_at).toLocaleString()}
                                        </div>
                                        {ex.ai_analysis && (
                                            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">已分析</span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("Deleting execution:", ex.id);
                                        handleDeleteExecution(ex.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 z-10 relative"
                                    title="删除记录"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
             </div>
        )}
      </div>

      {/* Middle: Dashboard or Execution Details */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm min-w-0">
          {!selectedExecution ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                      <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>请选择左侧策略并点击执行记录查看详情</p>
                  </div>
              </div>
          ) : (
              <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-lg">
                              <TrendingUp className="w-5 h-5 text-indigo-600" />
                              执行结果详情
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                              执行时间: {new Date(selectedExecution.created_at).toLocaleString()}
                          </p>
                      </div>
                      <div className="flex items-center gap-3">
                          <button 
                              onClick={handleAnalyze}
                              disabled={isAnalyzing || recommendations.length === 0}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                          >
                              {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                              {selectedExecution.ai_analysis ? '重新分析' : '生成 AI 分析报告'}
                          </button>
                      </div>
                  </div>

                  {/* Top: Stock List */}
                  <div className="flex-1 overflow-y-auto p-4 border-b border-slate-200">
                       <div className="overflow-x-auto">
                           <table className="w-full text-sm text-left">
                               <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                                   <tr>
                                       <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('symbol')}>代码</th>
                                       <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>名称</th>
                                       <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('price')}>现价</th>
                                       <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('change_percent')}>
                                           涨跌幅 {sortConfig?.key === 'change_percent' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}
                                       </th>
                                       <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('volume_ratio')}>
                                           量比 {sortConfig?.key === 'volume_ratio' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}
                                       </th>
                                       <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('turnover_rate')}>
                                           换手率 {sortConfig?.key === 'turnover_rate' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}
                                       </th>
                                       <th className="px-4 py-3">命中条件</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                   {sortedRecommendations.map(r => (
                                       <tr key={r.id} className="hover:bg-slate-50">
                                           <td 
                                                className="px-4 py-3 font-medium text-indigo-600 cursor-pointer hover:underline"
                                                onClick={() => setSelectedStock(r.symbol)}
                                           >
                                                {r.symbol}
                                           </td>
                                           <td className="px-4 py-3">{r.name}</td>
                                           <td className="px-4 py-3 text-right">{r.price}</td>
                                           <td className={`px-4 py-3 text-right font-medium ${r.change_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                               {r.change_percent}%
                                           </td>
                                           <td className="px-4 py-3 text-right">{r.volume_ratio}</td>
                                           <td className="px-4 py-3 text-right">{r.turnover_rate}%</td>
                                           <td className="px-4 py-3 text-xs text-slate-500">
                                               {r.reason.hit_criteria.join(', ')}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                  </div>

                  {/* Bottom: AI Analysis Records Section */}
                  <div className="h-1/3 min-h-[200px] bg-slate-50 p-4 border-t border-slate-200 flex flex-col">         
                      <div className="flex-1 overflow-y-auto">
                          {selectedExecution.ai_analysis ? (
                              <div 
                                  className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full"
                              >
                                  <div className="flex justify-between items-center mb-2 shrink-0">
                                      <span className="font-medium text-indigo-700 flex items-center gap-2">
                                          <FileText className="w-4 h-4" />
                                          AI 核心观点
                                      </span>
                                      <button 
                                          onClick={() => setIsReportModalOpen(true)}
                                          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                                      >
                                          查看完整报告 <ArrowUp className="w-3 h-3 rotate-45" />
                                      </button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto text-sm text-slate-600 bg-slate-50 rounded p-3 border border-slate-100">
                                      <ReactMarkdown 
                                          remarkPlugins={[remarkGfm]}
                                          components={{
                                              strong: ({node, ...props}) => <span className="text-red-600 font-bold bg-red-50 px-1 rounded" {...props} />
                                          }}
                                      >
                                          {(() => {
                                              const summaryMatch = selectedExecution.ai_analysis.match(/### (?:核心总结|策略总结)([\s\S]*?)(###|$)/);
                                              const rankingMatch = selectedExecution.ai_analysis.match(/### 综合排序([\s\S]*?)(###|$)/);
                                              
                                              let content = "";
                                              if (summaryMatch && summaryMatch[1]) {
                                                  content += "**策略总结**\n\n" + summaryMatch[1].trim() + "\n\n---\n\n";
                                              }
                                              if (rankingMatch && rankingMatch[1]) {
                                                  content += "**综合排序**\n\n" + rankingMatch[1].trim();
                                              }
                                              
                                              return content || selectedExecution.ai_analysis.slice(0, 200) + "...";
                                          })()}
                                      </ReactMarkdown>
                                  </div>
                              </div>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                  <p className="text-sm">暂无分析记录</p>
                                  <button 
                                      onClick={handleAnalyze}
                                      className="text-indigo-600 hover:underline text-xs mt-1"
                                  >
                                      点击上方按钮生成
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* Right: Strategy Tracking */}
      <div className="w-[320px] flex flex-col gap-4 shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 overflow-hidden flex flex-col">
           <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              策略跟踪 (选中执行)
            </h3>
            <button 
                onClick={handleRefreshTracking} 
                className={`text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition-all ${isRefreshingTracking ? 'animate-spin text-indigo-600' : ''}`}
                disabled={!selectedExecution || isRefreshingTracking}
                title="刷新跟踪数据"
            >
               <RefreshCw className="w-4 h-4" />
            </button>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {trackingItems.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 text-sm">
                    {isRefreshingTracking ? "正在获取最新数据..." : (selectedExecution ? "暂无跟踪数据" : "请先选择左侧执行记录")}
                  </div>
              ) : trackingItems.map(item => (
                  <div key={item.id} className="p-3 border rounded-lg bg-slate-50 border-slate-200 hover:border-indigo-200 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                  {item.name} 
                                  <span className="text-xs font-normal text-slate-500">({item.symbol})</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">{item.strategy_name}</div>
                          </div>
                          <div className={`text-right font-bold ${item.return_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {item.return_percent > 0 ? '+' : ''}{item.return_percent}%
                          </div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 border-t pt-2 border-slate-100">
                          <div>
                              <span className="block text-slate-400 scale-90 origin-left">入选价</span>
                              {item.recommend_price}
                          </div>
                           <div className="text-right">
                              <span className="block text-slate-400 scale-90 origin-right">现价</span>
                              {item.current_price}
                          </div>
                           <div className="text-right">
                              <span className="block text-slate-400 scale-90 origin-right">时间</span>
                              {item.execution_date.split(' ')[0]}
                          </div>
                      </div>
                  </div>
              ))}
           </div>
        </div>
      </div>

      {/* AI Report Modal */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="AI 分析报告" maxWidth="max-w-4xl">
          {selectedExecution?.ai_analysis ? (
              <div className="flex flex-col h-full">
                  <div className="flex justify-end mb-4 border-b pb-2">
                      <button 
                          onClick={handleDownloadPDF}
                          disabled={isDownloading}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                      >
                          {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          {isDownloading ? '生成中...' : '下载 PDF 报告'}
                      </button>
                  </div>
                  <div id="ai-analysis-report" className="bg-white p-8 rounded-lg">
                      <div className="mb-6 border-b border-slate-200 pb-4">
                          <h1 className="text-2xl font-bold text-slate-900 mb-2">AI 智能选股分析报告</h1>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span>生成时间: {new Date().toLocaleString()}</span>
                              <span>策略ID: {selectedExecution.strategy_id}</span>
                          </div>
                      </div>
                      <div className="prose prose-indigo prose-lg max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-700 prose-li:text-slate-700">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                strong: ({node, ...props}) => <span className="text-red-600 font-bold bg-red-50 px-1 rounded" {...props} />
                            }}
                          >
                              {selectedExecution.ai_analysis}
                          </ReactMarkdown>
                      </div>
                      <div className="mt-8 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
                          <p>免责声明：本报告由 AI 生成，仅供参考，不构成投资建议。</p>
                      </div>
                  </div>
              </div>
          ) : (
              <p className="text-center text-slate-500 py-8">暂无内容</p>
          )}
      </Modal>

      {/* Strategy Config Modal */}
      <Modal isOpen={isStrategyModalOpen} onClose={() => setIsStrategyModalOpen(false)} title={selectedStrategy ? "编辑策略" : "新建策略"}>
            <div className="space-y-4">
                <div>
                    <label className="block text-slate-700 text-sm font-medium mb-1">策略名称</label>
                    <input 
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 text-sm font-medium mb-1">策略描述</label>
                    <textarea 
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                        rows={2}
                        value={formData.description || ''}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-500 text-xs mb-1">最小涨幅 (%)</label>
                        <input 
                            type="number" className="w-full border rounded px-3 py-2"
                            value={formData.params?.min_change || ''}
                            onChange={e => setFormData({...formData, params: {...formData.params, min_change: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs mb-1">最大涨幅 (%)</label>
                        <input 
                            type="number" className="w-full border rounded px-3 py-2"
                            value={formData.params?.max_change || ''}
                            onChange={e => setFormData({...formData, params: {...formData.params, max_change: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs mb-1">最小量比</label>
                        <input 
                            type="number" className="w-full border rounded px-3 py-2"
                            value={formData.params?.min_volume_ratio || ''}
                            onChange={e => setFormData({...formData, params: {...formData.params, min_volume_ratio: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs mb-1">最小换手 (%)</label>
                        <input 
                            type="number" className="w-full border rounded px-3 py-2"
                            value={formData.params?.min_turnover || ''}
                            onChange={e => setFormData({...formData, params: {...formData.params, min_turnover: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs mb-1">最大换手 (%)</label>
                        <input 
                            type="number" className="w-full border rounded px-3 py-2"
                            value={formData.params?.max_turnover || ''}
                            onChange={e => setFormData({...formData, params: {...formData.params, max_turnover: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs mb-1">最小流通市值(亿)</label>
                        <input 
                            type="number" className="w-full border rounded px-3 py-2"
                            value={formData.params?.min_market_cap || ''}
                            onChange={e => setFormData({...formData, params: {...formData.params, min_market_cap: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs mb-1">最大流通市值(亿)</label>
                        <input 
                            type="number" className="w-full border rounded px-3 py-2"
                            value={formData.params?.max_market_cap || ''}
                            onChange={e => setFormData({...formData, params: {...formData.params, max_market_cap: parseFloat(e.target.value)}})}
                        />
                    </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg space-y-2 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">高级形态筛选</p>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input 
                            type="checkbox" 
                            checked={formData.params?.check_ma_alignment || false}
                            onChange={e => setFormData({...formData, params: {...formData.params, check_ma_alignment: e.target.checked}})}
                        />
                        均线多头排列
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input 
                            type="checkbox" 
                            checked={formData.params?.check_volume_up || false}
                            onChange={e => setFormData({...formData, params: {...formData.params, check_volume_up: e.target.checked}})}
                        />
                        成交量温和放大
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input 
                            type="checkbox" 
                            checked={formData.params?.check_strong_trend || false}
                            onChange={e => setFormData({...formData, params: {...formData.params, check_strong_trend: e.target.checked}})}
                        />
                        站稳分时均价线
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input 
                            type="checkbox" 
                            checked={formData.params?.check_new_high_pullback || false}
                            onChange={e => setFormData({...formData, params: {...formData.params, check_new_high_pullback: e.target.checked}})}
                        />
                        日内创新高回踩
                    </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setIsStrategyModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                    <button onClick={handleSaveStrategy} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">保存</button>
                </div>
            </div>
      </Modal>

      <Modal isOpen={!!selectedStock} onClose={() => setSelectedStock(null)} title="个股详情">
        {selectedStock && <StockDetail symbol={selectedStock} />}
      </Modal>
    </div>
  );
};

export default AIStockSelection;
