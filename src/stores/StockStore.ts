import { makeAutoObservable } from 'mobx';
import { db } from '../db';
import { Stock } from '../types/database';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseResult } from './types';

export class StockStore {
  stocks: Stock[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchStocks() {
    this.loading = true;
    try {
      this.stocks = await db.stocks.find({});
    } catch (error) {
      console.error('获取股票列表失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async addStock(stock: Omit<Stock, 'id'>): Promise<DatabaseResult<Stock>> {
    try {
      const newStock = {
        ...stock,
        id: uuidv4()
      };
      
      const id = await db.stocks.insert(newStock);
      if (!id) {
        return { success: false, error: '添加股票失败：数据库操作未返回ID' };
      }
      
      await this.fetchStocks();
      return { success: true, data: newStock };
    } catch (error) {
      console.error('添加股票失败:', error);
      return {
        success: false,
        error: `添加股票失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async updateStock(id: string, data: Partial<Stock>): Promise<DatabaseResult<Stock>> {
    try {
      const existingStock = await db.stocks.findOne({ id });
      if (!existingStock) {
        return { success: false, error: `未找到ID为${id}的股票` };
      }
      
      const updatedStock = {
        ...existingStock,
        ...data,
        id,
        updateTime: new Date()
      };
      
      const result = await db.stocks.update(updatedStock);
      if (!result) {
        return { success: false, error: '更新股票失败：数据库操作未返回结果' };
      }
      
      await this.fetchStocks();
      return { success: true, data: updatedStock };
    } catch (error) {
      console.error('更新股票失败:', error);
      return {
        success: false,
        error: `更新股票失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async deleteStock(id: string): Promise<DatabaseResult<string>> {
    try {
      const stock = await db.stocks.findOne({ id });
      if (!stock) {
        return { success: false, error: `未找到ID为${id}的股票` };
      }
      
      const result = await db.stocks.remove(stock);
      if (!result) {
        return { success: false, error: '删除股票失败：数据库操作未返回结果' };
      }
      
      await this.fetchStocks();
      return { success: true, data: id };
    } catch (error) {
      console.error('删除股票失败:', error);
      return {
        success: false,
        error: `删除股票失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}