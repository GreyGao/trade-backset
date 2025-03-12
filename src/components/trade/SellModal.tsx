import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Space, Button, DatePicker } from 'antd';
import { Position, Stock } from '../../types/database';
import { calculateSellFee } from '../../utils/feeCalculator';
import moment from 'moment';

interface SellModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
  positions: Position[];
  lastTransaction?: {
    stockCode: string;
    price: number;
    timestamp: number;
  };
}

const SellModal: React.FC<SellModalProps> = ({
  visible,
  onCancel,
  onOk,
  positions,
  lastTransaction,
}) => {
  const [form] = Form.useForm();
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalFee, setTotalFee] = useState(0);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (lastTransaction) {
        form.setFieldsValue({
          timestamp: moment(lastTransaction.timestamp),
        });
      }
    }
  }, [visible, lastTransaction, form]);

  // 当选择股票时更新持仓信息
  const handleStockChange = (stockCode: string) => {
    const position = positions.find(p => p.stockCode === stockCode);
    if (position) {
      setSelectedPosition(position);
      form.setFieldsValue({
        price: position.marketPrice || position.avgCost,
        shares: 0
      });
      updateFee();
    }
  };

  // 更新计算总金额的函数
  const updateAmount = () => {
    const price = form.getFieldValue('price');
    const shares = form.getFieldValue('shares');
    if (price && shares) {
      const amount = price * shares;
      setTotalAmount(amount);
    } else {
      setTotalAmount(0);
    }
  };

  // 添加自动计算手续费的函数
  const updateFee = () => {
    const price = form.getFieldValue('price');
    const shares = form.getFieldValue('shares');
    if (price && shares) {
      const amount = price * shares;
      const fee = calculateSellFee(amount);
      form.setFieldValue('fee', fee);
      setTotalFee(fee);
      setTotalAmount(amount);
    }
  };

  // 快捷按钮点击时也需要更新手续费
  const handleQuickSelect = (shares: number) => {
    form.setFieldsValue({ shares });
    updateFee();
    updateAmount();
  };

  // 计算留仓数量
  const calculateRemainingQuantity = (ratio: number) => {
    if (!selectedPosition) return 0;
    return Math.floor(selectedPosition.quantity * (1 - ratio) / 100) * 100;
  };

  // 计算卖出数量
  const calculateSellQuantity = (ratio: number) => {
    if (!selectedPosition) return 0;
    return Math.floor(selectedPosition.quantity * ratio / 100) * 100;
  };

  return (
    <Modal
      title="卖出交易"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="卖出"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onOk}
        initialValues={{ type: 'SELL', fee: 0 }}
      >
        <Form.Item name="type" hidden><Input /></Form.Item>
        <Form.Item
          name="timestamp"
          label="交易日期"
          rules={[{ required: true, message: '请选择交易日期' }]}
        >
          <DatePicker 
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            placeholder="请选择交易日期"
            defaultValue={moment()}
          />
        </Form.Item>
        <Form.Item
          name="stockCode"
          label="选择股票"
          rules={[{ required: true, message: '请选择股票' }]}
        >
          <Select
            showSearch
            placeholder="请选择持仓股票"
            optionFilterProp="children"
            onChange={handleStockChange}
          >
            {positions.map(position => (
              <Select.Option key={position.id} value={position.stockCode}>
                {position.stockCode} - {position.stockName} (持有: {position.quantity}股)
              </Select.Option>
            ))}
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
            onChange={() => {
              updateFee();
              updateAmount();
            }}
          />
        </Form.Item>

        <Form.Item
          name="shares"
          label={`数量（最大可卖出：${selectedPosition ? selectedPosition.quantity.toLocaleString() : 0}股）`}
          rules={[
            { required: true, message: '请输入数量' },
            {
              validator: (_, value) => {
                if (!selectedPosition || value <= selectedPosition.quantity) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('卖出数量不能超过持仓数量'));
              }
            }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={100}
            step={100}
            precision={0}
            placeholder="请输入数量"
            max={selectedPosition?.quantity || 0}
            onChange={() => {
              updateFee();
              updateAmount();
            }}
          />
        </Form.Item>
        <Form.Item>
          <Space wrap>
            <Button size="small" onClick={() => handleQuickSelect(selectedPosition ? selectedPosition.quantity - 100 : 0)}>
              留100股
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(calculateSellQuantity(0.25))}>
              1/4仓
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(calculateSellQuantity(0.33))}>
              1/3仓
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(calculateSellQuantity(0.5))}>
              半仓
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(selectedPosition?.quantity || 0)}>
              全仓
            </Button>
          </Space>
        </Form.Item>
        <Form.Item
          name="fee"
          label="手续费"
        >
          <InputNumber
            style={{ width: '100%' }}
            precision={2}
            prefix="¥"
            disabled
          />
        </Form.Item>
        <div style={{
          fontSize: '13px',
          color: '#52c41a',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          <span style={{ marginRight: 16 }}>卖出金额：¥ {totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span>实际到账：¥ {(totalAmount - totalFee).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </Form>
    </Modal>
  );
};

export default SellModal;