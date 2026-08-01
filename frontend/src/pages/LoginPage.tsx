import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import { useAuth } from '../store/AuthContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: { login: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(values);
      login(data);
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 400,
          background: 'var(--paper-card)',
          border: '1px solid var(--ink-alpha-10)',
          borderRadius: 12,
          padding: '40px 36px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} className="font-kai" style={{ fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>
            ✎ 错题本
          </Title>
          <Text className="text-secondary">登录你的账户</Text>
        </div>

        <Form layout="vertical" size="large" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="login"
            rules={[{ required: true, message: '请输入用户名或邮箱' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--ink-secondary)' }} />}
              placeholder="用户名或邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--ink-secondary)' }} />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text className="text-tertiary" style={{ fontSize: 13 }}>还没有账户？</Text>
        </Divider>

        <Link to="/register">
          <Button block style={{ fontWeight: 500 }}>
            创建账户
          </Button>
        </Link>
      </div>
    </div>
  );
}
