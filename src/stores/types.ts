// 定义通用的返回类型
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}