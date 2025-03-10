// 策略模型
export interface Strategy {
  id: string;
  name: string;
  description: string;
  createTime: Date;
  updateTime: Date;
}

// 回测结果
export interface BacktestResult {
  id: string;
  strategyId: string;
  startDate: Date;
  endDate: Date;
  transactions: number;
  winRate: number;
  profitRatio: number;
  expectation: number;
  maxDrawdown: number;
  initialBalance: number;
  finalBalance: number;
}

// 交易记录
interface Transaction {
  id: string;
  backtestId: string;
  stockCode: string;
  stockName: string;
  price: number;
  shares: number;
  fee: number;
  amount: number;
  type: 'BUY' | 'SELL';
  timestamp: Date;
}

// 持仓信息
interface Position {
  stockCode: string;
  stockName: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  profit: number;
}

// 仓位管理
interface Portfolio {
  id: string;
  backtestId: string;
  initialBalance: number;
  currentBalance: number;
  profitRatio: number;
  positions: Position[];
}