import { makeAutoObservable } from 'mobx';
import { db } from '../db';
import { Backtest } from '../types/database';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseResult } from './types';
import { m } from 'react-router/dist/development/fog-of-war-CvttGpNz';

export class BacktestStore {
  backtests: Backtest[] = [];
  currentBacktest: Backtest | null = null;
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchBacktests() {
    this.loading = true;
    try {
      this.backtests = await db.backtests.find({});
    } catch (error) {
      console.error('获取回测列表失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async getBacktest(id: string): Promise<DatabaseResult<Backtest>> {
    try {
      const backtest = await db.backtests.findOne({ id });
      if (!backtest) {
        return { success: false, error: `未找到ID为${id}的回测` };
      }
      
      this.currentBacktest = backtest;
      return { success: true, data: backtest };
    } catch (error) {
      console.error('获取回测详情失败:', error);
      return { 
        success: false, 
        error: `获取回测详情失败：${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  async addBacktest(backtest: Omit<Backtest, 'id' | 'createTime' | 'summary'>): Promise<DatabaseResult<Backtest>> {
    try {
      const newBacktest = {
        ...backtest,
        id: uuidv4(),
        summary: {
          totalProfit: 0,
          realizedProfit: 0,
          totalTrades: 0,
          winningTrades: 0,
          maxProfit: 0,
          maxLoss: 0,
          maxDrawdown: 0,
          winRate: 0,
          profitFactor: 0,
          expectation: 0,
          profitRatio: 0,
        },
        createTime: new Date()
      };
      
      const id = await db.backtests.insert(newBacktest);
      if (!id) {
        return { success: false, error: '添加回测失败：数据库操作未返回ID' };
      }
      
      await this.fetchBacktests();
      return { success: true, data: newBacktest};
    } catch (error) {
      console.error('添加回测失败:', error);
      return { 
        success: false, 
        error: `添加回测失败：${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  async updateBacktest(id: string, data: Partial<Backtest>): Promise<DatabaseResult<Backtest>> {
    try {
      const existingBacktest = await db.backtests.findOne({ id });
      if (!existingBacktest) {
        return { success: false, error: `未找到ID为${id}的回测` };
      }
      
      const updatedBacktest = {
        ...existingBacktest,
        ...data,
        id,
        updateTime: new Date()
      };
      
      const result = await db.backtests.update(updatedBacktest);
      if (!result) {
        return { success: false, error: '更新回测失败：数据库操作未返回结果' };
      }
      
      if (this.currentBacktest?.id === id) {
        this.currentBacktest = updatedBacktest;
      }
      
      await this.fetchBacktests();
      return { success: true, data: updatedBacktest };
    } catch (error) {
      console.error('更新回测失败:', error);
      return { 
        success: false, 
        error: `更新回测失败：${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  // 添加删除回测的方法
    async deleteBacktest(id: string): Promise<DatabaseResult<string>> {
      try {
        const backtest = await db.backtests.findOne({ id });
        if (!backtest) {
          return { success: false, error: `未找到ID为${id}的回测` };
        }
        
        const result = await db.backtests.remove(backtest);
        if (!result) {
          return { success: false, error: '删除回测失败：数据库操作未返回结果' };
        }
        
        await this.fetchBacktests();
        return { success: true, data: id };
      } catch (error) {
        console.error('删除回测失败:', error);
        return { 
          success: false, 
          error: `删除回测失败：${error instanceof Error ? error.message : String(error)}` 
        };
      }
    }
}