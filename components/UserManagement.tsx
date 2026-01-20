import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post('/api/admin/users', {
        username: currentUser.username,
        password: password,
        role: currentUser.role || 'user',
        is_active: true
      });
      fetchUsers();
      setIsCreating(false);
      setCurrentUser({});
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建用户失败');
    }
  };

  const handleUpdate = async () => {
    if (!currentUser.id) return;
    try {
      const payload: any = {
        role: currentUser.role,
        is_active: currentUser.is_active
      };
      if (password) {
        payload.password = password;
      }
      
      await axios.put(`/api/admin/users/${currentUser.id}`, payload);
      fetchUsers();
      setIsEditing(false);
      setCurrentUser({});
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || '更新用户失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除该用户吗？此操作不可恢复。')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || '删除失败');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">用户管理</h2>
        <button
          onClick={() => {
            setIsCreating(true);
            setCurrentUser({ role: 'user' });
            setError('');
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          新建用户
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">用户名</th>
              <th className="px-6 py-4">角色</th>
              <th className="px-6 py-4">状态</th>
              <th className="px-6 py-4">注册时间</th>
              <th className="px-6 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-500">#{user.id}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === 'admin' ? '管理员' : '普通用户'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {user.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setCurrentUser(user);
                        setIsEditing(true);
                        setPassword('');
                        setError('');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-rose-500 hover:text-rose-700 font-medium"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-slate-800 border-b pb-4">
              {isCreating ? '新建用户' : '编辑用户'}
            </h3>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">用户名</label>
                <input
                  value={currentUser.username || ''}
                  onChange={e => setCurrentUser({...currentUser, username: e.target.value})}
                  disabled={!isCreating}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {isCreating ? '密码' : '重置密码 (留空则不修改)'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">角色</label>
                <select
                  value={currentUser.role || 'user'}
                  onChange={e => setCurrentUser({...currentUser, role: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              {!isCreating && (
                 <div className="flex items-center gap-2 pt-2">
                   <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                       <input
                         type="checkbox"
                         name="toggle_active"
                         id="toggle_active"
                         checked={currentUser.is_active}
                         onChange={e => setCurrentUser({...currentUser, is_active: e.target.checked})}
                         className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                         style={{ right: currentUser.is_active ? '0' : 'auto', left: currentUser.is_active ? 'auto' : '0', borderColor: currentUser.is_active ? '#10B981' : '#CBD5E1' }}
                       />
                       <label htmlFor="toggle_active" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${currentUser.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                   </div>
                   <label htmlFor="toggle_active" className="text-sm font-medium text-slate-700">账户启用状态</label>
                 </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={isCreating ? handleCreate : handleUpdate}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
