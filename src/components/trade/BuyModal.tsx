import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Space, Button, DatePicker } from 'antd';
import { Stock } from '../../types/database';
import { calculateBuyFee } from '../../utils/feeCalculator';
import moment from 'moment';

interface BuyModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
  stocks: Stock[];
  maxCapital: number;
  lastTransaction?: {
    stockCode: string;
    price: number;
    timestamp?: number;  // 添加 timestamp
  };
}

const BuyModal: React.FC<BuyModalProps> = ({
  visible,
  onCancel,
  onOk,
  stocks,
  maxCapital,
  lastTransaction,
}) => {
  const [form] = Form.useForm();
  const [maxBuyQuantity, setMaxBuyQuantity] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalFee, setTotalFee] = useState(0);

  useEffect(() => {
    if (visible && lastTransaction) {
      form.setFieldsValue({
        stockCode: lastTransaction.stockCode,
        price: lastTransaction.price,
        timestamp: lastTransaction.timestamp ? moment(lastTransaction.timestamp) : undefined, // 设置默认日期
      });
      calculateMaxBuyQuantity(lastTransaction.price);
    }
  }, [visible, lastTransaction]);

  const calculateMaxBuyQuantity = (price: number) => {
    if (!price) return;
    const maxQuantity = Math.floor(maxCapital / price / 100) * 100;
    setMaxBuyQuantity(maxQuantity);
    updateFee();
    updateAmount(); // 添加金额更新
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
      const fee = calculateBuyFee(amount);
      form.setFieldValue('fee', fee);
      setTotalFee(fee);
      setTotalAmount(amount);
    }
  };

  // 快捷按钮点击时也需要更新手续费
  const handleQuickSelect = (shares: number) => {
    form.setFieldsValue({ shares });
    updateFee();
    updateAmount(); // 添加金额更新
  };

  const calculatePositionQuantity = (ratio: number) => {
    return Math.floor((maxBuyQuantity * ratio) / 100) * 100;
  };

  return (
    <Modal
      title="买入交易"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="买入"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onOk}
        initialValues={{ type: 'BUY', fee: 0 }}
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
          />
        </Form.Item>
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
            {stocks.map(stock => (
              <Select.Option key={stock.id} value={stock.code}>
                {stock.code} - {stock.name}
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
            onChange={(value) => {
              calculateMaxBuyQuantity(value as number);
              updateAmount();
            }}
          />
        </Form.Item>

        <Form.Item
          name="shares"
          label={`数量（最大可买入：${maxBuyQuantity.toLocaleString()}股）`}
          rules={[{ required: true, message: '请输入数量' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={100}
            step={100}
            precision={0}
            placeholder="请输入数量"
            max={maxBuyQuantity}
            onChange={() => {
              updateFee();
              updateAmount();
            }}
          />
        </Form.Item>
        <Form.Item>
          <Space wrap>
            <Button size="small" onClick={() => handleQuickSelect(100)}>
              100股
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(calculatePositionQuantity(0.25))}>
              1/4仓
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(calculatePositionQuantity(0.33))}>
              1/3仓
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(calculatePositionQuantity(0.5))}>
              半仓
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(calculatePositionQuantity(1))}>
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
          color: '#ff4d4f',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          <span style={{ marginRight: 16 }}>买入金额：¥ {totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span>实际发生：¥ {(totalAmount + totalFee).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </Form>
    </Modal>
  );
};

export default BuyModal;