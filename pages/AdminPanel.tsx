import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { UserManagement } from '../components/UserManagement';
import { RoleManagement } from '../components/RoleManagement';

interface ModelConfig {
  id: string;
  provider: string;
  name: string;
  api_key: string;
  base_url: string;
  modules: string[];
  is_active: boolean;
}

const MODULE_OPTIONS = [
  { id: 'ai_report', label: 'AI 研报' },
  { id: 'stock_selection', label: 'AI 选股' },
  { id: 'position_entry', label: '持仓录入' },
  // Reserved for future modules
  { id: 'market_analysis', label: '市场分析 (预留)' },
  { id: 'portfolio_opt', label: '组合优化 (预留)' },
];

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'models' | 'users' | 'roles'>('models');
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  // Initialize with default empty values to avoid uncontrolled input warning
  const [currentModel, setCurrentModel] = useState<ModelConfig>({
    id: '',
    provider: '',
    name: '',
    api_key: '',
    base_url: '',
    modules: [],
    is_active: true
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    if (activeTab === 'models') {
      fetchModels();
    }
  }, [user, navigate, activeTab]);

  const fetchModels = async () => {
    try {
      const response = await axios.get('/api/models');
      setModels(response.data);
    } catch (error) {
      console.error("Failed to fetch models", error);
    }
  };

  const handleSave = async (model: ModelConfig) => {
    let newModels = [...models];
    const index = newModels.findIndex(m => m.id === model.id);
    if (index >= 0) {
      newModels[index] = model;
    } else {
      newModels.push(model);
    }
    
    try {
      await axios.post('/api/models', newModels);
      setModels(newModels);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save models", error);
    }
  };

  const toggleModule = (moduleId: string) => {
    const currentModules = currentModel.modules || [];
    if (currentModules.includes(moduleId)) {
      setCurrentModel({
        ...currentModel,
        modules: currentModules.filter(m => m !== moduleId)
      });
    } else {
      setCurrentModel({
        ...currentModel,
        modules: [...currentModules, moduleId]
      });
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-indigo-500">◆</span> 系统管理后台
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('models')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              activeTab === 'models' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            模型管理
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            用户管理
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              activeTab === 'roles' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            角色管理
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            返回前台应用
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'models' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">模型配置管理</h2>
              <button
                onClick={() => {
                  setCurrentModel({
                    id: Date.now().toString(),
                    provider: 'DeepSeek',
                    name: 'deepseek-chat',
                    api_key: '',
                    base_url: 'https://api.deepseek.com/v1/chat/completions',
                    modules: ['ai_report'],
                    is_active: true
                  });
                  setIsEditing(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                添加模型
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">名称</th>
                    <th className="px-6 py-4">供应商</th>
                    <th className="px-6 py-4">应用模块</th>
                    <th className="px-6 py-4">Base URL</th>
                    <th className="px-6 py-4">状态</th>
                    <th className="px-6 py-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {models.map(model => (
                    <tr key={model.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{model.name}</td>
                      <td className="px-6 py-4 text-slate-600">{model.provider}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {model.modules && model.modules.map(m => {
                             const label = MODULE_OPTIONS.find(opt => opt.id === m)?.label || m;
                             return (
                               <span key={m} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs border border-indigo-100">
                                 {label}
                               </span>
                             );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 truncate max-w-xs" title={model.base_url}>{model.base_url}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${model.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {model.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setCurrentModel(model);
                            setIsEditing(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
           <UserManagement />
        )}

        {activeTab === 'roles' && (
           <RoleManagement />
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-slate-800 border-b pb-4">
              {models.find(m => m.id === currentModel.id) ? '编辑模型配置' : '新建模型配置'}
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">模型名称</label>
                <input
                  value={currentModel.name || ''}
                  onChange={e => setCurrentModel({...currentModel, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="例如: deepseek-chat"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">供应商</label>
                <input
                  value={currentModel.provider || ''}
                  onChange={e => setCurrentModel({...currentModel, provider: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="例如: DeepSeek"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={currentModel.api_key || ''}
                  onChange={e => setCurrentModel({...currentModel, api_key: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Base URL</label>
                <input
                  value={currentModel.base_url || ''}
                  onChange={e => setCurrentModel({...currentModel, base_url: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
                  placeholder="https://api.example.com/v1"
                />
              </div>
              
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-2">应用模块</label>
                 <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                    {MODULE_OPTIONS.map(option => (
                        <label key={option.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                    <input 
                        type="checkbox" 
                        checked={(currentModel.modules || []).includes(option.id)}
                        onChange={() => toggleModule(option.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{option.label}</span>
                </label>
                    ))}
                 </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={currentModel.is_active ?? true}
                    onChange={e => setCurrentModel({...currentModel, is_active: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700">启用该模型</span>
                </label>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleSave(currentModel)}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-colors"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
