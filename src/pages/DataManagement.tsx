import React, { useState, useEffect } from 'react';
import { Card, Button, Upload, message, Descriptions, Space } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { db } from '../db';

const DataManagement: React.FC = () => {
  const [dbStatus, setDbStatus] = useState(db.getDatabaseStatus());

  useEffect(() => {
    const init = async () => {
      await db.waitForInitialization();
      setDbStatus(db.getDatabaseStatus());
    };
    init();
  }, []);

  const handleExport = () => {
    const data = db.exportData();
    if (!data) {
      message.error('导出数据失败');
      return;
    }
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeback-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('数据导出成功');
  };

  const handleImport = async (file: File) => {
    try {
      await db.waitForInitialization();
      const text = await file.text();
      const data = JSON.parse(text);
      
      // 清空现有集合
      db.strategies.clear();
      db.backtests.clear();
      db.trades.clear();
      db.positions.clear();
      db.stocks.clear();
      
      // 导入数据
      db.importData(text);
      
      // 使用统一的存储键
      localStorage.setItem('tradeback.db', text);
      
      // 刷新状态
      setDbStatus(db.getDatabaseStatus());
      message.success('数据导入成功');
    } catch (error) {
      message.error('数据导入失败');
      console.error(error);
    }
  };

  return (
    <Card title="数据管理">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card size="small" title="数据操作">
          <Space>
            <Upload
              beforeUpload={(file) => {
                handleImport(file);
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入数据</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出数据
            </Button>
          </Space>
        </Card>

        <Card size="small" title="数据库状态">
          <Descriptions column={1}>
            <Descriptions.Item label="初始化状态">
              {dbStatus.initialized ? '已完成' : '未完成'}
            </Descriptions.Item>
            <Descriptions.Item label="策略数量">
              {dbStatus.collections.strategies}
            </Descriptions.Item>
            <Descriptions.Item label="回测数量">
              {dbStatus.collections.backtests}
            </Descriptions.Item>
            <Descriptions.Item label="交易记录数">
              {dbStatus.collections.trades}
            </Descriptions.Item>
            <Descriptions.Item label="持仓记录数">
              {dbStatus.collections.positions}
            </Descriptions.Item>
            <Descriptions.Item label="股票数量">
              {dbStatus.collections.stocks}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </Card>
  );
};

export default DataManagement;