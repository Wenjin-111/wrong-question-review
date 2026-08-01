import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import { useAuth } from '../store/AuthContext';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
  }) => {
    setLoading(true);
    try {
      const { data } = await authApi.register(values);
      login(data);
      message.success('注册成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '注册失败');
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
          width: 420,
          background: 'var(--paper-card)',
          border: '1px solid var(--ink-alpha-10)',
          borderRadius: 12,
          padding: '40px 36px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} className="font-kai" style={{ fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>
            创建账户
          </Title>
          <Text className="text-secondary">开始管理你的错题</Text>
        </div>

        <Form layout="vertical" size="large" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 20, message: '用户名长度 2-20 字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--ink-secondary)' }} />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: 'var(--ink-secondary)' }} />}
              placeholder="邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码最低 6 字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--ink-secondary)' }} />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--ink-secondary)' }} />}
              placeholder="确认密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              注册
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text className="text-tertiary" style={{ fontSize: 13 }}>已有账户？</Text>
        </Divider>

        <Link to="/login">
          <Button block style={{ fontWeight: 500 }}>
            返回登录
          </Button>
        </Link>
      </div>
    </div>
  );
}
