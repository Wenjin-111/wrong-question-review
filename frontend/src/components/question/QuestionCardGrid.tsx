import { Card, Checkbox, Row, Col, Space, Tag, Typography, Button, Popconfirm, Empty, Spin } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { renderMarkdown } from '../../utils/markdown';

const { Text } = Typography;

interface Item {
  id: number;
  code: string;
  content: string;
  content_plain?: string;
  subject_name: string;
  subject_color: string;
  type_name: string;
  tag_names: string[];
  accuracy: number;
  total_attempts: number;
  created_at: string;
}

interface Props {
  items: Item[];
  selectedIds: number[];
  loading?: boolean;
  onToggleSelect: (id: number) => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function QuestionCardGrid({ items, selectedIds, loading, onToggleSelect, onView, onEdit, onDelete }: Props) {
  if (items.length === 0) {
    return <Empty description="还没有错题，点击上方「添加错题」开始" />;
  }
  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        {items.map((q) => {
          const selected = selectedIds.includes(q.id);
          return (
            <Col xs={24} sm={12} lg={8} key={q.id}>
              <Card
                hoverable
                className="card-elevated"
                style={{
                  borderRadius: 10,
                  height: '100%',
                  cursor: 'pointer',
                  border: selected ? '2px solid var(--blue-ink)' : undefined,
                }}
                bodyStyle={{ padding: '14px 16px' }}
                onClick={() => onView(q.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <Checkbox checked={selected} onClick={(e) => e.stopPropagation()} onChange={() => onToggleSelect(q.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: q.subject_color, flexShrink: 0 }} />
                      <Text strong style={{ fontSize: 14 }}>{q.subject_name}</Text>
                      <Tag style={{ borderRadius: 4, marginLeft: 'auto', fontSize: 11, lineHeight: '18px' }}>{q.type_name}</Tag>
                    </div>
                    <Text className="text-tertiary" style={{ fontSize: 11, fontFamily: 'Consolas, "Cascadia Mono", monospace' }}>
                      {q.code}
                    </Text>
                  </div>
                </div>

                <div
                  className="markdown-body"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--ink)',
                    maxHeight: '4.8em',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    marginBottom: 10,
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(q.content || q.content_plain || '') }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: q.total_attempts > 0
                      ? (q.accuracy >= 60 ? 'var(--blue-ink)' : q.accuracy >= 40 ? 'var(--amber-deep)' : 'var(--red-pen-deep)')
                      : 'var(--ink-tertiary)',
                  }}>
                    {q.total_attempts > 0 ? `正确率 ${Math.round(q.accuracy)}%` : '未作答'}
                  </Text>
                  <Space size={0} onClick={(e) => e.stopPropagation()}>
                    <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => onView(q.id)} />
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(q.id)} />
                    <Popconfirm title="确定删除？" onConfirm={() => onDelete(q.id)}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Spin>
  );
}
