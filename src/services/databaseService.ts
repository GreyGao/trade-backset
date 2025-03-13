import { db } from '../db';
import { Strategy, Backtest, Trade, Position } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

// 定义通用返回体接口
interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class DatabaseService {
  // 策略相关
  static async createStrategy(strategy: Omit<Strategy, 'id' | 'createTime' | 'updateTime'>): Promise<DatabaseResult<Strategy>> {
    try {
      const now = Date.now();
      const newStrategy = {
        ...strategy,
        id: uuidv4(),
        createTime: now,
        updateTime: now
      };
      const result = db.strategies.insert(newStrategy);
      if (!result) {
        return { success: false, error: '创建策略失败：数据库操作未返回结果' };
      }
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `创建策略失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // 回测相关
  static async createBacktest(backtest: Omit<Backtest, 'id' | 'createTime' | 'updateTime' | 'summary'>): Promise<DatabaseResult<Backtest>> {
    try {
      const now = Date.now();
      const newBacktest = {
        ...backtest,
        id: uuidv4(),
        createTime: now,
        updateTime: now,
        summary: {
          totalProfit: 0,
          realizedProfit: 0,
          totalTrades: 0,
          winningTrades: 0,
          maxProfit: 0,
          maxLoss: 0,
          maxDrawdown: 0,
          winRate: 0,
          profitFactor: 0,   // 盈亏比（总盈利/总亏损的比值）
          expectation: 0,   // 期望值（平均每笔交易的预期收益）
          profitRatio: 0,
          currentCash: backtest.initialCapital, // 初始现金等于初始资金
          totalAssets: backtest.initialCapital, // 初始总资产等于初始资金
        }
      };
      const result = db.backtests.insert(newBacktest);
      if (!result) {
        return { success: false, error: '创建回测失败：数据库操作未返回结果' };
      }
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `创建回测失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // 删除未使用的方法
}