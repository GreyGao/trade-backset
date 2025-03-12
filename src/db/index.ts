import Loki from 'lokijs';
import { Strategy, Backtest, Trade, Position, Stock } from '../types/database';

class Database {
  private static readonly STORAGE_KEY = 'tradeback.db';
  private db: Loki | undefined;
  private initialized: boolean = false;
  private initPromise: Promise<void>;
  private _collections: {
    strategies?: Collection<Strategy>;
    backtests?: Collection<Backtest>;
    trades?: Collection<Trade>;
    positions?: Collection<Position>;
    stocks?: Collection<Stock>;
  } = {};

  constructor() {
    this.initPromise = new Promise((resolve) => {
      if (this.initialized) return resolve()

      this.db = new Loki('tradeback.db', {
        autoload: true,
        autoloadCallback: () => {
          this.initializeDatabase();
          resolve();
        },
        autosave: true,
        autosaveInterval: 3000,
        env: 'BROWSER',
        adapter: new Loki.LokiLocalStorageAdapter()
      });
    });
  }

  private initializeDatabase() {
    if (!this.db) return console.error('数据库初始化失败');

    // 初始化所有集合
    this._collections.strategies = this.db.addCollection<Strategy>('strategies', {
      indices: ['name', 'createTime']
    });

    this._collections.backtests = this.db.addCollection<Backtest>('backtests', {
      indices: ['strategyId', 'status', 'createTime']
    });

    this._collections.trades = this.db.addCollection<Trade>('trades', {
      indices: ['backtestId', 'stockCode', 'timestamp']
    });

    this._collections.positions = this.db.addCollection<Position>('positions', {
      indices: ['backtestId', 'stockCode']
    });

    this._collections.stocks = this.db.addCollection<Stock>('stocks', {
      indices: ['code']
    });

    this.initialized = true;

    // 使用统一的存储键
    const savedData = localStorage.getItem(Database.STORAGE_KEY);
    if (savedData) {
      try {
        this.importData(savedData);
      } catch (error) {
        console.error('加载备份数据失败:', error);
      }
    }

    const status = this.getDatabaseStatus();
    console.log('数据库状态：', JSON.stringify(status));
  }

  // 添加等待初始化完成的方法
  public async waitForInitialization() {
    await this.initPromise;
    return this.initialized;
  }

  public exportData(): string | void {
    if (!this.db) {
      console.error('数据库不存在');
      return;
    }
    return this.db.serialize();
  }

  // 提供类型安全的访问器
  get strategies() {
    return this._collections.strategies!;
  }

  get backtests() {
    return this._collections.backtests!;
  }

  get trades() {
    return this._collections.trades!;
  }

  get positions() {
    return this._collections.positions!;
  }

  get stocks() {
    return this._collections.stocks!;
  }

  public importData(data: string) {
    if (!this.db) {
      console.error('数据库不存在');
      return;
    }

    // 确保数据库已初始化
    if (!this.initialized) {
      console.error('数据库未初始化');
      return;
    }

    try {
      this.db.loadJSON(data);
      // 强制重新加载所有集合
      this._collections.strategies = this.db.getCollection('strategies');
      this._collections.backtests = this.db.getCollection('backtests');
      this._collections.trades = this.db.getCollection('trades');
      this._collections.positions = this.db.getCollection('positions');
      this._collections.stocks = this.db.getCollection('stocks');
    } catch (error) {
      console.error('导入数据失败:', error);
      throw error;
    }
  }

  public getDatabaseStatus() {
    return {
      initialized: this.initialized,
      collections: {
        strategies: this._collections.strategies?.count() ?? 0,
        backtests: this._collections.backtests?.count() ?? 0,
        trades: this._collections.trades?.count() ?? 0,
        positions: this._collections.positions?.count() ?? 0,
        stocks: this._collections.stocks?.count() ?? 0
      }
    };
  }
}

export const db = new Database();