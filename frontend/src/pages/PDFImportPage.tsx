import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Upload, Spin, Checkbox, message } from 'antd';
import { FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { ocrApi } from '../api/ocr';

const { Title, Text } = Typography;

export default function PDFImportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [fileName, setFileName] = useState('');

  const handleUpload = async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    try {
      const { data } = await ocrApi.extractPdf(file);
      setPages((data.data || data).pages || []);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'PDF 解析失败');
    } finally { setLoading(false); }
    return false;
  };

  const handleImport = () => {
    if (selected.length === 0) { message.warning('请至少选择一页'); return; }
    const texts = selected.map((i) => pages[i]?.text || '').join('\n---\n');
    navigate('/questions/add', { state: { ocrData: { content: texts.replace(/\n/g, '<br>'), answer: '', explanation: '' } } });
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>PDF 导入</Title>

      {pages.length === 0 && (
        <Card className="card-elevated" style={{ borderRadius: 14, textAlign: 'center', padding: 40 }}>
          {loading ? (
            <div><Spin size="large" /><Text className="text-secondary" style={{ display: 'block', marginTop: 12 }}>正在解析 PDF...</Text></div>
          ) : (
            <Upload.Dragger accept=".pdf" showUploadList={false} beforeUpload={handleUpload} style={{ padding: 30 }}>
              <FilePdfOutlined style={{ fontSize: 48, color: '#FF3B30', marginBottom: 12 }} />
              <Text strong style={{ fontSize: 16, display: 'block' }}>点击或拖拽上传 PDF</Text>
              <Text className="text-secondary" style={{ display: 'block', marginTop: 4 }}>最大 50MB，最多 200 页</Text>
            </Upload.Dragger>
          )}
        </Card>
      )}

      {pages.length > 0 && (
        <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}
          title={<Text strong>{fileName} — {pages.length} 页</Text>}
          extra={<Button onClick={() => { setPages([]); setSelected([]); }}>重新上传</Button>}>
          <Checkbox.Group value={selected} onChange={(v) => setSelected(v as number[])} style={{ width: '100%' }}>
            {pages.map((p: any) => (
              <div key={p.page_num} style={{ padding: '10px 0', borderBottom: '1px solid rgba(60,60,67,0.04)' }}>
                <Checkbox value={p.page_num - 1} style={{ marginRight: 12 }} />
                <Text strong style={{ marginRight: 12 }}>第 {p.page_num} 页</Text>
                <Text className="text-secondary" style={{ fontSize: 13 }}>{p.text?.slice(0, 100)}{(p.text?.length || 0) > 100 ? '...' : ''}</Text>
              </div>
            ))}
          </Checkbox.Group>
        </Card>
      )}

      {pages.length > 0 && (
        <div style={{ textAlign: 'center' }}>
          <Button type="primary" size="large" icon={<FileTextOutlined />} onClick={handleImport}
            disabled={selected.length === 0} style={{ borderRadius: 10, padding: '0 40px', fontWeight: 600 }}>
            导入选中页面 ({selected.length})
          </Button>
        </div>
      )}
    </div>
  );
}
