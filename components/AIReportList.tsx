import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { AnalysisResult } from './AnalysisResult';
import { Modal } from './Modal';
import { AnalysisStatus, AIReport } from '../types';

interface AIReportListProps {
  reports: AIReport[];
  onDelete: (id: string) => void;
}

export const AIReportList: React.FC<AIReportListProps> = ({ reports, onDelete }) => {
  const [selectedReport, setSelectedReport] = useState<AIReport | null>(null);

  const handleDownload = (report: AIReport) => {
    const element = document.createElement('div');
    
    // Simple markdown to HTML converter for PDF generation
    let htmlContent = report.content
      // Headers
      .replace(/### (.*)/g, '<h3 style="font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: #1e293b;">$1</h3>')
      .replace(/## (.*)/g, '<h2 style="font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #0f172a;">$1</h2>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #312e81;">$1</strong>')
      // List items
      .replace(/^- (.*)/gm, '<div style="margin-left: 10px; margin-bottom: 4px;">• $1</div>')
      // Newlines to breaks (careful not to break HTML structure we just added, but basic replace works for simple cases)
      .replace(/\n/g, '<br/>');

    element.innerHTML = `<div style="padding: 40px; font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; width: 595px; background: white; color: #334155;">
      <h1 style="text-align: center; font-size: 24px; color: #312e81; margin-bottom: 20px; font-weight: bold;">AI 智能投顾报告</h1>
      <div style="color: #64748b; font-size: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 24px; display: flex; justify-content: space-between;">
        <span><strong>生成时间:</strong> ${new Date(report.timestamp).toLocaleString()}</span>
        <span>投顾助手生成</span>
      </div>
      <div style="font-size: 12px; line-height: 1.8;">${htmlContent}</div>
    </div>`;
    document.body.appendChild(element);
    
    import('html2canvas').then(html2canvas => {
      html2canvas.default(element, {
        scale: 2, // Improve quality
        useCORS: true,
        logging: false
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`AI_Report_${new Date(report.timestamp).toISOString().slice(0,10)}.pdf`);
        document.body.removeChild(element);
      });
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-800">历史研报列表</h3>
      </div>
      
      {reports.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          暂无历史研报，请点击生成 AI 研报
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">生成时间</th>
                <th className="px-6 py-3 text-center">健康度</th>
                <th className="px-6 py-3 text-center">AI 模型</th>
                <th className="px-6 py-3">概要</th>
                <th className="px-6 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map(report => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    {new Date(report.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border-2
                      ${(report.score || 0) >= 80 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 
                        (report.score || 0) >= 60 ? 'border-amber-200 bg-amber-50 text-amber-700' : 
                        'border-rose-200 bg-rose-50 text-rose-700'}`}>
                      {report.score || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-500 text-xs">
                    {report.model_name || 'Default'}
                  </td>
                  <td className="px-6 py-4 text-slate-900 max-w-xs">
                    <div className="line-clamp-2 text-sm" title={report.summary}>{report.summary}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => setSelectedReport(report)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                        title="预览"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button 
                        onClick={() => onDelete(report.id)}
                        className="text-rose-400 hover:text-rose-600"
                        title="删除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="AI 研报详情"
        maxWidth="max-w-4xl"
      >
        {selectedReport && (
          <div className="py-2">
            <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-500">
                  <span className="font-medium text-slate-700">生成时间:</span> {new Date(selectedReport.timestamp).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm">
                   <span className="font-medium text-slate-700">健康度:</span>
                   <span className={`font-bold px-2 py-0.5 rounded 
                     ${(selectedReport.score || 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : 
                       (selectedReport.score || 0) >= 60 ? 'bg-amber-100 text-amber-700' : 
                       'bg-rose-100 text-rose-700'}`}>
                     {selectedReport.score || 0}分
                   </span>
                </div>
              </div>
              <button 
                onClick={() => handleDownload(selectedReport)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                下载 PDF
              </button>
            </div>
            <AnalysisResult status={AnalysisStatus.COMPLETE} result={selectedReport.content} />
          </div>
        )}
      </Modal>
    </div>
  );
};
