import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Plus, Trash2, TrendingUp, BarChart2, Activity, List, FileText, Settings, RefreshCw, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

const AIStockSelection: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [executions, setExecutions] = useState<StrategyExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<StrategyExecution | null>(null);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  
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
    } else {
      setRecommendations([]);
    }
  }, [selectedExecution]);

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
      const res = await axios.get(`http://localhost:8000/api/strategies/${strategyId}/executions`);
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
      const res = await axios.get(`http://localhost:8000/api/strategies/executions/${executionId}/recommendations`);
      setRecommendations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecute = async (strategy: Strategy, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExecuting(true);
    try {
      const res = await axios.post(`http://localhost:8000/api/strategies/${strategy.id}/execute`);
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
      const res = await axios.post(`http://localhost:8000/api/strategies/executions/${selectedExecution.id}/analyze`);
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

  const handleSaveStrategy = async () => {
    try {
        if (selectedStrategy) {
             // Update
             await axios.put(`http://localhost:8000/api/strategies/${selectedStrategy.id}`, formData);
        } else {
            // Create
            await axios.post('http://localhost:8000/api/strategies', formData);
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
          await axios.delete(`http://localhost:8000/api/strategies/${id}`);
          fetchStrategies();
          if (selectedStrategy?.id === id) setSelectedStrategy(null);
      } catch(err) {
          console.error(err);
      }
  }
  
  const handleDeleteExecution = async (id: number) => {
      // confirm moved to button onClick for better control
      try {
          await axios.delete(`http://localhost:8000/api/strategies/executions/${id}`);
          if (selectedStrategy) fetchExecutions(selectedStrategy.id);
          if (selectedExecution?.id === id) {
              setSelectedExecution(null);
              setIsExecutionModalOpen(false);
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
    <div className="flex h-[calc(100vh-6rem)] gap-6">
      {/* Left: Strategy List & Executions */}
      <div className="w-1/3 flex flex-col gap-4">
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
                                    setIsExecutionModalOpen(true);
                                }}
                                className="p-3 rounded-lg border bg-slate-50 border-slate-200 hover:border-indigo-200 cursor-pointer flex justify-between items-center group"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <div className="text-sm font-medium text-slate-700">
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

      {/* Right Area Placeholder or Dashboard */}
      <div className="flex-1 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
          <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>请选择左侧策略并查看执行记录</p>
          </div>
      </div>

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

      {/* Execution Details Modal (Full Screen-ish) */}
      {isExecutionModalOpen && selectedExecution && (
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
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
                          <button 
                              onClick={() => setIsExecutionModalOpen(false)}
                              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                          >
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden flex">
                      {/* Left: Stock List */}
                      <div className="w-2/3 border-r border-slate-200 overflow-y-auto p-4">
                           <div className="overflow-x-auto">
                               <table className="w-full text-sm text-left">
                                   <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
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
                      
                      {/* Right: AI Analysis */}
                      <div className="w-1/3 bg-slate-50 overflow-y-auto p-6 border-l border-slate-200">
                          {selectedExecution.ai_analysis ? (
                              <div className="prose prose-indigo prose-sm max-w-none">
                                  <h4 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                                      <Zap className="w-5 h-5 text-indigo-600" />
                                      AI 分析报告
                                  </h4>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {selectedExecution.ai_analysis}
                                  </ReactMarkdown>
                              </div>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                                  <Zap className="w-12 h-12 opacity-20" />
                                  <p>暂无 AI 分析报告</p>
                                  <button 
                                      onClick={handleAnalyze}
                                      className="text-indigo-600 hover:underline text-sm"
                                  >
                                      点击生成分析
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <Modal isOpen={!!selectedStock} onClose={() => setSelectedStock(null)} title="个股详情">
        {selectedStock && <StockDetail symbol={selectedStock} />}
      </Modal>
    </div>
  );
};

export default AIStockSelection;
