import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Table, Button, Typography, Modal, Form, Input, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { rootStore } from '../stores';
import { Strategy } from '../types/database';
import { withDBCheck } from '../components/withDBCheck';
import { formatTimestamp } from '../utils/dateFormat';

const { Title } = Typography;

const StrategyList: React.FC = observer(() => {
  const { strategyStore } = rootStore;
  const [visible, setVisible] = useState(false);
  // 修改类型
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    strategyStore.fetchStrategies();
  }, [strategyStore]);

  const handleAdd = () => {
    setEditingStrategy(null);
    form.resetFields();
    setVisible(true);
  };

  // 修改类型
  const handleEdit = (record: Strategy) => {
    setEditingStrategy(record);
    form.setFieldsValue(record);
    setVisible(true);
  };

  // 修改参数类型和处理返回结果
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个策略吗？',
      onOk: async () => {
        const result = await strategyStore.deleteStrategy(id);
        if (!result.success) {
          message.error(result.error);
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingStrategy) {
        const result = await strategyStore.updateStrategy(editingStrategy.id, values);
        if (!result.success) {
          message.error(result.error);
          return;
        }
      } else {
        const result = await strategyStore.addStrategy(values);
        if (!result.success) {
          message.error(result.error);
          return;
        }
      }
      setVisible(false);
    } catch (error) {
      console.error('保存策略失败:', error);
    }
  };

  const columns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '策略描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (timestamp: number) => formatTimestamp(timestamp),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Strategy) => (
        <Space>
          <Button type="primary" onClick={() => handleEdit(record)}>编辑</Button>
          <Button danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>策略管理</Title>
        <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>
          新建策略
        </Button>
      </div>

      <Table
        loading={strategyStore.loading}
        columns={columns}
        dataSource={strategyStore.strategies}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingStrategy ? '编辑策略' : '新建策略'}
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSubmit}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="策略名称"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input placeholder="请输入策略名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="策略描述"
          >
            <Input.TextArea placeholder="请输入策略描述" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});


export default withDBCheck(StrategyList);