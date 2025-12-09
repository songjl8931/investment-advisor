import React from 'react';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

// Static roles definition since backend uses simple string roles
const STATIC_ROLES: Role[] = [
  {
    id: 'admin',
    name: '管理员 (Admin)',
    description: '拥有系统所有权限，包括用户管理、模型配置、角色管理等。',
    permissions: ['manage_users', 'manage_roles', 'manage_models', 'view_all_data']
  },
  {
    id: 'user',
    name: '普通用户 (User)',
    description: '仅拥有基础权限，可以管理个人资产、查看研报、使用AI投顾功能。',
    permissions: ['manage_own_assets', 'view_market_data', 'use_ai_advisor']
  }
];

export const RoleManagement: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">角色与权限管理</h2>
        <div className="text-sm text-slate-500 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-lg">
          <span className="font-bold mr-1">Note:</span> 当前版本使用静态角色系统，暂不支持动态添加新角色。
        </div>
      </div>

      <div className="grid gap-6">
        {STATIC_ROLES.map(role => (
          <div key={role.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${role.id === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                <h3 className="text-lg font-bold text-slate-800">{role.name}</h3>
                <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{role.id}</span>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">{role.description}</p>
              
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">包含权限</h4>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map(perm => (
                  <span key={perm} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm border border-slate-200">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
