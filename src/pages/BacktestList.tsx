import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Table, Button, Typography, Modal, Form, InputNumber, Select, Space, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { rootStore } from '../stores';
import { Backtest } from '../types/database';
import { ColumnType } from 'antd/es/table';
import { withDBCheck } from '../components/withDBCheck';
import { formatTimestamp } from '../utils/dateFormat';

const { Title } = Typography;

const BacktestList: React.FC = observer(() => {
  const { backtestStore, strategyStore } = rootStore;
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    backtestStore.fetchBacktests();
    strategyStore.fetchStrategies();
  }, [backtestStore, strategyStore]);

  const handleAdd = () => {
    form.resetFields();
    setVisible(true);
  };

  // 修改参数类型和处理返回结果
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个回测吗？',
      onOk: async () => {
        const result = await backtestStore.deleteBacktest(id);
        if (!result.success) {
          message.error(result.error);
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const strategy = strategyStore.strategies.find(s => s.id === values.strategyId);
      if (!strategy) return;
      
      const now = Date.now()
      // 确保字段名与 Backtest 类型匹配
      const result = await backtestStore.addBacktest({
        name: values.name,
        strategyId: values.strategyId,
        strategyName: strategy.name,
        initialCapital: values.initialBalance,
        currentCapital: values.initialBalance,
        status: 'active',
        startDate: now,
        updateTime: now,
        notes: '',
      });
      
      if (!result.success) {
        message.error(result.error);
        return;
      }
      
      setVisible(false);
    } catch (error) {
      console.error('创建回测失败:', error);
    }
  };

  // 修改类型
  const columns: ColumnType<Backtest>[] = [
    {
      title: '回测名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '策略',
      dataIndex: 'strategyName',
      key: 'strategyName',
      width: 120,
    },
    {
      title: '初始资金',
      dataIndex: 'initialCapital', // 修改 initialBalance 为 initialCapital
      key: 'initialCapital',
      width: 100,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '当前资金',
      dataIndex: 'currentCapital', // 修改 currentBalance 为 currentCapital
      key: 'currentCapital',
      width: 100,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '收益比例',
      dataIndex: 'profitRatio',
      key: 'profitRatio',
      width: 100,
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
      // sorter: (a: Backtest, b: Backtest) => a.profitRatio - b.profitRatio,
    },
    {
      title: '正确率',
      dataIndex: 'winRate',
      key: 'winRate',
      width: 80,
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
      // sorter: (a: Backtest, b: Backtest) => a.winRate - b.winRate,
    },
    {
      title: '盈亏比',
      dataIndex: 'profitFactor',
      key: 'profitFactor',
      width: 80,
      render: (value: number) => value.toFixed(2),
      // sorter: (a: Backtest, b: Backtest) => a.profitFactor - b.profitFactor,
    },
    {
      title: '期望值',
      dataIndex: 'expectation',
      key: 'expectation',
      width: 80,
      render: (value: number) => value.toFixed(2),
      // sorter: (a: Backtest, b: Backtest) => a.expectation - b.expectation,
    },
    {
      title: '最大回撤',
      dataIndex: 'maxDrawdown',
      key: 'maxDrawdown',
      width: 80,
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
    },
    {
      title: '交易次数',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      width: 80,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (timestamp: number) => formatTimestamp(timestamp),
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Backtest) => (
        <Space>
          <Button type="primary" onClick={() => navigate(`/backtests/${record.id}`)}>
            详情
          </Button>
          <Button danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>回测管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建回测
        </Button>
      </div>

      <Table
        loading={backtestStore.loading}
        columns={columns}
        dataSource={backtestStore.backtests}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1500 }}
        rowClassName={(record) => record.summary.realizedProfit >= 0 ? 'profit-row' : 'loss-row'}
        summary={(pageData) => {
          let totalProfit = 0;
          let totalInitialCapital = 0; // 修改 totalInitialBalance 为 totalInitialCapital
          
          // pageData.forEach(({ profitRatio, initialCapital }) => { // 修改 initialBalance 为 initialCapital
          //   totalProfit += profitRatio || 0;
          //   totalInitialCapital += initialCapital || 0;
          // });
          
          const avgProfit = pageData.length ? totalProfit / pageData.length : 0;
          
          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>汇总</Table.Summary.Cell>
                <Table.Summary.Cell index={2}>{`¥${totalInitialCapital.toLocaleString()}`}</Table.Summary.Cell>
                <Table.Summary.Cell index={3}></Table.Summary.Cell>
                <Table.Summary.Cell index={4}>{`${(avgProfit * 100).toFixed(2)}%`}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={7}></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />

      <Modal
        title="新建回测"
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSubmit}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="回测名称"
            rules={[{ required: true, message: '请输入回测名称' }]}
          >
            <Input placeholder="请输入回测名称" />
          </Form.Item>
          <Form.Item
            name="strategyId"
            label="选择策略"
            rules={[{ required: true, message: '请选择策略' }]}
          >
            <Select placeholder="请选择策略">
              {strategyStore.strategies.map(strategy => (
                <Select.Option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="initialBalance"
            label="初始资金"
            initialValue={100000}
            rules={[{ required: true, message: '请输入初始资金' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1000}
              prefix="¥"
              placeholder="请输入初始资金"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

export default withDBCheck(BacktestList);