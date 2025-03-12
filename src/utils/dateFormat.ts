import moment from "moment";

export const formatTimestamp = (timestamp: number, type: 'date' | 'time' = 'time'): string => {
  return moment(timestamp).format(type === 'time' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD')
};

// 将 Date 对象转换为时间戳（毫秒）
export const dateToTimestamp = (date: Date): number => {
  return date.getTime();
};

// 将 moment 对象转换为时间戳（毫秒）
export const momentToTimestamp = (momentObj: moment.Moment): number => {
  return momentObj.valueOf();
};
