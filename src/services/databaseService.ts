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
      const now = new Date();
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
      const now = new Date();
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

  // 交易相关
  static async addTrade(trade: Omit<Trade, 'id'>): Promise<DatabaseResult<Trade>> {
    try {
      const newTrade = {
        ...trade,
        id: uuidv4()
      };
      const result = db.trades.insert(newTrade);
      if (!result) {
        return { success: false, error: '添加交易记录失败：数据库操作未返回结果' };
      }

      // 更新持仓
      const positionResult = await this.updatePosition(trade);
      if (!positionResult.success) {
        return { success: false, error: `添加交易记录成功但更新持仓失败：${positionResult.error}` };
      }

      // 更新回测汇总数据
      const summaryResult = await this.updateBacktestSummary(trade.backtestId);
      if (!summaryResult.success) {
        return { success: false, error: `添加交易记录成功但更新回测汇总失败：${summaryResult.error}` };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `添加交易记录失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // 持仓相关
  private static async updatePosition(trade: Omit<Trade, 'id'>): Promise<DatabaseResult<void>> {
    try {
      let position: Position | null = db.positions.findOne({
        backtestId: trade.backtestId,
        stockCode: trade.stockCode
      });

      if (trade.type === 'BUY') {
        if (!position) {
          position = {
            id: uuidv4(),
            backtestId: trade.backtestId,
            stockCode: trade.stockCode,
            stockName: trade.stockName,
            quantity: trade.quantity,
            avgCost: trade.price,
            marketPrice: trade.price,
            profit: 0,
            updateTime: new Date()
          };
          const insertResult = db.positions.insert(position);
          if (!insertResult) {
            return { success: false, error: '创建新持仓失败' };
          }
        } else {
          const totalCost = position.avgCost * position.quantity + trade.price * trade.quantity;
          const newQuantity = position.quantity + trade.quantity;
          const updatedPosition = {
            ...position,
            avgCost: totalCost / newQuantity,
            quantity: newQuantity,
            updateTime: new Date()
          };
          const updateResult = db.positions.update(updatedPosition);
          if (!updateResult) {
            return { success: false, error: '更新持仓失败' };
          }
        }
      } else if (trade.type === 'SELL' && position) {
        const newQuantity = position.quantity - trade.quantity;
        if (newQuantity <= 0) {
          const removeResult = db.positions.remove(position);
          if (!removeResult) {
            return { success: false, error: '删除持仓失败' };
          }
        } else {
          const updatedPosition = {
            ...position,
            quantity: newQuantity,
            updateTime: new Date()
          };
          const updateResult = db.positions.update(updatedPosition);
          if (!updateResult) {
            return { success: false, error: '更新持仓失败' };
          }
        }
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `更新持仓失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private static async updateBacktestSummary(backtestId: string): Promise<DatabaseResult<void>> {
    try {
      const backtest = db.backtests.findOne({ id: backtestId });
      if (!backtest) {
        return { success: false, error: `未找到ID为${backtestId}的回测记录` };
      }

      const trades = db.trades.find({ backtestId });

      // 计算总盈利和总亏损
      const profits = trades.filter(t => (t.profit || 0) > 0).reduce((sum, t) => sum + (t.profit || 0), 0);
      const losses = Math.abs(trades.filter(t => (t.profit || 0) < 0).reduce((sum, t) => sum + (t.profit || 0), 0));

      const summary = {
        totalProfit: trades.reduce((sum, t) => sum + (t.profit || 0), 0),
        realizedProfit: trades.filter(t => t.type === 'SELL')
          .reduce((sum, t) => sum + (t.profit || 0), 0),
        totalTrades: trades.length,
        winningTrades: trades.filter(t => (t.profit || 0) > 0).length,
        maxProfit: trades.length > 0 ? Math.max(0, ...trades.map(t => t.profit || 0)) : 0,
        maxLoss: trades.length > 0 ? Math.min(0, ...trades.map(t => t.profit || 0)) : 0,
        maxDrawdown: this.calculateMaxDrawdown(trades),
        winRate: 0,
        profitFactor: 0,
        expectation: 0,
        profitRatio: 0,
      };

      // 计算胜率
      summary.winRate = summary.totalTrades > 0 ?
        summary.winningTrades / summary.totalTrades : 0;

      // 计算盈亏比（总盈利/总亏损）
      summary.profitFactor = losses > 0 ? profits / losses : profits > 0 ? Infinity : 0;

      // 计算期望值（平均每笔交易的预期收益）
      summary.expectation = summary.totalTrades > 0 ? summary.totalProfit / summary.totalTrades : 0;

      // 计算收益率（总收益/初始资金）
      summary.profitRatio = backtest.initialCapital > 0 ? 
        summary.totalProfit / backtest.initialCapital : 0;

      const updatedBacktest = {
        ...backtest,
        summary,
        updateTime: new Date()
      };

      const updateResult = db.backtests.update(updatedBacktest);
      if (!updateResult) {
        return { success: false, error: '更新回测汇总数据失败' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `更新回测汇总数据失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private static calculateMaxDrawdown(trades: Trade[]): number {
    if (trades.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let currentValue = 0;

    trades.forEach(trade => {
      currentValue += trade.profit || 0;
      peak = Math.max(peak, currentValue);
      maxDrawdown = Math.max(maxDrawdown, peak - currentValue);
    });

    return maxDrawdown;
  }
}