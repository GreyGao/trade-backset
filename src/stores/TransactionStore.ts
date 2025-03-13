import { makeAutoObservable } from 'mobx';
import { db } from '../db';
import { Trade } from '../types/database';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseResult } from './types';
import { BacktestStore } from './BacktestStore';
import { PositionStore } from './PositionStore';
import { calculateBacktestSummary, updateBacktestSummary } from '../utils/backtestCalculator';

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
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('获取交易记录失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async addTransaction(
    transaction: Omit<Trade, 'id' | 'createTime'>, 
    backtestStore: BacktestStore,
    positionStore: PositionStore
  ): Promise<DatabaseResult<Trade>> {
    try {
      // 确保价格和金额是浮点数
      const newTransaction = {
        ...transaction,
        price: Number(transaction.price),
        amount: Number(transaction.amount),
        fee: transaction.fee ? Number(transaction.fee) : 0,
        id: uuidv4(),
        createTime: Date.now(),
      };
      
      const id = await db.trades.insert(newTransaction);
      if (!id) {
        return { success: false, error: '添加交易记录失败：数据库操作未返回ID' };
      }
      
      // 使用 PositionStore 更新持仓
      const positionResult = await positionStore.updatePositions(
        transaction.backtestId, 
        newTransaction
      );
      
      if (!positionResult.success) {
        return { 
          success: false, 
          error: `添加交易记录成功但更新持仓失败：${positionResult.error}` 
        };
      }
      
      if (transaction.backtestId && backtestStore.currentBacktest) {
        const backtest = backtestStore.currentBacktest;
        const allTransactions = await db.trades.find({ backtestId: transaction.backtestId });
        
        // 使用新的计算方法更新回测统计数据
        const updatedBacktest = updateBacktestSummary(backtest, allTransactions);
        
        // 更新回测数据
        const updateResult = await backtestStore.updateBacktest(transaction.backtestId, updatedBacktest);
        
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

  async deleteTransaction(
    id: string, 
    backtestStore: BacktestStore,
    positionStore: PositionStore
  ): Promise<DatabaseResult<string>> {
    try {
      // 获取要删除的交易记录
      const transaction = this.transactions.find(t => t.id === id);
      if (!transaction) {
        return { success: false, error: '交易记录不存在' };
      }

      // 从数据库中删除
      const trade = await db.trades.findOne({ id });
      if (!trade) {
        return { success: false, error: `未找到ID为${id}的交易记录` };
      }
      
      await db.trades.remove(trade);

      // 更新 store 中的数据
      this.transactions = this.transactions.filter(t => t.id !== id);

      // 获取当前回测和所有交易
      const backtest = backtestStore.currentBacktest;
      if (backtest) {
        const allTransactions = await db.trades.find({ backtestId: transaction.backtestId });
        
        // 使用新的计算方法更新回测统计数据
        const updatedBacktest = updateBacktestSummary(backtest, allTransactions);
        
        // 更新回测数据
        await backtestStore.updateBacktest(transaction.backtestId, updatedBacktest);
        
        // 重新计算持仓
        await positionStore.recalculatePositions(transaction.backtestId, allTransactions);
      }

      return { success: true, data: id };
    } catch (error) {
      console.error('删除交易记录失败:', error);
      return { 
        success: false, 
        error: `删除交易记录失败：${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}