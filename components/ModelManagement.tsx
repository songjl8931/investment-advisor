import React, { useState, useEffect } from 'react';
import { ModelConfig } from '../types';
import { fetchModels, saveModels } from '../services/modelService';

interface ModelManagementProps {
  onClose: () => void;
}

const MODULE_OPTIONS = [
  { value: 'ai_report', label: 'AI 研报' },
  { value: 'position_entry', label: '持仓录入' },
  // { value: 'market_analysis', label: '市场分析' },
];

export const ModelManagement: React.FC<ModelManagementProps> = ({ onClose }) => {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);

  // Form state
  // Initialize with safe default values to avoid uncontrolled input warning
  const [formData, setFormData] = useState<Partial<ModelConfig>>({
    provider: '',
    name: '',
    api_key: '',
    base_url: '',
    modules: []
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const data = await fetchModels();
      setModels(data);
    } catch (error) {
      console.error("Failed to load models", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (model: ModelConfig) => {
    setEditingModel(model);
    setFormData({ ...model });
  };

  const handleAdd = () => {
    setEditingModel({
      id: '', // placeholder
      provider: '',
      name: '',
      api_key: '',
      base_url: '',
      modules: [],
      is_active: true
    });
    setFormData({
      provider: '',
      name: '',
      api_key: '',
      base_url: '',
      modules: []
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该模型配置吗？')) return;
    
    const newModels = models.filter(m => m.id !== id);
    try {
      await saveModels(newModels);
      setModels(newModels);
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.provider || !formData.name || !formData.api_key) return;

    setIsSaving(true);
    try {
      const newModel: ModelConfig = {
        id: editingModel?.id || Date.now().toString(),
        provider: formData.provider || '',
        name: formData.name || '',
        api_key: formData.api_key || '',
        base_url: formData.base_url || '',
        modules: formData.modules || []
      };

      let newModels;
      if (editingModel?.id) {
        newModels = models.map(m => m.id === editingModel.id ? newModel : m);
      } else {
        newModels = [...models, newModel];
      }

      await saveModels(newModels);
      setModels(newModels);
      setEditingModel(null);
    } catch (error) {
      console.error("Failed to save", error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModule = (moduleValue: string) => {
    const currentModules = formData.modules || [];
    if (currentModules.includes(moduleValue)) {
      setFormData({ ...formData, modules: currentModules.filter(m => m !== moduleValue) });
    } else {
      setFormData({ ...formData, modules: [...currentModules, moduleValue] });
    }
  };

  if (isLoading) return <div className="p-8 text-center">加载中...</div>;

  if (editingModel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">{editingModel.id ? '编辑模型' : '新增模型'}</h3>
          <button onClick={() => setEditingModel(null)} className="text-slate-500 hover:text-slate-700">
            返回列表
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Hidden inputs to trick browser autofill */}
          <input type="text" style={{ display: 'none' }} />
          <input type="password" style={{ display: 'none' }} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">服务商 (Provider)</label>
            <input
              type="text"
              name="provider_field_no_autofill"
              autoComplete="off"
              value={formData.provider}
              onChange={e => setFormData({ ...formData, provider: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder=""
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">模型名称 (Model Name)</label>
            <input
              type="text"
              name="model_name_field_no_autofill"
              autoComplete="off"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input
              type="password"
              name="api_key_field_new"
              autoComplete="new-password"
              value={formData.api_key}
              onChange={e => setFormData({ ...formData, api_key: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Base URL</label>
            <input
              type="text"
              name="base_url_field_no_autofill"
              autoComplete="off"
              value={formData.base_url}
              onChange={e => setFormData({ ...formData, base_url: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">应用模块</label>
            <div className="flex gap-4">
              {MODULE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.modules?.includes(opt.value)}
                    onChange={() => toggleModule(opt.value)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">选择该模型将用于哪些功能模块</p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingModel(null)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 text-sm">配置 AI 模型接口信息</p>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          新增模型
        </button>
      </div>

      <div className="space-y-4">
        {models.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            暂无模型配置
          </div>
        ) : models.map(model => (
          <div key={model.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors bg-slate-50/50">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{model.provider}</h4>
                  <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">{model.name}</span>
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {model.modules.map(m => {
                    const label = MODULE_OPTIONS.find(opt => opt.value === m)?.label || m;
                    return (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded border border-indigo-200">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(model)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="编辑"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button
                  onClick={() => handleDelete(model.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400 truncate font-mono">
              {model.base_url}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
