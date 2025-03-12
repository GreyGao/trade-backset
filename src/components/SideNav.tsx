import React from 'react';
import { Menu } from 'antd';
import { LineChartOutlined, AppstoreOutlined, StockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { DatabaseOutlined } from '@ant-design/icons';

interface SideNavProps {
  isDarkMode: boolean;
}

const SideNav: React.FC<SideNavProps> = ({ isDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 在菜单项中添加
  const items = [
    {
      key: '/backtests',
      icon: <LineChartOutlined />,
      label: '回测管理',
      onClick: () => navigate('/backtests'),
    },
    {
      key: '/strategies',
      icon: <AppstoreOutlined />,
      label: '策略管理',
      onClick: () => navigate('/strategies'),
    },
    {
      key: '/stocks',
      icon: <StockOutlined />,
      label: '股票池',
      onClick: () => navigate('/stocks'),
    },
    {
      key: '/data-management',
      icon: <DatabaseOutlined />,
      label: '数据管理',
      onClick: () => navigate('/data-management'),
    }
  ];

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      style={{ height: '100%', borderRight: 0 }}
      theme={isDarkMode ? 'dark' : 'light'}
      items={items}
    />
  );
};

export default SideNav;