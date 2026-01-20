import React, { ReactNode } from 'react';
import ParticleBackground from './ParticleBackground';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  onOpenSettings?: () => void;
  onNavigate?: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenSettings, onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <ParticleBackground />
      <nav className="sticky top-0 z-50 bg-black backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <img src="/logo.png" alt="AlphaSight" className="h-12 w-auto object-contain" />
            </div>
            <div className="hidden md:flex space-x-8 text-sm font-medium text-white">
              <button onClick={() => onNavigate?.('dashboard')} className="hover:text-[#25b956] transition-colors">仪表盘</button>
              <button onClick={() => onNavigate?.('macro_data')} className="hover:text-[#25b956] transition-colors">宏观数据</button>
              <button onClick={() => onNavigate?.('ai_report')} className="hover:text-[#25b956] transition-colors">AI 研报</button>
              <button onClick={() => onNavigate?.('stock_selection')} className="hover:text-[#25b956] transition-colors">AI 选股</button>
              {user?.role === 'admin' && (
                <button onClick={() => navigate('/admin')} className="hover:text-[#25b956] transition-colors">后台管理</button>
              )}
            </div>
            <div className="flex items-center gap-4">
               {user && (
                 <div className="text-white text-sm flex items-center gap-4">
                    <span>{user.username} ({user.role === 'admin' ? '管理员' : '用户'})</span>
                    <button 
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      className="text-xs text-slate-400 hover:text-white border border-slate-700 px-2 py-1 rounded-full transition-colors"
                    >
                      退出
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </nav>
      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 h-[calc(100vh-4rem)] flex flex-col">
        {children}
      </main>
    </div>
  );
};
