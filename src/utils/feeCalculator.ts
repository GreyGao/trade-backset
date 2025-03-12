// 计算过户费
export const calculateTransferFee = (amount: number): number => {
  return Number((amount * 0.00001).toFixed(2));
};

// 计算佣金
export const calculateCommission = (amount: number): number => {
  const commission = amount * 0.0003;
  return Number(Math.max(commission, 5).toFixed(2));
};

// 计算印花税
export const calculateStampDuty = (amount: number): number => {
  return Number((amount * 0.0005).toFixed(2));
};

// 计算买入手续费
export const calculateBuyFee = (amount: number): number => {
  const transferFee = calculateTransferFee(amount);
  const commission = calculateCommission(amount);
  return Number((transferFee + commission).toFixed(2));
};

// 计算卖出手续费
export const calculateSellFee = (amount: number): number => {
  const transferFee = calculateTransferFee(amount);
  const commission = calculateCommission(amount);
  const stampDuty = calculateStampDuty(amount);
  return Number((transferFee + commission + stampDuty).toFixed(2));
};