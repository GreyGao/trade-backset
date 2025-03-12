import { StrategyStore } from './StrategyStore';
import { BacktestStore } from './BacktestStore';
import { TransactionStore } from './TransactionStore';
import { PositionStore } from './PositionStore';
import { StockStore } from './StockStore';

export class RootStore {
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