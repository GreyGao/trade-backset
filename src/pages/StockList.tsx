import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Table, Button, Typography, Modal, Form, Input, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { rootStore } from '../stores';
import { Stock } from '../types/database';
import { withDBCheck } from '../components/withDBCheck';

const { Title } = Typography;

const StockList: React.FC = observer(() => {
  const { stockStore } = rootStore;
  const [visible, setVisible] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    stockStore.fetchStocks();
  }, [stockStore]);

  const handleAdd = () => {
    setEditingStock(null);
    form.resetFields();
    setVisible(true);
  };

  const handleEdit = (record: Stock) => {
    setEditingStock(record);
    form.setFieldsValue(record);
    setVisible(true);
  };

  // 修改参数类型和处理返回结果
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个股票吗？',
      onOk: async () => {
        const result = await stockStore.deleteStock(id);
        if (!result.success) {
          message.error(result.error);
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingStock) {
        const result = await stockStore.updateStock(editingStock.id, values);
        if (!result.success) {
          message.error(result.error);
          return;
        }
      } else {
        const result = await stockStore.addStock(values);
        if (!result.success) {
          message.error(result.error);
          return;
        }
      }
      setVisible(false);
    } catch (error) {
      console.error('保存股票失败:', error);
    }
  };

  const columns = [
    {
      title: '股票代码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Stock) => (
        <Space>
          <Button type="primary" onClick={() => handleEdit(record)}>编辑</Button>
          <Button danger onClick={() => handleDelete(record.id!)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>股票池</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加股票
        </Button>
      </div>

      <Table
        loading={stockStore.loading}
        columns={columns}
        dataSource={stockStore.stocks}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingStock ? '编辑股票' : '添加股票'}
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSubmit}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="股票代码"
            rules={[
              { required: true, message: '请输入股票代码' },
              { pattern: /^\d{6}$/, message: '股票代码必须是6位数字' }
            ]}
          >
            <Input placeholder="请输入股票代码，如：000001" />
          </Form.Item>
          <Form.Item
            name="name"
            label="股票名称"
            rules={[{ required: true, message: '请输入股票名称' }]}
          >
            <Input placeholder="请输入股票名称，如：平安银行" />
          </Form.Item>
          <Form.Item
            name="note"
            label="备注"
          >
            <Input.TextArea placeholder="请输入备注信息（可选）" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

export default withDBCheck(StockList);