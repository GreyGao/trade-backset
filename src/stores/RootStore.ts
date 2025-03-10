import { makeAutoObservable } from 'mobx';
import { db, IStrategy, IBacktest, ITransaction, IPosition, IStock } from '../db';

class StrategyStore {
  strategies: IStrategy[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchStrategies() {
    this.loading = true;
    try {
      this.strategies = await db.strategies.toArray();
    } catch (error) {
      console.error('获取策略列表失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async addStrategy(strategy: Omit<IStrategy, 'id' | 'createTime'>) {
    try {
      const id = await db.strategies.add({
        ...strategy,
        createTime: new Date()
      });
      await this.fetchStrategies();
      return id;
    } catch (error) {
      console.error('添加策略失败:', error);
      throw error;
    }
  }

  async updateStrategy(id: number, data: Partial<IStrategy>) {
    try {
      await db.strategies.update(id, data);
      await this.fetchStrategies();
    } catch (error) {
      console.error('更新策略失败:', error);
      throw error;
    }
  }

  async deleteStrategy(id: number) {
    try {
      await db.strategies.delete(id);
      await this.fetchStrategies();
    } catch (error) {
      console.error('删除策略失败:', error);
      throw error;
    }
  }
}

class BacktestStore {
  backtests: IBacktest[] = [];
  currentBacktest: IBacktest | null = null;
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchBacktests() {
    this.loading = true;
    try {
      this.backtests = await db.backtests.toArray();
    } catch (error) {
      console.error('获取回测列表失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async getBacktest(id: number) {
    try {
      const backtest = await db.backtests.get(id);
      if (backtest) {
        this.currentBacktest = backtest;
      }
      return backtest;
    } catch (error) {
      console.error('获取回测详情失败:', error);
      throw error;
    }
  }

  async addBacktest(backtest: Omit<IBacktest, 'id' | 'createTime' | 'profitRatio' | 'winRate' | 'profitFactor' | 'expectation' | 'maxDrawdown' | 'transactionCount'>) {
    try {
      const id = await db.backtests.add({
        ...backtest,
        profitRatio: 0,
        winRate: 0,
        profitFactor: 0,
        expectation: 0,
        maxDrawdown: 0,
        transactionCount: 0,
        createTime: new Date()
      });
      await this.fetchBacktests();
      return id;
    } catch (error) {
      console.error('添加回测失败:', error);
      throw error;
    }
  }

  async updateBacktest(id: number, data: Partial<IBacktest>) {
    try {
      await db.backtests.update(id, data);
      if (this.currentBacktest?.id === id) {
        this.currentBacktest = { ...this.currentBacktest, ...data };
      }
      await this.fetchBacktests();
    } catch (error) {
      console.error('更新回测失败:', error);
      throw error;
    }
  }

  async deleteBacktest(id: number) {
    try {
      // 删除关联的交易记录和持仓
      await db.transactions.where('backtestId').equals(id).delete();
      await db.positions.where('backtestId').equals(id).delete();
      // 删除回测
      await db.backtests.delete(id);
      await this.fetchBacktests();
    } catch (error) {
      console.error('删除回测失败:', error);
      throw error;
    }
  }
}

class TransactionStore {
  transactions: ITransaction[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchTransactionsByBacktest(backtestId: number) {
    this.loading = true;
    try {
      this.transactions = await db.transactions
        .where('backtestId')
        .equals(backtestId)
        .sortBy('datetime');
    } catch (error) {
      console.error('获取交易记录失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async addTransaction(transaction: Omit<ITransaction, 'id'>, backtestStore: BacktestStore) {
    try {
      // 添加交易记录
      const id = await db.transactions.add(transaction);
      
      // 更新回测统计数据
      if (transaction.backtestId && backtestStore.currentBacktest) {
        const backtest = backtestStore.currentBacktest;
        const allTransactions = await db.transactions
          .where('backtestId')
          .equals(transaction.backtestId)
          .toArray();
        
        // 计算新的统计数据
        const winTrades = allTransactions.filter(t => t.isWin).length;
        const totalTrades = allTransactions.length;
        const winRate = totalTrades > 0 ? winTrades / totalTrades : 0;
        
        // 更新回测数据
        await backtestStore.updateBacktest(transaction.backtestId, {
          currentBalance: backtest.currentBalance + (transaction.type === 'SELL' ? transaction.amount : -transaction.amount),
          transactionCount: totalTrades,
          winRate,
          // 其他统计数据需要更复杂的计算...
        });
      }
      
      await this.fetchTransactionsByBacktest(transaction.backtestId);
      return id;
    } catch (error) {
      console.error('添加交易记录失败:', error);
      throw error;
    }
  }
}

class PositionStore {
  positions: IPosition[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchPositionsByBacktest(backtestId: number) {
    this.loading = true;
    try {
      this.positions = await db.positions
        .where('backtestId')
        .equals(backtestId)
        .toArray();
    } catch (error) {
      console.error('获取持仓信息失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async updatePositions(backtestId: number, transaction: ITransaction) {
    try {
      if (transaction.type === 'BUY') {
        // 买入逻辑
        const existingPosition = await db.positions
          .where({ backtestId, stockCode: transaction.stockCode })
          .first();
        
        if (existingPosition) {
          // 更新现有持仓
          const totalShares = existingPosition.shares + transaction.shares;
          const totalCost = existingPosition.averageCost * existingPosition.shares + 
                           transaction.price * transaction.shares;
          
          await db.positions.update(existingPosition.id!, {
            shares: totalShares,
            averageCost: totalCost / totalShares
          });
        } else {
          // 新建持仓
          await db.positions.add({
            backtestId,
            stockCode: transaction.stockCode,
            stockName: transaction.stockName,
            shares: transaction.shares,
            averageCost: transaction.price
          });
        }
      } else if (transaction.type === 'SELL') {
        // 卖出逻辑
        const existingPosition = await db.positions
          .where({ backtestId, stockCode: transaction.stockCode })
          .first();
        
        if (existingPosition) {
          const remainingShares = existingPosition.shares - transaction.shares;
          
          if (remainingShares <= 0) {
            // 清仓
            await db.positions.delete(existingPosition.id!);
          } else {
            // 减仓
            await db.positions.update(existingPosition.id!, {
              shares: remainingShares
            });
          }
        }
      }
      
      await this.fetchPositionsByBacktest(backtestId);
    } catch (error) {
      console.error('更新持仓失败:', error);
      throw error;
    }
  }
}

class StockStore {
  stocks: IStock[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchStocks() {
    this.loading = true;
    try {
      this.stocks = await db.stocks.toArray();
    } catch (error) {
      console.error('获取股票列表失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async addStock(stock: Omit<IStock, 'id'>) {
    try {
      const id = await db.stocks.add(stock);
      await this.fetchStocks();
      return id;
    } catch (error) {
      console.error('添加股票失败:', error);
      throw error;
    }
  }

  async updateStock(id: number, data: Partial<IStock>) {
    try {
      await db.stocks.update(id, data);
      await this.fetchStocks();
    } catch (error) {
      console.error('更新股票失败:', error);
      throw error;
    }
  }

  async deleteStock(id: number) {
    try {
      await db.stocks.delete(id);
      await this.fetchStocks();
    } catch (error) {
      console.error('删除股票失败:', error);
      throw error;
    }
  }
}

class RootStore {
  strategyStore: StrategyStore;
  backtestStore: BacktestStore;
  transactionStore: TransactionStore;
  positionStore: PositionStore;
  stockStore: StockStore;

  constructor() {
    this.strategyStore = new StrategyStore();
    this.backtestStore = new BacktestStore();
    this.transactionStore = new TransactionStore();
    this.positionStore = new PositionStore();
    this.stockStore = new StockStore();
  }
}

export const rootStore = new RootStore();