import { useState } from 'react';
import { Card, Typography, Form, Input, Button, Upload, Avatar, message, Divider } from 'antd';
import { UserOutlined, CameraOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../store/AuthContext';
import { settingsApi } from '../api/settings';
import { authApi } from '../api/auth';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { state, login } = useAuth();
  const user = state.user;
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const handleUpload = async (file: File) => {
    try {
      const { data } = await settingsApi.uploadAvatar(file);
      const url = data.avatar_url || (data.data && data.data.avatar_url);
      if (user && url) {
        const updatedUser = { ...user, avatar_url: url };
        const token = localStorage.getItem('access_token') || '';
        const refresh = localStorage.getItem('refresh_token') || '';
        localStorage.setItem('user', JSON.stringify(updatedUser));
        login({ access_token: token, refresh_token: refresh, user: updatedUser });
      }
      message.success('头像已更新');
    } catch (err: any) { message.error(err?.response?.data?.detail || '上传失败'); }
    return false;
  };

  const handleSaveInfo = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await settingsApi.updateUserInfo(values);
      if (user && values.username) {
        const at = localStorage.getItem('access_token');
        const rt = localStorage.getItem('refresh_token');
        if (at && rt) {
          login({ access_token: at, refresh_token: rt, user: { ...user, username: values.username, email: values.email || user.email } });
        }
      }
      message.success('已保存');
    } catch (err: any) { message.error(err.response?.data?.detail || '保存失败'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    const values = await pwdForm.validateFields();
    setPwdSaving(true);
    try {
      await settingsApi.updatePassword(values);
      message.success('密码已修改');
      pwdForm.resetFields();
    } catch (err: any) { message.error(err.response?.data?.detail || '修改失败'); }
    finally { setPwdSaving(false); }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>个人资料</Title>

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16, textAlign: 'center' }}>
        <Upload showUploadList={false} accept="image/*" beforeUpload={handleUpload}>
          <div style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}>
            <Avatar size={80} src={user?.avatar_url} icon={<UserOutlined />} style={{ backgroundColor: '#007AFF' }} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: 14, background: '#007AFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff',
            }}>
              <CameraOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
          </div>
        </Upload>
        <Text strong style={{ fontSize: 17, display: 'block', marginTop: 12 }}>{user?.username}</Text>
        <Text className="text-secondary">{user?.email}</Text>
      </Card>

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}
        title={<Text strong>基本信息</Text>}>
        <Form form={form} layout="vertical" initialValues={{ username: user?.username, email: user?.email }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, min: 2, max: 20 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Button type="primary" loading={saving} onClick={handleSaveInfo}>保存修改</Button>
        </Form>
      </Card>

      <Card className="card-elevated" style={{ borderRadius: 14 }}
        title={<Text strong>修改密码</Text>}>
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="old_password" label="旧密码" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Button type="primary" loading={pwdSaving} onClick={handleChangePassword}>修改密码</Button>
        </Form>
      </Card>
    </div>
  );
}
