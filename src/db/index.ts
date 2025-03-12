import Loki from 'lokijs';
import { Strategy, Backtest, Trade, Position, Stock } from '../types/database';

class Database {
  private db: Loki;
  private initialized: boolean = false;
  private _collections: {
    strategies?: Collection<Strategy>;
    backtests?: Collection<Backtest>;
    trades?: Collection<Trade>;
    positions?: Collection<Position>;
    stocks?: Collection<Stock>;
  } = {};

  constructor() {
    this.db = new Loki('tradeback.db', {
      autoload: true,
      autoloadCallback: () => this.initializeDatabase(),
      autosave: true,
      autosaveInterval: 5000
    });
  }

  private initializeDatabase() {
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

  public exportData() {
    return this.db.serialize();
  }

  public importData(data: string) {
    this.db.loadJSON(data);
  }
}

export const db = new Database();