import { makeAutoObservable } from 'mobx';
import { db } from '../db';
import { Position, Trade } from '../types/database';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseResult } from './types';

export class PositionStore {
  positions: Position[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchPositionsByBacktest(backtestId: string) {
    this.loading = true;
    try {
      this.positions = await db.positions.find({ backtestId });
    } catch (error) {
      console.error('获取持仓信息失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async updatePositions(backtestId: string, transaction: Trade): Promise<DatabaseResult<void>> {
    try {
      if (transaction.type === 'BUY') {
        const existingPosition = await db.positions
          .findOne({ backtestId, stockCode: transaction.stockCode });
        
        if (existingPosition) {
          const totalShares = existingPosition.quantity + transaction.quantity;
          const totalCost = existingPosition.avgCost * existingPosition.quantity + 
                           transaction.price * transaction.quantity + (transaction.fee || 0);
          
          const updatedPosition = {
            ...existingPosition,
            quantity: totalShares,
            avgCost: Number(totalCost / totalShares), // 确保是浮点数
            marketPrice: Number(transaction.price), // 更新市场价格
            updateTime: Date.now()
          };
          
          const result = await db.positions.update(updatedPosition);
          if (!result) {
            return { success: false, error: '更新持仓失败：数据库操作未返回结果' };
          }
        } else {
          const avgCost = Number((transaction.price * transaction.quantity + (transaction.fee || 0)) / transaction.quantity);
          
          const newPosition = {
            id: uuidv4(),
            backtestId,
            stockCode: transaction.stockCode,
            stockName: transaction.stockName,
            quantity: transaction.quantity,
            avgCost, // 包含手续费的平均成本
            marketPrice: Number(transaction.price),
            profit: 0,
            updateTime: Date.now()
          };
          
          const result = await db.positions.insert(newPosition);
          if (!result) {
            return { success: false, error: '创建持仓失败：数据库操作未返回结果' };
          }
        }
      } else if (transaction.type === 'SELL') {
        const existingPosition = await db.positions
          .findOne({ backtestId, stockCode: transaction.stockCode });
        
        if (existingPosition) {
          const remainingShares = existingPosition.quantity - transaction.quantity;
          
          // 计算卖出的盈亏
          const profit = (transaction.price - existingPosition.avgCost) * transaction.quantity - (transaction.fee || 0);
          
          // 更新交易记录中的盈亏
          const updatedTrade = {
            ...transaction,
            profit: Number(profit)
          };
          await db.trades.update(updatedTrade);
          
          if (remainingShares <= 0) {
            const result = await db.positions.remove(existingPosition);
            if (!result) {
              return { success: false, error: '删除持仓失败：数据库操作未返回结果' };
            }
          } else {
            const updatedPosition = {
              ...existingPosition,
              quantity: remainingShares,
              marketPrice: Number(transaction.price), // 更新市场价格
              updateTime: Date.now()
            };
            
            const result = await db.positions.update(updatedPosition);
            if (!result) {
              let error = new Error('找不到对应持仓信息')
              console.error('更新持仓失败:', error);
              return {
                success: false,
                error: `更新持仓失败：${error instanceof Error ? error.message : String(error)}`
              };
            }
          }
        }
      }
      
      await this.fetchPositionsByBacktest(backtestId);
      return { success: true };
    } catch (error) {
      console.error('更新持仓失败:', error);
      return {
        success: false,
        error: `更新持仓失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  // 更新持仓的市场价格
  async updatePositionMarketPrice(backtestId: string, stockCode: string, marketPrice: number): Promise<DatabaseResult<Position>> {
    try {
      const position = await db.positions.findOne({ backtestId, stockCode });
      if (!position) {
        return { success: false, error: `未找到持仓记录：${stockCode}` };
      }
      
      const profit = (marketPrice - position.avgCost) * position.quantity;
      const updatedPosition = {
        ...position,
        marketPrice,
        profit,
        updateTime: Date.now()
      };
      
      const result = await db.positions.update(updatedPosition);
      if (!result) {
        return { success: false, error: '更新持仓市场价格失败：数据库操作未返回结果' };
      }
      
      await this.fetchPositionsByBacktest(backtestId);
      return { success: true, data: updatedPosition };
    } catch (error) {
      console.error('更新持仓市场价格失败:', error);
      return {
        success: false,
        error: `更新持仓市场价格失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  // 获取单个持仓详情
  async getPosition(backtestId: string, stockCode: string): Promise<DatabaseResult<Position>> {
    try {
      const position = await db.positions.findOne({ backtestId, stockCode });
      if (!position) {
        return { success: false, error: `未找到持仓记录：${stockCode}` };
      }
      
      return { success: true, data: position };
    } catch (error) {
      console.error('获取持仓详情失败:', error);
      return {
        success: false,
        error: `获取持仓详情失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  // 根据交易记录重新计算持仓
  async recalculatePositions(backtestId: string, transactions: Trade[]): Promise<DatabaseResult<void>> {
    try {
      // 先删除该回测的所有持仓
      const existingPositions = await db.positions.find({ backtestId });
      for (const position of existingPositions) {
        await db.positions.remove(position);
      }
      
      // 按时间顺序排序交易
      const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
      
      // 重新计算持仓
      const positions: Record<string, {
        quantity: number;
        totalCost: number;
        lastPrice: number;
        stockName: string;
      }> = {};
      
      for (const transaction of sortedTransactions) {
        const { stockCode, stockName, type, quantity, price, fee = 0 } = transaction;
        
        if (type === 'BUY') {
          if (!positions[stockCode]) {
            positions[stockCode] = {
              quantity: 0,
              totalCost: 0,
              lastPrice: price,
              stockName
            };
          }
          
          positions[stockCode].quantity += quantity;
          positions[stockCode].totalCost += (price * quantity) + fee;
          positions[stockCode].lastPrice = price;
        } else if (type === 'SELL') {
          if (positions[stockCode]) {
            positions[stockCode].quantity -= quantity;
            
            // 如果卖光了，计算成本比例
            if (positions[stockCode].quantity > 0) {
              // 按比例减少成本
              const sellRatio = quantity / (positions[stockCode].quantity + quantity);
              positions[stockCode].totalCost *= (1 - sellRatio);
            } else {
              // 卖光了或卖多了，清空持仓
              delete positions[stockCode];
            }
          }
        }
      }
      
      // 创建新的持仓记录
      for (const stockCode in positions) {
        const pos = positions[stockCode];
        if (pos.quantity > 0) {
          const avgCost = Number(pos.totalCost / pos.quantity);
          const marketPrice = Number(pos.lastPrice);
          const profit = Number((marketPrice - avgCost) * pos.quantity);
          
          const newPosition = {
            id: uuidv4(),
            backtestId,
            stockCode,
            stockName: pos.stockName,
            quantity: pos.quantity,
            avgCost,
            marketPrice,
            profit,
            updateTime: Date.now()
          };
          
          await db.positions.insert(newPosition);
        }
      }
      
      await this.fetchPositionsByBacktest(backtestId);
      return { success: true };
    } catch (error) {
      console.error('重新计算持仓失败:', error);
      return {
        success: false,
        error: `重新计算持仓失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}