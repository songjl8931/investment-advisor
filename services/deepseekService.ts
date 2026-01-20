import { Asset, MarketNews, InvestmentGoals } from "../types";
import { getMarketContext } from "./marketService";
import { calculateTechnicalIndicators } from "../utils/technicalData";
import axios from 'axios';

// DeepSeek API endpoint (proxied via local backend)
const API_URL = "/api/chat";

export interface AnalysisResult {
  content: string;
  score: number;
  summary: string;
  model_name?: string;
}

export const analyzePortfolioWithDeepSeek = async (
  assets: Asset[],
  news: MarketNews[],
  goals?: InvestmentGoals
): Promise<AnalysisResult> => {
  
  if (assets.length === 0) {
    return {
      content: "请先添加资产以获取分析报告。",
      score: 0,
      summary: "无资产数据"
    };
  }

  // Calculate total portfolio value for weighting
  const totalPortfolioValue = assets.reduce((sum, a) => sum + (a.quantity * a.currentPrice), 0);
  const totalCost = assets.reduce((sum, a) => sum + (a.quantity * a.costPrice), 0);
  const totalPnL = totalPortfolioValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost * 100).toFixed(2) : "0.00";

  // Generate asset summary with technical indicators and weights
  const assetSummary = assets.map(a => {
    const tech = calculateTechnicalIndicators(a);
    const pnlPercent = ((a.currentPrice - a.costPrice) / a.costPrice * 100).toFixed(2);
    const assetValue = a.quantity * a.currentPrice;
    const weight = totalPortfolioValue > 0 ? ((assetValue / totalPortfolioValue) * 100).toFixed(2) : "0.00";
    
    return `
- **${a.name} (${a.symbol})**
  - 基础数据: 持仓 ${a.quantity}, 成本 ${a.costPrice}, 现价 ${a.currentPrice} (盈亏: ${pnlPercent}%)
  - 仓位分析: 市值 ${assetValue.toFixed(2)}, 占总仓位权重 ${weight}%
  - 技术面: 
    - 均线趋势: ${tech.trend} (MA5=${tech.ma5.toFixed(2)}, MA20=${tech.ma20.toFixed(2)})
    - MACD: ${tech.macd.signal === 'NEUTRAL' ? '无明显信号' : tech.macd.signal} (Hist=${tech.macd.hist.toFixed(3)})
    - BOLL: ${tech.boll.position} (Upper=${tech.boll.upper.toFixed(2)}, Lower=${tech.boll.lower.toFixed(2)})
    `.trim();
  }).join('\n');

  const newsSummary = news.map(n => 
    `- ${n.title} (Source: ${n.source}): ${n.summary}`
  ).join('\n');

  const marketContext = getMarketContext();

  const goalsInfo = goals ? `
    - 盈利目标: ${goals.targetProfit}
    - 期望达成时间: ${goals.targetDate}
    - 可用追加资金: ${goals.availableCapital}
  ` : "未设置投资目标";

  const systemPrompt = "你是一位拥有20年经验的华尔街高级投资顾问。请根据用户的资产组合（包含技术面数据和仓位权重）、当前模拟的市场新闻以及市场大环境，生成一份专业的投资分析报告。风格需要专业、客观、犀利，使用金融术语但保持易读性。请使用Markdown格式输出。";

  const userPrompt = `
    **用户资产组合 (含技术指标与仓位权重):**
    ${assetSummary}
    
    **账户总体表现:**
    - 总投入成本: ${totalCost.toFixed(2)}
    - 当前总市值: ${totalPortfolioValue.toFixed(2)}
    - 当前盈亏: ${totalPnL.toFixed(2)} (${totalPnLPercent}%)

    **用户投资目标与资源:**
    ${goalsInfo}

    **近期市场新闻:**
    ${newsSummary}

    **市场宏观背景:**
    ${marketContext}

    **任务要求:**
    1. **资产健康度评分**: 给组合打分 (0-100)。
    2. **摘要理由**: 一句话点评组合健康度。
    3. **深度持仓分析**: 必须结合【仓位权重】、【技术面指标】(如均线趋势、MACD信号、BOLL位置) 和 【基本面盈亏】对主要持仓进行点评。重点关注重仓股的风险。
    4. **仓位配置建议**: 基于当前的持仓分布，评估是否过于集中或分散，并提出调整建议。
    5. **目标达成分析**: 结合【用户投资目标与资源】，评估当前组合是否能按期达成盈利目标。如果有差距，请结合【可用追加资金】给出具体的补救或加速方案。
    6. **宏观影响**: 结合新闻，解释宏观事件对该组合的具体影响。
    7. **操作建议**: 使用表格形式列出建议：| 标的 | 建议方向 (买入/卖出/持有/减仓) | 逻辑简述 |。
    
    **重要：返回格式要求**:
    请务必在回复的最开始，使用以下XML标签包裹元数据，然后才是正文内容：
    <meta>
    score: [0-100的数字]
    summary: [一句话摘要理由]
    </meta>

    正文内容(Markdown)...
  `;

  try {
    const response = await axios.post(API_URL, {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 1.0
      });

    const data = response.data;
    const rawContent = data.choices[0].message.content || "无法生成分析报告，请稍后重试。";
    const modelName = data.model || "Unknown";
    
    // Parse metadata
    let score = 60;
    let summary = "AI 分析完成";
    let content = rawContent;

    const metaMatch = rawContent.match(/<meta>([\s\S]*?)<\/meta>/);
    if (metaMatch) {
        const metaBlock = metaMatch[1];
        const scoreMatch = metaBlock.match(/score:\s*(\d+)/);
        const summaryMatch = metaBlock.match(/summary:\s*(.+)/);

        if (scoreMatch) score = parseInt(scoreMatch[1]);
        if (summaryMatch) summary = summaryMatch[1].trim();

        // Remove meta block from content
        content = rawContent.replace(/<meta>[\s\S]*?<\/meta>/, "").trim();
    }

    return { content, score, summary, model_name: modelName };

  } catch (error) {
    console.error("DeepSeek Analysis Error:", error);
    return {
        content: `AI 分析服务暂时不可用。错误详情: ${error instanceof Error ? error.message : String(error)}`,
        score: 0,
        summary: "生成失败",
        model_name: "Error"
    };
  }
};
