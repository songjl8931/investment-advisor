import { MarketNews } from './types';

// Simulated market news (In a real app, this would come from an API like Akshare/NewsAPI)
export const MOCK_MARKET_NEWS: MarketNews[] = [
  {
    id: '1',
    title: 'Fed Signals Potential Rate Cut in Q3',
    summary: 'Federal Reserve officials hinted at a possible interest rate reduction if inflation data continues to cool, sparking a rally in tech stocks.',
    source: 'Global Finance',
    timestamp: '2023-10-27T10:00:00Z',
    url: 'https://example.com/news/1'
  },
  {
    id: '2',
    title: 'Semiconductor Sector Faces Supply Chain Snags',
    summary: 'Major chip manufacturers report delays in raw material shipments, potentially impacting Q4 earnings guidance.',
    source: 'Tech Daily',
    timestamp: '2023-10-27T09:30:00Z',
    url: 'https://example.com/news/2'
  },
  {
    id: '3',
    title: 'Green Energy Subsidies Renewed',
    summary: 'Government announces extension of tax credits for solar and wind energy projects for another 5 years.',
    source: 'Eco Markets',
    timestamp: '2023-10-26T14:15:00Z',
    url: 'https://example.com/news/3'
  }
];

export const ASSET_TYPES = [
  { value: 'STOCK', label: '股票 (Stock)' },
  { value: 'FUND', label: '基金 (Fund)' },
  { value: 'CRYPTO', label: '加密货币 (Crypto)' },
  { value: 'CASH', label: '现金/存款 (Cash)' },
];
