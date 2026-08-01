import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Popconfirm, message, Empty, Space } from 'antd';
import { DeleteOutlined, EditOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { draftApi } from '../api/draft';
import { renderMarkdown } from '../utils/markdown';

const { Title, Text } = Typography;

export default function DraftBoxPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<any[]>([]);

  const fetchDrafts = () => {
    draftApi.list().then(({ data }) => {
      setDrafts((data.data || data || []));
    }).catch(() => {});
  };

  useEffect(() => { fetchDrafts(); }, []);

  const handleDelete = async (id: number) => {
    const prev = drafts;
    setDrafts((ds) => ds.filter((d) => d.id !== id));
    try {
      await draftApi.delete(id);
    } catch {
      setDrafts(prev);
      message.error('删除失败');
    }
  };

  const handleEdit = async (draftId: number) => {
    try {
      const { data } = await draftApi.get(draftId);
      const d = data.data || data;
      navigate('/questions/add', {
        state: {
          draftData: {
            subject_id: d.subject_id,
            question_type_id: d.question_type_id,
            content: d.content,
            answer: d.answer,
            explanation: d.explanation,
            source: d.source,
            tag_ids: d.tag_ids,
          },
          draftId: draftId,
        },
      });
    } catch { message.error('加载草稿失败'); }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>草稿箱</Title>
        <Text className="text-secondary">最多 100 份草稿</Text>
      </div>

      {drafts.length === 0 ? (
        <Card className="card-elevated" style={{ borderRadius: 14 }}>
          <Empty description="草稿箱为空。在添加错题或 OCR 录入时可保存草稿。" image={<FolderOpenOutlined style={{ fontSize: 48, color: 'var(--ink-tertiary)' }} />} />
        </Card>
      ) : (
        drafts.map((d: any) => (
          <Card key={d.id} className="card-elevated" style={{ borderRadius: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div
                  className="markdown-body"
                  style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 8 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(d.content || '') }}
                />
                <Text className="text-tertiary" style={{ fontSize: 12 }}>
                  最后保存：{new Date(d.updated_at).toLocaleString()}
                </Text>
              </div>
              <Space>
                <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(d.id)}>编辑</Button>
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(d.id)}>
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
