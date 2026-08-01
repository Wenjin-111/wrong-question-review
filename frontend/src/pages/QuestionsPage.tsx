import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Input, Select, Button, Space, Popconfirm, message, Tag, Typography, Segmented, Pagination } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, EditOutlined, DownloadOutlined, TableOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import QuestionCardGrid from '../components/question/QuestionCardGrid';
import { questionsApi } from '../api/questions';
import { subjectsApi } from '../api/subjects';
import { tagsApi } from '../api/tags';
import { exportApi } from '../api/export';
import type { Subject, Tag as TagType } from '../types';
import dayjs from 'dayjs';

const { Text } = Typography;

interface QuestionItem {
  id: number;
  code: string;
  content: string;
  content_plain?: string;
  subject_id: number;
  subject_name: string;
  subject_color: string;
  type_name: string;
  tag_names: string[];
  accuracy: number;
  total_attempts: number;
  created_at: string;
}

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<QuestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [view, setView] = useState<'table' | 'card'>(() => localStorage.getItem('questions_view') === 'card' ? 'card' : 'table');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(value), 400);
  };

  const pageSize = view === 'card' ? 9 : 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await questionsApi.list({
        ...filters,
        keyword: debouncedKeyword || undefined,
        page,
        page_size: pageSize,
      });
      setData(res.items || []);
      setTotal(res.total || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, filters, debouncedKeyword, view]);

  useEffect(() => {
    subjectsApi.list().then(({ data }) => setSubjects(data)).catch(() => {});
    tagsApi.list().then(({ data }) => setTags(data)).catch(() => {});
  }, []);

  // 按题型名合并：同名题型（各学科各一个）归为一类，value 为逗号分隔的 type_id 列表
  const typeOptions = useMemo(() => {
    const map = new Map<string, number[]>();
    subjects.forEach((s) =>
      (s.question_types || []).forEach((t) => {
        const ids = map.get(t.name) || [];
        ids.push(t.id);
        map.set(t.name, ids);
      }),
    );
    return Array.from(map.entries()).map(([name, ids]) => ({
      label: name,
      value: ids.join(','),
    }));
  }, [subjects]);

  const handleDelete = async (id: number) => {
    await questionsApi.delete(id);
    message.success('已删除');
    fetchData();
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    await questionsApi.batchDelete(selectedIds);
    message.success(`已删除 ${selectedIds.length} 题`);
    setSelectedIds([]);
    fetchData();
  };

  const handleExport = async (format: string, mode?: string) => {
    try {
      const { data } = await exportApi.exportData(format, selectedIds.length > 0 ? selectedIds : undefined, undefined, mode);
      const url = window.URL.createObjectURL(new Blob([data as any]));
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'pdf' ? '错题导出.pdf' : `export.${format === 'json_with_images' ? 'zip' : 'json'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch { message.error('导出失败'); }
  };

  const exportMenuItems: MenuProps['items'] = [
    { key: 'json', label: '导出 JSON 数据' },
    { key: 'json_with_images', label: '导出 JSON + 图片 (ZIP)' },
    { type: 'divider' },
    { key: 'pdf_full', label: '导出 PDF (解析模式)' },
    { key: 'pdf_exam', label: '导出 PDF (试卷模式)' },
  ];

  const handleExportMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'pdf_full') handleExport('pdf', 'full');
    else if (key === 'pdf_exam') handleExport('pdf', 'exam');
    else handleExport(key);
  };

  const columns: ColumnsType<QuestionItem> = [
    {
      title: '编号', dataIndex: 'code', width: 180,
      render: (code: string) => (
        <Text style={{ fontFamily: 'monospace', fontWeight: 500, fontSize: 13 }}>{code}</Text>
      ),
    },
    {
      title: '学科', dataIndex: 'subject_name', width: 90,
      render: (name: string, r: QuestionItem) => (
        <Space size={4}>
          <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.subject_color }} />
          <Text>{name}</Text>
        </Space>
      ),
    },
    { title: '题型', dataIndex: 'type_name', width: 80 },
    {
      title: '标签', dataIndex: 'tag_names', width: 160,
      render: (names: string[]) => (
        <Space size={4} wrap>
          {names?.slice(0, 3).map((n) => <Tag key={n} style={{ borderRadius: 5 }}>{n}</Tag>)}
          {(names?.length || 0) > 3 && <Text className="text-secondary">+{names!.length - 3}</Text>}
        </Space>
      ),
    },
    {
      title: '正确率', dataIndex: 'accuracy', width: 80,
      render: (v: number, r: QuestionItem) => r.total_attempts > 0 ? `${v.toFixed(0)}%` : '--',
    },
    {
      title: '录入时间', dataIndex: 'created_at', width: 110,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
    {
      title: '操作', width: 140,
      render: (_, r: QuestionItem) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/questions/${r.id}`)} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => navigate(`/questions/add?edit=${r.id}`)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em' }}>错题库</Text>
        <Space>
          <Segmented
            value={view}
            onChange={(v) => {
              setView(v as 'table' | 'card');
              setPage(1);
              localStorage.setItem('questions_view', v as string);
            }}
            options={[
              { label: '表格', value: 'table', icon: <TableOutlined /> },
              { label: '卡片', value: 'card', icon: <AppstoreOutlined /> },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/questions/add')}>添加错题</Button>
        </Space>
      </div>

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
        <Space wrap size={12}>
          <Input.Search
            placeholder="搜索题目..."
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onSearch={() => { if (debounceRef.current) { clearTimeout(debounceRef.current); setDebouncedKeyword(keyword); } }}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="学科" allowClear style={{ width: 120 }}
            onChange={(v) => setFilters({ ...filters, subject_id: v })}
            options={subjects.map((s) => ({ label: s.name, value: String(s.id) }))}
          />
          <Select
            placeholder="题型" allowClear style={{ width: 130 }}
            onChange={(v) => setFilters({ ...filters, type_id: v })}
            options={typeOptions}
          />
          <Select
            placeholder="标签" allowClear style={{ width: 120 }}
            onChange={(v) => setFilters({ ...filters, tag_id: v })}
            options={tags.map((t) => ({ label: t.name, value: String(t.id) }))}
          />
          <Select
            placeholder="排序" defaultValue="created_at_desc" style={{ width: 130 }}
            onChange={(v) => setFilters({ ...filters, sort: v })}
            options={[
              { label: '最新录入', value: 'created_at_desc' },
              { label: '最早录入', value: 'created_at_asc' },
            ]}
          />
          {selectedIds.length > 0 && (
            <Popconfirm title={`确定删除选中的 ${selectedIds.length} 题？`} onConfirm={handleBatchDelete}>
              <Button danger icon={<DeleteOutlined />}>批量删除</Button>
            </Popconfirm>
          )}
          <Dropdown menu={{ items: exportMenuItems, onClick: handleExportMenu }}>
            <Button icon={<DownloadOutlined />}>导出</Button>
          </Dropdown>
        </Space>
      </Card>

      {view === 'card' ? (
        <>
          <QuestionCardGrid
            items={data}
            selectedIds={selectedIds}
            loading={loading}
            onToggleSelect={(id) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])}
            onView={(id) => navigate(`/questions/${id}`)}
            onEdit={(id) => navigate(`/questions/add?edit=${id}`)}
            onDelete={handleDelete}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Pagination current={page} total={total} pageSize={pageSize} showTotal={(t) => `共 ${t} 题`} onChange={(p) => setPage(p)} />
          </div>
        </>
      ) : (
        <Card className="card-elevated" style={{ borderRadius: 14 }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys as number[]) }}
            pagination={{
              current: page, total, pageSize: pageSize, showTotal: (t) => `共 ${t} 题`,
              onChange: (p) => setPage(p),
            }}
            size="middle"
            locale={{ emptyText: '还没有错题，点击上方"添加错题"开始' }}
          />
        </Card>
      )}
    </div>
  );
}
