import { makeAutoObservable } from 'mobx';
import { db } from '../db';
import { Strategy } from '../types/database';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseResult } from './types';

export class StrategyStore {
  strategies: Strategy[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchStrategies() {
    this.loading = true;
    try {
      this.strategies = await db.strategies.find({});
    } catch (error) {
      console.error('获取策略列表失败:', error);
    } finally {
      this.loading = false;
    }
  }

  async addStrategy(strategy: Omit<Strategy, 'id' | 'createTime'>): Promise<DatabaseResult<Strategy>> {
    try {
      const now = new Date();
      const newStrategy: Strategy = { 
        ...strategy,
        id: uuidv4(),
        createTime: now,
        updateTime: now
      };
      const id = await db.strategies.insert(newStrategy);
      if (!id) {
        return { success: false, error: '添加策略失败：数据库操作未返回ID' };
      }
      await this.fetchStrategies();
      return { success: true, data: newStrategy };
    } catch (error) {
      console.error('添加策略失败:', error);
      return { 
        success: false, 
        error: `添加策略失败：${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  async updateStrategy(id: string, data: Partial<Strategy>): Promise<DatabaseResult<Strategy>> {
    try {
      const existingStrategy = await db.strategies.findOne({ id });
      if (!existingStrategy) {
        return { success: false, error: `未找到ID为${id}的策略` };
      }
      
      const updatedStrategy: Strategy = {
        ...existingStrategy,
        ...data,
        id,
        updateTime: new Date()
      };
      
      const result = await db.strategies.update(updatedStrategy);
      if (!result) {
        return { success: false, error: '更新策略失败：数据库操作未返回结果' };
      }
      
      await this.fetchStrategies();
      return { success: true, data: updatedStrategy };
    } catch (error) {
      console.error('更新策略失败:', error);
      return { 
        success: false, 
        error: `更新策略失败：${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  async deleteStrategy(id: string): Promise<DatabaseResult<string>> {
    try {
      const strategy = await db.strategies.findOne({ id });
      if (!strategy) {
        return { success: false, error: `未找到ID为${id}的策略` };
      }
      
      const result = await db.strategies.remove(strategy);
      if (!result) {
        return { success: false, error: '删除策略失败：数据库操作未返回结果' };
      }
      
      await this.fetchStrategies();
      return { success: true, data: id };
    } catch (error) {
      console.error('删除策略失败:', error);
      return { 
        success: false, 
        error: `删除策略失败：${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}