import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnalysisStatus } from '../types';

interface AnalysisResultProps {
  status: AnalysisStatus;
  result: string;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ status, result }) => {
  if (status === AnalysisStatus.IDLE) return null;

  // Remove specific header line if it exists
  const cleanResult = result
    .replace(/^# 投资组合分析报告$/gm, '')
    .trim();

  return (
    <div className="mt-8 bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          AI 智能投顾报告
        </h3>
        {status === AnalysisStatus.LOADING && (
          <div className="flex items-center gap-2 text-indigo-100 text-sm">
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            深度分析中...
          </div>
        )}
      </div>
      
      <div className="p-6 min-h-[200px]">
        {status === AnalysisStatus.LOADING ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
            <div className="h-20 bg-slate-50 rounded w-full mt-6"></div>
          </div>
        ) : (
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="hidden" {...props} />, // Hide H1 completely
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b pb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-4 text-slate-700" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-4 text-slate-700" {...props} />,
                li: ({node, ...props}) => <li className="ml-4" {...props} />,
                p: ({node, ...props}) => <p className="mb-3 text-slate-700 leading-relaxed" {...props} />,
                strong: ({node, ...props}) => <strong className="text-indigo-900 font-bold" {...props} />,
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-slate-200" {...props} />,
                tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider" {...props} />,
                td: ({node, ...props}) => {
                  // Helper to safely extract text content from children (which might be React elements)
                  const getText = (children: React.ReactNode): string => {
                    if (!children) return '';
                    if (typeof children === 'string') return children;
                    if (typeof children === 'number') return String(children);
                    if (Array.isArray(children)) return children.map(getText).join('');
                    if (typeof children === 'object' && 'props' in children && (children as any).props) {
                      return getText((children as any).props.children);
                    }
                    return '';
                  };

                  const content = getText(props.children).trim();
                  let colorClass = "text-slate-700";
                  
                  // Apply color coding based on keywords
                  // We check length < 20 to ensure we are targeting the "Direction" column 
                  // and not highlighting random words in the description.
                  if (content.length < 20) {
                    if (content.includes("加仓") || content.includes("增持") || content.includes("买入")) {
                      colorClass = "text-emerald-600 font-bold"; // Green for Buy/Add
                    } else if (content.includes("卖出") || content.includes("清仓")) {
                      colorClass = "text-rose-600 font-bold"; // Red for Sell
                    } else if (content.includes("减仓") || content.includes("减持")) {
                      colorClass = "text-orange-500 font-bold"; // Orange for Reduce
                    } else if (content.includes("持有") || content.includes("观望")) {
                      colorClass = "text-slate-600 font-bold"; // Dark Gray for Hold
                    }
                  }
                  
                  return <td className={`px-6 py-4 whitespace-normal text-sm ${colorClass}`} {...props} />;
                },
              }}
            >
              {cleanResult}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
