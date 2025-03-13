import { Trade, Backtest } from '../types/database';

/**
 * 计算回测的统计指标
 * @param trades 交易记录列表
 * @param initialCapital 初始资金
 * @returns 回测统计指标
 */
export const calculateBacktestSummary = (trades: Trade[], initialCapital: number) => {
  // 按时间排序交易记录
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  
  // 计算已完成交易的盈亏
  const realizedProfit = sortedTrades
    .filter(t => t.type === 'SELL')
    .reduce((sum, t) => sum + (t.profit || 0), 0);
  
  // 计算总交易次数（卖出交易的数量）
  const totalTrades = sortedTrades.filter(t => t.type === 'SELL').length;
  
  // 计算盈利交易次数
  const winningTrades = sortedTrades.filter(t => t.type === 'SELL' && (t.profit || 0) > 0).length;
  
  // 计算最大单笔盈利和最大单笔亏损
  const profits = sortedTrades
    .filter(t => t.type === 'SELL')
    .map(t => t.profit || 0);
  
  const maxProfit = profits.length > 0 ? Math.max(...profits, 0) : 0;
  const maxLoss = profits.length > 0 ? Math.min(...profits, 0) : 0;
  
  // 计算胜率
  const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
  
  // 计算盈亏比（平均盈利/平均亏损）
  const winningProfits = profits.filter(p => p > 0);
  const losingProfits = profits.filter(p => p < 0);
  
  const avgWin = winningProfits.length > 0
    ? winningProfits.reduce((sum, p) => sum + p, 0) / winningProfits.length 
    : 0;
    
  const avgLoss = losingProfits.length > 0 
    ? Math.abs(losingProfits.reduce((sum, p) => sum + p, 0) / losingProfits.length)
    : 0;
  
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  
  // 计算期望值
  const expectation = totalTrades > 0 ? realizedProfit / totalTrades : 0;
  
  // 计算收益比例
  const profitRatio = initialCapital > 0 ? realizedProfit / initialCapital : 0;
  
  // 计算最大回撤
  const maxDrawdown = calculateMaxDrawdown(sortedTrades, initialCapital);
  
  // 计算现金余额和账户总资产
  const { cash, totalAssets } = calculateAccountBalance(sortedTrades, initialCapital);
  
  return {
    totalProfit: realizedProfit,
    realizedProfit,
    totalTrades,
    winningTrades,
    maxProfit,
    maxLoss,
    maxDrawdown,
    winRate,
    profitFactor,
    expectation,
    profitRatio,
    currentCash: cash,         // 现金余额
    totalAssets: totalAssets,  // 账户总资产
  };
};

/**
 * 计算账户余额和总资产
 * @param trades 交易记录列表
 * @param initialCapital 初始资金
 * @returns 现金余额和账户总资产
 */
const calculateAccountBalance = (trades: Trade[], initialCapital: number): { cash: number, totalAssets: number } => {
  if (trades.length === 0) return { cash: initialCapital, totalAssets: initialCapital };
  
  let cash = initialCapital; // 现金余额
  const positions: Record<string, { quantity: number, cost: number }> = {}; // 持仓情况
  
  console.log('===== 交易流水明细 =====');
  console.log(`初始资金: ${initialCapital.toFixed(2)}`);
  
  // 遍历所有交易，更新持仓和现金
  for (const trade of trades) {
    const stockCode = trade.stockCode;
    const tradeType = trade.type === 'BUY' ? '买入' : '卖出';
    
    console.log(`\n[${new Date(trade.timestamp).toLocaleString()}] ${tradeType} ${trade.stockName}(${stockCode})`);
    console.log(`交易前现金余额: ${cash.toFixed(2)}`);
    
    if (trade.type === 'BUY') {
      // 买入：减少现金，增加持仓
      // 手续费计入持仓成本，而不是额外从现金中扣除
      cash -= trade.amount;
      
      console.log(`买入数量: ${trade.quantity}股, 价格: ${trade.price.toFixed(2)}元/股`);
      console.log(`买入金额: ${trade.amount.toFixed(2)}元`);
      console.log(`手续费: ${(trade.fee || 0).toFixed(2)}元 (计入持仓成本)`);
      
      // 更新持仓
      if (!positions[stockCode]) {
        positions[stockCode] = {
          quantity: 0,
          cost: 0
        };
        console.log(`新建持仓: ${trade.stockName}(${stockCode})`);
      }
      
      const oldQuantity = positions[stockCode].quantity;
      const oldCost = positions[stockCode].cost;
      
      // 计算新的持仓成本（包含手续费）
      const totalCost = oldQuantity * oldCost + 
                      trade.quantity * trade.price + (trade.fee || 0);
      const newQuantity = oldQuantity + trade.quantity;
      
      positions[stockCode] = {
        quantity: newQuantity,
        cost: totalCost / newQuantity // 平均成本（包含手续费）
      };
      
      console.log(`持仓变化: ${oldQuantity}股 -> ${newQuantity}股`);
      console.log(`平均成本: ${oldCost.toFixed(4)}元/股 -> ${positions[stockCode].cost.toFixed(4)}元/股`);
    } else if (trade.type === 'SELL') {
      // 卖出：增加现金，减少持仓
      // 手续费从卖出金额中扣除
      cash += trade.amount - (trade.fee || 0);
      
      console.log(`卖出数量: ${trade.quantity}股, 价格: ${trade.price.toFixed(2)}元/股`);
      console.log(`卖出金额: ${trade.amount.toFixed(2)}元`);
      console.log(`手续费: ${(trade.fee || 0).toFixed(2)}元 (从卖出金额中扣除)`);
      
      // 更新持仓
      if (positions[stockCode]) {
        const oldQuantity = positions[stockCode].quantity;
        const oldCost = positions[stockCode].cost;
        const costBasis = oldCost * trade.quantity;
        const profit = trade.amount - costBasis - (trade.fee || 0);
        
        console.log(`成本基础: ${costBasis.toFixed(2)}元 (${oldCost.toFixed(4)}元/股 * ${trade.quantity}股)`);
        console.log(`交易盈亏: ${profit.toFixed(2)}元`);
        
        positions[stockCode].quantity -= trade.quantity;
        
        console.log(`持仓变化: ${oldQuantity}股 -> ${positions[stockCode].quantity}股`);
        
        // 如果持仓为0或负数，删除该持仓
        if (positions[stockCode].quantity <= 0) {
          console.log(`清空持仓: ${trade.stockName}(${stockCode})`);
          delete positions[stockCode];
        }
      } else {
        console.log(`警告: 尝试卖出不存在的持仓 ${trade.stockName}(${stockCode})`);
      }
    }
    
    console.log(`交易后现金余额: ${cash.toFixed(2)}`);
    
    // 打印当前所有持仓
    console.log('当前持仓情况:');
    if (Object.keys(positions).length === 0) {
      console.log('  无持仓');
    } else {
      for (const code in positions) {
        const pos = positions[code];
        console.log(`  ${code}: ${pos.quantity}股, 成本: ${pos.cost.toFixed(4)}元/股`);
      }
    }
  }
  
  // 计算持仓市值（使用最后一次交易的价格作为市价）
  let positionValue = 0;
  const lastPrices: Record<string, number> = {};
  
  // 获取每只股票的最新价格
  for (let i = trades.length - 1; i >= 0; i--) {
    const trade = trades[i];
    if (!lastPrices[trade.stockCode]) {
      lastPrices[trade.stockCode] = trade.price;
    }
  }
  
  // 计算持仓市值
  console.log('\n===== 最终持仓市值 =====');
  for (const stockCode in positions) {
    const position = positions[stockCode];
    const lastPrice = lastPrices[stockCode] || 0;
    const marketValue = position.quantity * lastPrice;
    positionValue += marketValue;
    
    const profit = (lastPrice - position.cost) * position.quantity;
    const profitPercent = ((lastPrice / position.cost) - 1) * 100;
    
    console.log(`${stockCode}: ${position.quantity}股`);
    console.log(`  成本价: ${position.cost.toFixed(4)}元/股, 市场价: ${lastPrice.toFixed(2)}元/股`);
    console.log(`  市值: ${marketValue.toFixed(2)}元`);
    console.log(`  浮动盈亏: ${profit.toFixed(2)}元 (${profitPercent.toFixed(2)}%)`);
  }
  
  // 账户总资产 = 现金余额 + 持仓市值
  const totalAssets = cash + positionValue;
  
  console.log('\n===== 账户总结 =====');
  console.log(`现金余额: ${cash.toFixed(2)}元`);
  console.log(`持仓市值: ${positionValue.toFixed(2)}元`);
  console.log(`账户总资产: ${totalAssets.toFixed(2)}元`);
  console.log(`总收益率: ${((totalAssets / initialCapital - 1) * 100).toFixed(2)}%`);
  console.log('=====================\n');
  
  return { cash, totalAssets };
};

/**
 * 计算最大回撤
 * @param trades 交易记录列表
 * @param initialCapital 初始资金
 * @returns 最大回撤值
 */
const calculateMaxDrawdown = (trades: Trade[], initialCapital: number): number => {
  if (trades.length === 0) return 0;
  
  // 构建资金曲线（考虑手续费）
  let balance = initialCapital;
  const balances = [balance];
  
  for (const trade of trades) {
    if (trade.type === 'BUY') {
      // 买入时只从现金中扣除交易金额，手续费已计入持仓成本
      balance -= trade.amount;
    } else {
      // 卖出时增加交易金额并扣除手续费
      balance += trade.amount - (trade.fee || 0);
    }
    balances.push(balance);
  }
  
  // 计算最大回撤
  let maxDrawdown = 0;
  let peak = balances[0];
  
  for (let i = 1; i < balances.length; i++) {
    if (balances[i] > peak) {
      peak = balances[i];
    } else {
      const drawdown = (peak - balances[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }
  
  return maxDrawdown;
};

/**
 * 更新回测统计数据
 * @param backtest 回测对象
 * @param trades 交易记录列表
 * @returns 更新后的回测对象
 */
export const updateBacktestSummary = (backtest: Backtest, trades: Trade[]): Backtest => {
  const summary = calculateBacktestSummary(trades, backtest.initialCapital);
  
  return {
    ...backtest,
    summary,
    currentCapital: summary.currentCash, // 更新现金余额
    updateTime: Date.now()
  };
};