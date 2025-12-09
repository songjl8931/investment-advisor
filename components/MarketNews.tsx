import React, { useEffect, useState, useRef } from 'react';
import { MarketNews as MarketNewsType } from '../types';
import { fetchMarketNews } from '../services/marketService';
import { MOCK_MARKET_NEWS } from '../constants';

interface MarketNewsProps {
  initialNews?: MarketNewsType[];
  onNewsUpdate?: (news: MarketNewsType[]) => void;
}

export const MarketNews: React.FC<MarketNewsProps> = ({ initialNews = [], onNewsUpdate }) => {
  const [news, setNews] = useState<MarketNewsType[]>(initialNews);
  const [showAll, setShowAll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch news every 30 minutes
  useEffect(() => {
    const loadNews = async () => {
      try {
        const latestNews = await fetchMarketNews(20);
        if (latestNews.length > 0) {
          setNews(latestNews);
          if (onNewsUpdate) {
            onNewsUpdate(latestNews);
          }
        }
      } catch (error) {
        console.error("Failed to auto-update news", error);
      }
    };

    // Initial load if empty (though likely passed from props)
    if (news.length === 0) {
      loadNews();
    }

    const intervalId = setInterval(loadNews, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(intervalId);
  }, []);

  // Use mock data if real data is empty
  const displayNews = news.length > 0 ? news : MOCK_MARKET_NEWS;
  // For seamless marquee, we duplicate the list
  const marqueeNews = [...displayNews, ...displayNews];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-slate-800">市场快讯</h3>
        <button 
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {showAll ? '滚动播放' : '查看更多'}
        </button>
      </div>

      <div 
        className="flex-1 overflow-hidden relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showAll ? (
          <div className="h-full overflow-y-auto pr-2 space-y-4">
            {displayNews.map((item, index) => (
              <NewsItem key={`${item.id}-${index}`} news={item} />
            ))}
          </div>
        ) : (
          <div 
            className="absolute w-full"
            style={{
              animation: `marquee 40s linear infinite`,
              animationPlayState: isHovered ? 'paused' : 'running'
            }}
          >
            <style>{`
              @keyframes marquee {
                0% { transform: translateY(0); }
                100% { transform: translateY(-50%); }
              }
            `}</style>
            <div className="space-y-4 pb-4">
              {marqueeNews.map((item, index) => (
                <NewsItem key={`${item.id}-${index}-marquee`} news={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NewsItem: React.FC<{ news: MarketNewsType }> = ({ news }) => (
  <div className="border-l-4 border-indigo-100 pl-3 py-1 hover:bg-slate-50 transition-colors rounded-r">
    <a 
      href={news.url || '#'} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-sm font-medium text-slate-900 line-clamp-2 hover:text-indigo-600"
    >
      {news.title}
    </a>
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
        {news.source}
      </span>
      <span className="text-xs text-slate-400">
        {news.timestamp.length > 10 ? news.timestamp.substring(5, 16) : news.timestamp}
      </span>
    </div>
  </div>
);
