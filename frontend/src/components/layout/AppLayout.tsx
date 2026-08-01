import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Layout, Menu, Avatar, Dropdown, type MenuProps } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  FormOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  FolderOpenOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../store/AuthContext';
import { Game24Provider } from '../game24/Game24Provider';
import Game24FloatingButton from '../game24/Game24FloatingButton';

const { Header, Sider, Content } = Layout;

const navItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/questions', icon: <FileTextOutlined />, label: '错题库' },
  { key: '/drafts', icon: <FolderOpenOutlined />, label: '草稿箱' },
  { key: '/ai-chat', icon: <RobotOutlined />, label: 'AI 答疑' },
  { key: '/review', icon: <FormOutlined />, label: '重做' },
  { key: '/stats', icon: <BarChartOutlined />, label: '统计' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, logout } = useAuth();

  const selectedKey = '/' + location.pathname.split('/')[1];

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: '个人资料' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '登出', danger: true },
  ];

  const handleUserMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'settings') {
      navigate('/settings');
    }
  };

  return (
    <Game24Provider>
      <Layout style={{ height: '100vh' }}>
      <Header
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span
            className="font-kai"
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            ✎ 错题本
          </span>
          <span className="font-mono text-tertiary" style={{ fontSize: 12 }}>
            {dayjs().format('YYYY.MM.DD')}
          </span>
        </div>

        <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Avatar size={32} src={state.user?.avatar_url} icon={<UserOutlined />} style={{ backgroundColor: 'var(--blue-ink)' }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
              {state.user?.username}
            </span>
          </div>
        </Dropdown>
      </Header>

      <Layout>
        <Sider
          width={200}
          style={{
            background: 'transparent',
            borderRight: '1px solid var(--ink-alpha-08)',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={navItems}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', background: 'transparent', marginTop: 8 }}
          />
        </Sider>

        <Content style={{ padding: 24, overflow: 'auto', background: 'transparent' }}>
          <div className="page-enter-active">
            <Outlet />
          </div>
        </Content>
      </Layout>
      </Layout>
      <Game24FloatingButton />
    </Game24Provider>
  );
}
