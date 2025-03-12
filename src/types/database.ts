export interface Strategy {
  id: string;                // 策略ID
  name: string;              // 策略名称
  description: string;       // 策略描述
  rules: string[];           // 策略规则列表
  createTime: number;          // 创建时间
  updateTime: number;          // 更新时间
}

export interface Backtest {
  id: string;                // 回测ID
  name: string;              // 回测名称
  strategyId: string;        // 关联的策略ID
  strategyName: string;      // 策略名称
  startDate: number;           // 回测开始日期
  endDate?: number;            // 回测结束日期（可选）
  initialCapital: number;    // 初始资金
  currentCapital: number;    // 当前资金
  status: 'active' | 'completed' | 'archived';  // 回测状态：进行中、已完成、已归档
  summary: {
    totalProfit: number;     // 总盈亏
    realizedProfit: number;  // 已实现盈亏
    totalTrades: number;     // 总交易次数
    winningTrades: number;   // 盈利交易次数
    maxProfit: number;       // 最大单笔盈利
    maxLoss: number;         // 最大单笔亏损
    maxDrawdown: number;     // 最大回撤
    winRate: number;         // 胜率
    profitFactor: number;    // 盈亏比（总盈利/总亏损的比值）
    expectation: number;     // 期望值（平均每笔交易的预期收益）
    profitRatio: number;     // 收益比例（总收益/初始资金）
  };
  notes: string;             // 备注
  createTime: number;          // 创建时间
  updateTime: number;          // 更新时间
}

export interface Trade {
  id: string;                // 交易ID
  backtestId: string;        // 关联的回测ID
  stockCode: string;         // 股票代码
  stockName: string;         // 股票名称
  type: 'BUY' | 'SELL';      // 交易类型：买入或卖出
  price: number;             // 交易价格
  quantity: number;          // 交易数量
  amount: number;            // 交易金额
  timestamp: number;         // 交易时间戳
  reason: string;            // 交易原因
  profit: number;            // 交易盈亏（卖出时有效）
  notes?: string;            // 交易备注（可选）
  fee?: number;              // 交易费用（可选）
}

export interface Position {
  id: string;                // 持仓ID
  backtestId: string;        // 关联的回测ID
  stockCode: string;         // 股票代码
  stockName: string;         // 股票名称
  quantity: number;          // 持仓数量
  avgCost: number;           // 平均成本
  marketPrice: number;       // 市场价格
  profit: number;            // 持仓盈亏
  updateTime: number;          // 更新时间
}

export interface Stock {
  id: string;                // 股票ID
  code: string;              // 股票代码
  name: string;              // 股票名称
  // 其他股票相关字段
}

// 从 index.ts 添加的接口
export interface Portfolio {
  id: string;                // 投资组合ID
  backtestId: string;        // 关联的回测ID
  initialBalance: number;    // 初始资金
  currentBalance: number;    // 当前资金
  profitRatio: number;       // 收益率
  positions: Position[];     // 持仓列表
}