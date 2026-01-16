import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import WaveBackground from '../components/WaveBackground';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Use FormData to ensure we capture the latest input values
    // This solves issues where state sync lags behind browser autofill
    const formElement = e.currentTarget as HTMLFormElement;
    const formData = new FormData(formElement);
    const formUsername = formData.get('username') as string || username;
    const formPassword = formData.get('password') as string || password;
    
    try {
      if (isRegister) {
        await axios.post('http://localhost:8000/api/auth/register', {
          username: formUsername,
          password: formPassword
        });
        setSuccessMsg('注册成功，请登录');
        setIsRegister(false);
        // Don't clear username/password for convenience
      } else {
        const apiFormData = new URLSearchParams();
        apiFormData.append('username', formUsername);
        apiFormData.append('password', formPassword);

        const response = await axios.post('http://localhost:8000/api/auth/token', apiFormData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        login(response.data.access_token, rememberMe);
        navigate('/');
      }
    } catch (err: any) {
        console.error(err);
        if (isRegister) {
           setError(err.response?.data?.detail || '注册失败，用户名可能已存在');
        } else {
           if (err.code === 'ERR_NETWORK') {
              setError('无法连接服务器，请确保后台服务已启动 (python server.py)');
           } else if (err.response?.status === 401) {
             setError('用户名或密码错误');
           } else {
             setError(err.response?.data?.detail || '登录失败，请重试');
           }
        }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Wave Background */}
      <div className="absolute inset-0 z-0">
         <WaveBackground />
      </div>

      <div className="bg-slate-800/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 border border-slate-700">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
             <img src="/logo.png" alt="AlphaSight" className="h-16 w-auto object-contain" />
          </div>
          <p className="text-slate-400">{isRegister ? '创建您的投资账户' : '登录您的账户'}</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {successMsg && (
            <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 p-3 rounded-lg mb-4 text-sm">
                {successMsg}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">用户名</label>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder-slate-500 transition-all"
              placeholder="请输入用户名"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">密码</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder-slate-500 transition-all pr-12"
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                    <line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {!isRegister && (
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <div className={`w-4 h-4 border rounded transition-colors ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'border-slate-500 group-hover:border-slate-400 bg-transparent'}`}>
                    {rememberMe && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="ml-2 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">记住密码</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all font-bold shadow-lg shadow-indigo-500/30 mt-2"
          >
            {isRegister ? '立即注册' : '登录'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <button 
                onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                    setSuccessMsg('');
                }}
                className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors hover:underline"
            >
                {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
        </div>

        {!isRegister && (
             <div className="mt-8 pt-6 border-t border-slate-700 text-center text-xs text-slate-500">
                
            </div>
        )}
       
      </div>
    </div>
  );
};
