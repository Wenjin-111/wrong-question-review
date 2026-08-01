import { useEffect, useState } from 'react';
import { Tabs, Card, Button, Modal, Form, Input, InputNumber, Popconfirm, message, Empty, Space, Tag, Typography, Switch, Upload, Slider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, DownloadOutlined, PictureOutlined } from '@ant-design/icons';
import { subjectsApi } from '../api/subjects';
import { tagsApi } from '../api/tags';
import { settingsApi } from '../api/settings';
import { exportApi } from '../api/export';
import { uploadApi } from '../api/upload';
import { useGame24 } from '../components/game24/Game24Provider';
import { useTheme } from '../store/ThemeProvider';
import type { ThemeId } from '../styles/theme';
import type { Subject, Tag as TagType } from '../types';

const { Title, Text } = Typography;

// 学科数据色（存数据库并被 ECharts 使用，保持静态 hex）
const COLORS = ['#3B5BA5', '#E8A33D', '#E34A3E', '#4C8A3D', '#6B5BA5', '#B3261E', '#C77D3C', '#2E8B8B'];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Space size={8}>
      {COLORS.map((c) => (
        <div
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: 28, height: 28, borderRadius: 14, backgroundColor: c, cursor: 'pointer',
            border: value === c ? '3px solid var(--ink)' : '3px solid transparent',
            transition: 'border 0.15s',
          }}
        />
      ))}
    </Space>
  );
}

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: 720 }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>设置</Title>
      <Tabs
        tabPlacement="top"
        items={[
          { key: 'subjects', label: '学科管理', children: <SubjectsTab /> },
          { key: 'types', label: '题型管理', children: <TypesTab /> },
          { key: 'tags', label: '标签管理', children: <TagsTab /> },
          { key: 'spaced', label: '遗忘曲线', children: <SpacedTab /> },
          { key: 'ai', label: 'AI 配置', children: <AiConfigTab /> },
          { key: 'data', label: '数据管理', children: <DataTab /> },
          { key: 'game', label: '游戏', children: <GameTab /> },
          { key: 'appearance', label: '外观', children: <AppearanceTab /> },
        ]}
      />
    </div>
  );
}

function AppearanceTab() {
  const { theme, bgImage, bgOverlay, setTheme, setBgImage, setBgOverlay } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const fetchHistory = () => {
    settingsApi.getBgHistory().then(({ data }) => {
      setHistory((data as any).history ?? (data as any).data?.history ?? []);
    }).catch(() => {});
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleRemoveHistory = async (url: string) => {
    try {
      await settingsApi.deleteBgHistory(url);
      setHistory((hs) => hs.filter((h) => h !== url));
    } catch { message.error('删除失败'); }
  };

  const themeOptions: { id: ThemeId; name: string; desc: string; swatch: string[] }[] = [
    { id: 'paper', name: '纸本', desc: '米白纸色 · 错题本质感', swatch: ['#FAF6EF', '#FFFDF8', '#2C2B2A'] },
    { id: 'light', name: '白色', desc: '纯白干净 · 简洁明快', swatch: ['#FFFFFF', '#F3F4F6', '#1A1A1A'] },
    { id: 'dark', name: '黑色', desc: '深色护眼 · 专注模式', swatch: ['#121417', '#1C1F24', '#E6E8EB'] },
  ];

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { data } = await uploadApi.image(file);
      const ok = await setBgImage(data.url);
      if (ok) {
        message.success('背景已更新');
        fetchHistory();
      } else {
        message.error('保存失败');
      }
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  return (
    <Card className="card-elevated" style={{ borderRadius: 10 }}>
      <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>界面主题</Text>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {themeOptions.map((t) => (
          <div
            key={t.id}
            onClick={() => setTheme(t.id)}
            style={{
              width: 150, padding: 12, borderRadius: 10, cursor: 'pointer',
              border: theme === t.id ? '2px solid var(--blue-ink)' : '1px solid var(--border-light)',
              background: 'var(--paper-card)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {t.swatch.map((c, i) => (
                <div key={i} style={{ flex: 1, height: 28, borderRadius: 6, background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
              ))}
            </div>
            <Text strong style={{ display: 'block' }}>{t.name}</Text>
            <Text className="text-tertiary" style={{ fontSize: 12 }}>{t.desc}</Text>
          </div>
        ))}
      </div>

      <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>自定义背景</Text>
      <Space direction="vertical" size={12}>
        {bgImage && (
          <img src={bgImage} alt="背景预览"
            style={{ maxWidth: 320, maxHeight: 120, borderRadius: 8, border: '1px solid var(--border-light)', objectFit: 'cover' }} />
        )}
        <Space>
          <Upload showUploadList={false} accept="image/*" beforeUpload={handleUpload}>
            <Button icon={<PictureOutlined />} loading={uploading}>{bgImage ? '更换背景' : '上传背景照片'}</Button>
          </Upload>
          {bgImage && <Button danger onClick={() => setBgImage('')}>移除背景</Button>}
        </Space>
        <Text className="text-tertiary" style={{ fontSize: 12 }}>
          背景图将显示在所有页面背后，系统会自动加半透明遮罩保证文字可读；建议使用浅色图片。
        </Text>

        {history.length > 0 && (
          <div>
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>历史背景</Text>
            <Space wrap size={10}>
              {history.map((url) => {
                const active = bgImage === url;
                return (
                  <div key={url} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt="历史背景"
                      onClick={() => setBgImage(url)}
                      style={{
                        width: 84, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                        border: active ? '2px solid var(--blue-ink)' : '1px solid var(--border-light)',
                        opacity: 1,
                      }}
                    />
                    {active && (
                      <span style={{
                        position: 'absolute', left: 4, top: 3, fontSize: 10, lineHeight: '16px',
                        padding: '0 5px', borderRadius: 4, background: 'var(--blue-ink)', color: '#fff',
                      }}>
                        使用中
                      </span>
                    )}
                    <Popconfirm title="从历史中移除？" onConfirm={() => handleRemoveHistory(url)}>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ position: 'absolute', right: -6, top: -6, background: 'var(--paper-card)', fontSize: 11 }}
                      />
                    </Popconfirm>
                  </div>
                );
              })}
            </Space>
            <Text className="text-tertiary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              点击缩略图可快捷切换背景，最多保留 10 张。
            </Text>
          </div>
        )}

        <div>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>背景遮罩强度</Text>
          <Space>
            <Slider
              min={0}
              max={100}
              value={Number.isFinite(bgOverlay) ? Math.round(bgOverlay * 100) : 68}
              onChange={(v) => setBgOverlay(v / 100)}
              disabled={!bgImage}
              style={{ width: 220 }}
            />
            <Text className="text-secondary" style={{ fontSize: 13, width: 40 }}>
              {Number.isFinite(bgOverlay) ? Math.round(bgOverlay * 100) : 68}%
            </Text>
          </Space>
          <Text className="text-tertiary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
            {bgImage ? '越高背景越不透明（文字更清晰），越低照片越清晰。建议 50% - 80%。' : '请先上传背景照片，再调节遮罩强度。'}
          </Text>
        </div>
      </Space>
    </Card>
  );
}

function SubjectsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form] = Form.useForm();
  const [color, setColor] = useState('var(--blue-ink)');

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data } = await subjectsApi.list();
      setSubjects(data);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setColor('var(--blue-ink)'); setModalOpen(true); };
  const openEdit = (s: Subject) => { setEditing(s); form.setFieldsValue(s); setColor(s.color); setModalOpen(true); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await subjectsApi.update(editing.id, { name: values.name, color });
        message.success('已更新');
      } else {
        await subjectsApi.create({ name: values.name, color });
        message.success('已创建');
      }
      setModalOpen(false);
      fetchSubjects();
    } catch (err: any) { message.error(err.response?.data?.detail || '操作失败'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await subjectsApi.delete(id);
      message.success('已删除');
      fetchSubjects();
    } catch (err: any) { message.error(err.response?.data?.detail || '删除失败'); }
  };

  return (
    <Card className="card-elevated" style={{ borderRadius: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontWeight: 600, fontSize: 16 }}>我的学科</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建学科</Button>
      </div>
      {subjects.length === 0 && !loading ? (
        <Empty description="还没有学科，点击上方按钮创建" />
      ) : (
        subjects.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--ink-alpha-04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.color }} />
              <div>
                <Text strong>{s.name}</Text>
                <Text className="text-secondary" style={{ fontSize: 13, display: 'block' }}>{s.question_count ?? 0} 道错题</Text>
              </div>
            </div>
            <Space>
              <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(s)} />
              <Popconfirm title="确定删除该学科及所有下属题型？" onConfirm={() => handleDelete(s.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </div>
        ))
      )}

      <Modal title={editing ? '编辑学科' : '新建学科'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="学科名称" rules={[{ required: true, message: '请输入学科名称' }]}>
            <Input placeholder="如：高等数学" />
          </Form.Item>
          <Form.Item label="颜色标记">
            <ColorPicker value={color} onChange={setColor} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function TypesTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [form] = Form.useForm();

  const fetchSubjects = async () => {
    try {
      const { data } = await subjectsApi.list();
      setSubjects(data);
    } catch { message.error('加载失败'); }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const openCreate = (subjectId: number) => {
    setSelectedSubjectId(subjectId);
    form.resetFields();
    setModalOpen(true);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await subjectsApi.createType(selectedSubjectId, { name: values.name });
      message.success('题型已创建');
      setModalOpen(false);
      fetchSubjects();
    } catch (err: any) { message.error(err.response?.data?.detail || '操作失败'); }
  };

  const handleDeleteType = async (typeId: number) => {
    try {
      await subjectsApi.deleteType(typeId);
      message.success('已删除');
      fetchSubjects();
    } catch (err: any) { message.error(err.response?.data?.detail || '删除失败'); }
  };

  return (
    <Card className="card-elevated" style={{ borderRadius: 14 }}>
      <Text style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 20 }}>题型管理</Text>
      {subjects.map((s) => (
        <div key={s.id} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
            <Text strong>{s.name}</Text>
            <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => openCreate(s.id)}>添加题型</Button>
          </div>
          <div style={{ paddingLeft: 18 }}>
            {s.question_types?.map((qt) => (
              <div key={qt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <Text className="text-secondary">{qt.name}</Text>
                <Popconfirm title="确定删除该题型？" onConfirm={() => handleDeleteType(qt.id)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Modal title="添加题型" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="题型名称" rules={[{ required: true, message: '请输入题型名称' }]}>
            <Input placeholder="如：多选题" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function TagsTab() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TagType | null>(null);
  const [form] = Form.useForm();
  const [color, setColor] = useState('var(--blue-ink)');

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data } = await tagsApi.list();
      setTags(data);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTags(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setColor('var(--blue-ink)'); setModalOpen(true); };
  const openEdit = (t: TagType) => { setEditing(t); form.setFieldsValue(t); setColor(t.color); setModalOpen(true); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await tagsApi.update(editing.id, { name: values.name, color });
        message.success('已更新');
      } else {
        await tagsApi.create({ name: values.name, color });
        message.success('已创建');
      }
      setModalOpen(false);
      fetchTags();
    } catch (err: any) { message.error(err.response?.data?.detail || '操作失败'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await tagsApi.delete(id);
      message.success('已删除');
      fetchTags();
    } catch (err: any) { message.error(err.response?.data?.detail || '删除失败'); }
  };

  return (
    <Card className="card-elevated" style={{ borderRadius: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontWeight: 600, fontSize: 16 }}>我的标签</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建标签</Button>
      </div>
      {tags.length === 0 && !loading ? (
        <Empty description="还没有标签，点击上方按钮创建" />
      ) : (
        <Space size={[8, 8]} wrap>
          {tags.map((t) => (
            <Tag
              key={t.id}
              color={t.color}
              closable={false}
              style={{ fontSize: 14, padding: '4px 12px', borderRadius: 6, cursor: 'default' }}
            >
              <Space size={4}>
                {t.name}
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(t)} style={{ color: 'inherit' }} />
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(t.id)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </Tag>
          ))}
        </Space>
      )}

      <Modal title={editing ? '编辑标签' : '新建标签'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}>
            <Input placeholder="如：高考真题" />
          </Form.Item>
          <Form.Item label="颜色标记">
            <ColorPicker value={color} onChange={setColor} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function SpacedTab() {
  const [retention, setRetention] = useState(90);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.getFsrsRetention().then(({ data }) => {
      const v = (data.data || data).retention;
      if (v) setRetention(Math.round(v * 100));
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try { await settingsApi.updateFsrsRetention(retention / 100); message.success('已保存'); }
    catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  return (
    <Card className="card-elevated" style={{ borderRadius: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>FSRS 目标保留率</Text>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
      </div>
      <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
        FSRS（Free Spaced Repetition Scheduler）是目前最先进的间隔复习算法。它根据你每次答题的评分，
        动态计算每道题的<b>稳定性</b>和<b>难度</b>，自动安排最优复习时间。
      </Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <InputNumber value={retention} onChange={(v) => setRetention(v || 90)} min={70} max={99} step={1}
          style={{ width: 100 }} addonAfter="%" />
        <Text className="text-secondary" style={{ fontSize: 13 }}>
          {retention >= 95 ? '高频复习，记忆牢固但题量大' : retention >= 85 ? '平衡模式，推荐' : '低频复习，适合题目很多的场景'}
        </Text>
      </div>

      <div style={{ padding: 16, background: 'var(--paper-bg-50)', borderRadius: 12, marginBottom: 16 }}>
        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>算法原理</Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: '稳定性 (Stability)', desc: '记忆的牢固程度。值越大，下次复习间隔越长。答对上升，答错骤降。' },
            { label: '难度 (Difficulty)', desc: '题目对你有多难 (0-1)。影响稳定性增长速度，难题涨得慢。' },
            { label: '可提取性 (Retrievability)', desc: '当前还记得这道题的概率。降到低于目标保留率时触发复习。' },
            { label: '评分映射', desc: '完全忘了→1 · 勉强想起→2 · 顺利答对→3 · 太简单了→4。评分越高稳定性增长越快。' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', gap: 8 }}>
              <Text strong style={{ fontSize: 13, minWidth: 140, color: 'var(--blue-ink)' }}>{item.label}</Text>
              <Text style={{ fontSize: 13, color: 'var(--ink)' }}>{item.desc}</Text>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 12, background: 'var(--paper-bg-40)', borderRadius: 10 }}>
        <Text className="text-tertiary" style={{ fontSize: 12 }}>
          常用参考：语言学习 90-95% · 考试备考 85-90% · 知识回顾 80-85%
        </Text>
      </div>
    </Card>
  );
}

function AiConfigTab() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.getAiConfig().then(({ data }) => {
      form.setFieldsValue(data.data || data);
    }).catch(() => {});
  }, [form]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try { await settingsApi.updateAiConfig(values); message.success('已保存'); }
    catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  return (
    <Card className="card-elevated" style={{ borderRadius: 14 }}>
      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>AI 配置</Text>
      <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>OpenAI 兼容 API，密钥 Fernet 加密存储</Text>
      <Form form={form} layout="vertical">
        <Form.Item name="api_url" label="API 地址" rules={[{ required: true }]}>
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item name="api_key" label="API Key">
          <Input.Password placeholder="sk-..." />
        </Form.Item>
        <Form.Item name="model" label="模型名称" rules={[{ required: true }]}>
          <Input placeholder="gpt-4o" />
        </Form.Item>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存配置</Button>
      </Form>
    </Card>
  );
}

function GameTab() {
  const { enabled, setEnabled, loading } = useGame24();
  const [saving, setSaving] = useState(false);

  const handleChange = async (checked: boolean) => {
    setSaving(true);
    const ok = await setEnabled(checked);
    if (!ok) message.error('保存失败，请重试');
    setSaving(false);
  };

  return (
    <Card className="card-elevated" style={{ borderRadius: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 16, display: 'block' }}>算24小游戏</Text>
          <Text className="text-secondary" style={{ fontSize: 13 }}>
            开启后在页面左下角显示游戏入口悬浮按钮，可自由拖拽位置
          </Text>
        </div>
        <Switch checked={enabled} loading={loading || saving} onChange={handleChange} />
      </div>
      <div style={{ padding: 16, background: 'var(--paper-bg-50)', borderRadius: 12 }}>
        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>玩法说明</Text>
        <Text style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>
          用加、减、乘、除和括号，将 4 个数字凑成 24。支持两种模式：
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Text style={{ fontSize: 13, color: 'var(--ink)' }}>· <b>练习</b>：不限时，可看答案、换题，按难度分级（简单 1-9 整数解 / 中等 1-10 常规解 / 困难 1-13 分数解）</Text>
          <Text style={{ fontSize: 13, color: 'var(--ink)' }}>· <b>挑战</b>：60 秒限时计分，答对得 10 分</Text>
        </div>
      </div>
    </Card>
  );
}

function DataTab() {
  const [exporting, setExporting] = useState('');

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      const { data } = await exportApi.exportData(format);
      const blob = new Blob([data as any]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'json_with_images' ? 'export.zip' : 'export.json';
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch { message.error('导出失败'); }
    finally { setExporting(''); }
  };

  return (
    <Card className="card-elevated" style={{ borderRadius: 14 }}>
      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>数据导出</Text>
      <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
        导出你的所有错题数据，支持 JSON 格式用于备份或迁移到其他平台
      </Text>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button block icon={<DownloadOutlined />} loading={exporting === 'json'} onClick={() => handleExport('json')}>
          导出 JSON 数据
        </Button>
        <Button block icon={<DownloadOutlined />} loading={exporting === 'json_with_images'} onClick={() => handleExport('json_with_images')}>
          导出 JSON + 图片 (ZIP)
        </Button>
      </Space>
    </Card>
  );
}
