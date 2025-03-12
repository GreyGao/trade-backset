import { makeAutoObservable } from 'mobx';
import { db } from '../db';
import { Trade } from '../types/database';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseResult } from './types';
import { BacktestStore } from './BacktestStore';

export class TransactionStore {
  transactions: Trade[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchTransactionsByBacktest(backtestId: string) {
    this.loading = true;
    try {
      this.transactions = await db.trades
        .find({ backtestId })
        .sort((a, b) => a.timestamp > b.timestamp ? 1 : 0);
    } catch (error) {
      console.error('获取交易记录失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async addTransaction(transaction: Omit<Trade, 'id'>, backtestStore: BacktestStore): Promise<DatabaseResult<Trade>> {
    try {
      const newTransaction = {
        ...transaction,
        id: uuidv4()
      };
      
      const id = await db.trades.insert(newTransaction);
      if (!id) {
        return { success: false, error: '添加交易记录失败：数据库操作未返回ID' };
      }
      
      if (transaction.backtestId && backtestStore.currentBacktest) {
        const backtest = backtestStore.currentBacktest;
        const allTransactions = await db.trades
          .find({ backtestId: transaction.backtestId });
        
        // 计算新的统计数据
        const winTrades = allTransactions.filter(t => t.profit > 0).length;
        const totalTrades = allTransactions.length;
        const winRate = totalTrades > 0 ? winTrades / totalTrades : 0;
        
        // 更新回测数据
        const updateResult = await backtestStore.updateBacktest(transaction.backtestId, {
          currentCapital: backtest.currentCapital + (transaction.type === 'SELL' ? transaction.amount : -transaction.amount),
          summary: {
            ...backtest.summary,
            totalTrades,
            winRate,
          }
        });
        
        if (!updateResult.success) {
          return { 
            success: false, 
            error: `添加交易记录成功但更新回测数据失败：${updateResult.error}` 
          };
        }
      }
      
      await this.fetchTransactionsByBacktest(transaction.backtestId);
      return { success: true, data: newTransaction };
    } catch (error) {
      console.error('添加交易记录失败:', error);
      return { 
        success: false, 
        error: `添加交易记录失败：${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}