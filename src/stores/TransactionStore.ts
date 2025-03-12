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

  async addTransaction(transaction: Omit<Trade, 'id' | 'createTime'>, backtestStore: BacktestStore): Promise<DatabaseResult<Trade>> {
    try {
      const newTransaction = {
        ...transaction,
        id: uuidv4(),
        createTime: Date.now(),
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

  async deleteTransaction(id: string, backtestStore: BacktestStore) {
      try {
        // 获取要删除的交易记录
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) {
          return { success: false, error: '交易记录不存在' };
        }
  
        // 从数据库中删除 - 修正表名为 trades
        const trade = await db.trades.findOne({ id });
        if (!trade) {
          return { success: false, error: `未找到ID为${id}的交易记录` };
        }
        
        await db.trades.remove(trade);
  
        // 更新 store 中的数据
        this.transactions = this.transactions.filter(t => t.id !== id);
  
        // 更新回测资金
        if (transaction.type === 'BUY') {
          // 买入记录：返还资金和手续费
          await backtestStore.updateBacktest(transaction.backtestId, {
            currentCapital: backtestStore.currentBacktest!.currentCapital + transaction.amount + transaction.fee
          });
        } else {
          // 卖出记录：扣除资金（不含手续费）
          await backtestStore.updateBacktest(transaction.backtestId, {
            currentCapital: backtestStore.currentBacktest!.currentCapital - transaction.amount + transaction.fee
          });
        }
  
        return { success: true };
      } catch (error) {
        console.error('删除交易记录失败:', error);
        return { success: false, error: '删除失败' };
      }
    }
}