import Dexie, { Table } from 'dexie';

export interface IStrategy {
  id?: number;
  name: string;
  description: string;
  createTime: Date;
}

export interface IBacktest {
  id?: number;
  name: string;
  strategyId: number;
  strategyName: string;
  initialBalance: number;
  currentBalance: number;
  profitRatio: number;     // 收益比例
  winRate: number;         // 正确率
  profitFactor: number;    // 盈亏比
  expectation: number;     // 期望值
  maxDrawdown: number;     // 最大回撤
  transactionCount: number; // 交易次数
  createTime: Date;
  status: 'active' | 'completed';
}

export interface ITransaction {
  id?: number;
  backtestId: number;
  stockCode: string;
  stockName: string;
  type: 'BUY' | 'SELL';
  price: number;
  shares: number;
  fee: number;
  amount: number;
  datetime: Date;
  profit?: number;         // 卖出时的盈亏金额
  isWin?: boolean;         // 是否盈利
}

export interface IPosition {
  id?: number;
  backtestId: number;
  stockCode: string;
  stockName: string;
  shares: number;
  averageCost: number;
  currentPrice?: number;
  marketValue?: number;
  profit?: number;
  profitRatio?: number;
}

export interface IStock {
  id?: number;
  code: string;
  name: string;
  note?: string;
}

class TradeDatabase extends Dexie {
  strategies!: Table<IStrategy>;
  backtests!: Table<IBacktest>;
  transactions!: Table<ITransaction>;
  positions!: Table<IPosition>;
  stocks!: Table<IStock>;

  constructor() {
    super('TradeDatabase');
    this.version(1).stores({
      strategies: '++id, name',
      backtests: '++id, strategyId, status',
      transactions: '++id, backtestId, type',
      positions: '++id, backtestId, stockCode',
      stocks: '++id, code'
    });
  }
}

export const db = new TradeDatabase();