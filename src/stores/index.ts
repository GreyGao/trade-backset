// 导出所有 store
import { StrategyStore } from './StrategyStore';
import { BacktestStore } from './BacktestStore';
import { TransactionStore } from './TransactionStore';
import { PositionStore } from './PositionStore';
import { StockStore } from './StockStore';
import { RootStore } from './RootStore';

export { 
  StrategyStore,
  BacktestStore,
  TransactionStore,
  PositionStore,
  StockStore,
  RootStore
};

// 创建并导出 rootStore 实例
export const rootStore = new RootStore();