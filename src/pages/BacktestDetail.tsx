import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Table, Button, Statistic, Row, Col, Descriptions, Space, Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { rootStore } from '../stores';
import { Trade, Position } from '../types/database';
import { withDBCheck } from '../components/withDBCheck';
import { formatTimestamp } from '../utils/dateFormat';

const { TabPane } = Tabs;

const BacktestDetail: React.FC = observer(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { backtestStore, transactionStore, positionStore, stockStore } = rootStore;
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      backtestStore.getBacktest(id);
      transactionStore.fetchTransactionsByBacktest(id);
      positionStore.fetchPositionsByBacktest(id);
      stockStore.fetchStocks();
    }
  }, [id, backtestStore, transactionStore, positionStore, stockStore]);

  const handleBack = () => {
    navigate('/backtests');
  };

  const handleAddTransaction = () => {
    form.resetFields();
    setTransactionModalVisible(true);
  };

  const handleSubmitTransaction = async () => {
    try {
      const values = await form.validateFields();
      const stock = stockStore.stocks.find(s => s.code === values.stockCode);
      
      if (!id || !stock) return;
      
      const transaction: Omit<Trade, 'id'> = {
        backtestId: id,
        stockCode: values.stockCode,
        stockName: stock.name,
        type: values.type,
        price: values.price,
        quantity: values.shares, // 注意：字段名可能已更改
        fee: values.fee || 0,
        amount: values.price * values.shares,
        timestamp: Date.now(), // 注意：字段名可能已更改
        profit: values.type === 'SELL' ? values.profit : 0,
        reason: values.reason,
      };
      
      const result = await transactionStore.addTransaction(transaction, backtestStore);
      if (!result.success) {
        message.error(result.error);
        return;
      }
      
      // 更新持仓
      const positionResult = await positionStore.updatePositions(id, transaction as Trade);
      if (!positionResult.success) {
        message.error(positionResult.error);
      }
      
      setTransactionModalVisible(false);
    } catch (error) {
      console.error('添加交易记录失败:', error);
    }
  };

  // 修改类型
  const transactionColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp', // 可能已从 datetime 改为 timestamp
      key: 'timestamp',
      render: (timestamp: number) => formatTimestamp(timestamp),
    },
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (text: string) => text === 'BUY' ? '买入' : '卖出',
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (text: number) => `¥${text.toFixed(2)}`,
    },
    {
      title: '数量',
      dataIndex: 'shares',
      key: 'shares',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (text: number) => `¥${text.toFixed(2)}`,
    },
    {
      title: '手续费',
      dataIndex: 'fee',
      key: 'fee',
      render: (text: number) => `¥${text.toFixed(2)}`,
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (text: number) => text ? `¥${text.toFixed(2)}` : '-',
    },
  ];

  // 修改类型
  const positionColumns = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
    },
    {
      title: '持仓数量',
      dataIndex: 'quantity', // 可能已从 shares 改为 quantity
      key: 'quantity',
    },
    {
      title: '平均成本',
      dataIndex: 'avgCost', // 可能已从 averageCost 改为 avgCost
      key: 'avgCost',
      render: (text: number) => `¥${text.toFixed(2)}`,
    },
    {
      title: '当前价格',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      render: (text: number) => text ? `¥${text.toFixed(2)}` : '-',
    },
    {
      title: '市值',
      dataIndex: 'marketValue',
      key: 'marketValue',
      render: (text: number) => text ? `¥${text.toFixed(2)}` : '-',
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (text: number, record: Position) => {
        if (!text || !record.marketPrice) return '-';
        // 注意：profitRatio 可能不存在，需要计算
        const profitRatio = (record.marketPrice - record.avgCost) / record.avgCost;
        const color = text > 0 ? '#52c41a' : '#f5222d';
        return <span style={{ color }}>{`¥${text.toFixed(2)} (${(profitRatio * 100).toFixed(2)}%)`}</span>;
      },
    },
  ];

  if (!backtestStore.currentBacktest) {
    return <div>加载中...</div>;
  }

  const backtest = backtestStore.currentBacktest;
  // 从 summary 中获取所有需要的统计数据
  const { summary } = backtest;
  // 确保 profitRatio 可以从 summary 中获取，或者从 backtest 对象中获取
  const profitRatio = summary.profitRatio || (backtest.currentCapital - backtest.initialCapital) / backtest.initialCapital;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回
        </Button>
        <h2>{backtest.name} - 回测详情</h2>
      </Space>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="收益比例"
              value={profitRatio * 100}
              precision={2}
              valueStyle={{ color: profitRatio >= 0 ? '#52c41a' : '#f5222d' }}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正确率"
              value={summary.winRate * 100}
              precision={2}
              valueStyle={{ color: '#7b39ed' }}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="盈亏比"
              value={summary.profitFactor}
              precision={2}
              valueStyle={{ color: '#7b39ed' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="期望值"
              value={summary.expectation}
              precision={2}
              valueStyle={{ color: summary.expectation >= 0 ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Descriptions bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="策略名称">{backtest.strategyName}</Descriptions.Item>
        <Descriptions.Item label="初始资金">{`¥${backtest.initialCapital.toLocaleString()}`}</Descriptions.Item>
        <Descriptions.Item label="当前资金">{`¥${backtest.currentCapital.toLocaleString()}`}</Descriptions.Item>
        <Descriptions.Item label="最大回撤">{`${(summary.maxDrawdown * 100).toFixed(2)}%`}</Descriptions.Item>
        <Descriptions.Item label="交易次数">{summary.totalTrades}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{backtest.createTime.toLocaleString()}</Descriptions.Item>
      </Descriptions>

      <Tabs defaultActiveKey="1">
        <TabPane tab="交易记录" key="1">
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTransaction}>
              添加交易
            </Button>
          </div>
          <Table
            columns={transactionColumns}
            dataSource={transactionStore.transactions}
            rowKey="id"
            pagination={false}
          />
        </TabPane>
        <TabPane tab="持仓情况" key="2">
          <Table
            columns={positionColumns}
            dataSource={positionStore.positions}
            rowKey="id"
            pagination={false}
          />
        </TabPane>
      </Tabs>

      <Modal
        title="添加交易记录"
        open={transactionModalVisible}
        onCancel={() => setTransactionModalVisible(false)}
        onOk={handleSubmitTransaction}
        okText="添加"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="stockCode"
            label="选择股票"
            rules={[{ required: true, message: '请选择股票' }]}
          >
            <Select
              showSearch
              placeholder="请选择股票"
              optionFilterProp="children"
            >
              {stockStore.stocks.map(stock => (
                <Select.Option key={stock.id} value={stock.code}>
                  {stock.code} - {stock.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="type"
            label="交易类型"
            rules={[{ required: true, message: '请选择交易类型' }]}
          >
            <Select placeholder="请选择交易类型">
              <Select.Option value="BUY">买入</Select.Option>
              <Select.Option value="SELL">卖出</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="price"
            label="价格"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="请输入价格"
            />
          </Form.Item>
          <Form.Item
            name="shares"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              precision={0}
              placeholder="请输入数量"
            />
          </Form.Item>
          <Form.Item
            name="fee"
            label="手续费"
            initialValue={0}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="请输入手续费"
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => 
              getFieldValue('type') === 'SELL' ? (
                <Form.Item
                  name="profit"
                  label="盈亏金额"
                  rules={[{ required: true, message: '请输入盈亏金额' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    prefix="¥"
                    placeholder="请输入盈亏金额"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

export default withDBCheck(BacktestDetail);