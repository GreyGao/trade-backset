import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout, ConfigProvider, theme as antdTheme, Switch, Space } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { theme } from './theme';
import SideNav from './components/SideNav';
import StrategyList from './pages/StrategyList';
import BacktestList from './pages/BacktestList';
import BacktestDetail from './pages/BacktestDetail';
import StockList from './pages/StockList';
import { db } from './db'
import './styles/index.css'
import DataManagement from './pages/DataManagement';

const { Sider, Content, Header } = Layout;

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <ConfigProvider
      theme={{
        ...theme,
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <Router>
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
            background: isDarkMode ? '#1f1f1f' : '#fff',
            boxShadow: '0 1px 4px rgba(118, 117, 117, 0.1)',
            color: isDarkMode ? 'white' : 'rgba(0, 0, 0, 0.85)'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7b39ed' }}>
              <span style={{ color: isDarkMode ? '#FFF' : '#666' }}>灰的策略回测系统</span> <sup style={{ fontSize: '12px' }}>v1</sup>
            </div>
            <Space>
              <span>
                {isDarkMode ? '暗色' : '亮色'}主题
              </span>
              <Switch
                checkedChildren={<BulbFilled />}
                unCheckedChildren={<BulbOutlined />}
                checked={isDarkMode}
                onChange={toggleTheme}
              />
            </Space>
          </Header>
          <Layout>
            <Sider width={200} theme={isDarkMode ? 'dark' : 'light'}>
              <SideNav isDarkMode={isDarkMode} />
            </Sider>
            <Content style={{ padding: '24px', overflow: 'auto' }}>
              <Routes>
                <Route path="/" element={<BacktestList />} />
                <Route path="/strategies" element={<StrategyList />} />
                <Route path="/backtests" element={<BacktestList />} />
                <Route path="/backtests/:id" element={<BacktestDetail />} />
                <Route path="/stocks" element={<StockList />} />
                <Route path="/data-management" element={<DataManagement />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App;
