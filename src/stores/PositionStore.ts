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
                           transaction.price * transaction.quantity;
          
          const updatedPosition = {
            ...existingPosition,
            quantity: totalShares,
            avgCost: totalCost / totalShares,
            updateTime: new Date()
          };
          
          const result = await db.positions.update(updatedPosition);
          if (!result) {
            return { success: false, error: '更新持仓失败：数据库操作未返回结果' };
          }
        } else {
          const newPosition = {
            id: uuidv4(),
            backtestId,
            stockCode: transaction.stockCode,
            stockName: transaction.stockName,
            quantity: transaction.quantity,
            avgCost: transaction.price,
            marketPrice: transaction.price,
            profit: 0,
            updateTime: new Date()
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
          
          if (remainingShares <= 0) {
            const result = await db.positions.remove(existingPosition);
            if (!result) {
              return { success: false, error: '删除持仓失败：数据库操作未返回结果' };
            }
          } else {
            const updatedPosition = {
              ...existingPosition,
              quantity: remainingShares,
              updateTime: new Date()
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
        updateTime: new Date()
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
}