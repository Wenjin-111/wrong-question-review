import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1D1D1F',
            letterSpacing: '-0.02em',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          错题集
        </span>

        <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Avatar size={32} src={state.user?.avatar_url} icon={<UserOutlined />} style={{ backgroundColor: '#007AFF' }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F' }}>
              {state.user?.username}
            </span>
          </div>
        </Dropdown>
      </Header>

      <Layout>
        <Sider
          width={200}
          style={{
            background: 'rgba(242,242,247,0.6)',
            borderRight: '1px solid rgba(60,60,67,0.06)',
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

        <Content style={{ padding: 24, overflow: 'auto', background: '#F2F2F7' }}>
          <div className="page-enter-active">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
