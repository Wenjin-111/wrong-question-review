import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Upload, Spin, message, Radio, Steps, Tag } from 'antd';
import { FilePdfOutlined, LoadingOutlined, CheckCircleFilled } from '@ant-design/icons';
import { ocrApi } from '../api/ocr';

const { Title, Text } = Typography;

interface Timing {
  pdf_to_images: number;
  ocr_per_page: number[];
  ai_parse: number;
  total: number;
}

const stepLabels = ['渲染 PDF 为图片', '逐页 OCR 识别', 'AI 题目解析'] as const;

export default function PDFImportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState(() => localStorage.getItem('ocr_engine') || 'hunyuan');
  const [result, setResult] = useState<{ timing: Timing; pageCount: number; questionCount: number; questions: any[]; rawText: string } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate step progress while waiting for the synchronous API call
  useEffect(() => {
    if (loading) {
      setCurrentStep(0);
      stepTimer.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < 2) return prev + 1;
          return prev;
        });
      }, 3000);
    } else {
      if (stepTimer.current) clearInterval(stepTimer.current);
    }
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, [loading]);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await ocrApi.pdfOcr(file, engine);
      const questions = data.questions || [];
      const timing = data.timing as Timing;

      if (questions.length === 0) {
        message.warning('未能从 PDF 中识别到题目');
        return;
      }

      // Show timing result briefly, then navigate
      setResult({ timing, pageCount: data.page_count, questionCount: questions.length, questions, rawText: data.raw_text });

      setTimeout(() => {
        navigate('/questions/batch-edit', {
          state: { questions, raw_text: data.raw_text },
        });
      }, 2000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail) {
        message.error(detail);
      } else if (err.code === 'ECONNABORTED') {
        message.error('PDF 处理超时，请尝试减少页数或更换 OCR 引擎');
      } else {
        message.error('PDF 处理失败');
      }
    } finally {
      setLoading(false);
    }
    return false;
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>
        PDF 智能导入
      </Title>

      <Card className="card-elevated" style={{ borderRadius: 14, textAlign: 'center', padding: 40 }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            <Spin size="large" />
            <Text strong style={{ display: 'block', marginTop: 20, fontSize: 15 }}>
              正在处理 PDF...
            </Text>

            <div style={{ maxWidth: 400, margin: '24px auto 0', textAlign: 'left' }}>
              {stepLabels.map((label, idx) => {
                const done = result ? true : idx < currentStep;
                const active = !result && idx === currentStep;
                return (
                  <div
                    key={label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', borderBottom: '1px solid rgba(60,60,67,0.06)',
                      color: done ? '#333' : '#bbb',
                    }}
                  >
                    {done ? (
                      <CheckCircleFilled style={{ color: '#34C759', fontSize: 18 }} />
                    ) : active ? (
                      <LoadingOutlined style={{ color: '#007AFF', fontSize: 18 }} />
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #ddd' }} />
                    )}
                    <Text style={{ flex: 1, fontWeight: done ? 500 : 400 }}>{label}</Text>
                    {result?.timing && (
                      <Tag style={{ fontSize: 12, fontFamily: 'monospace' }}>
                        {idx === 0
                          ? `${result.timing.pdf_to_images}s`
                          : idx === 1
                            ? `${result.timing.ocr_per_page.reduce((a: number, b: number) => a + b, 0).toFixed(1)}s（${result.timing.ocr_per_page.length} 页）`
                            : `${result.timing.ai_parse}s`}
                      </Tag>
                    )}
                    {active && !result && <Text className="text-secondary" style={{ fontSize: 12 }}>进行中...</Text>}
                  </div>
                );
              })}
              {result?.timing && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderTop: '2px solid #e5e5e5', marginTop: 4,
                }}>
                  <CheckCircleFilled style={{ color: '#007AFF', fontSize: 18 }} />
                  <Text strong style={{ flex: 1 }}>全部完成</Text>
                  <Tag color="blue" style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
                    总耗时 {result.timing.total}s
                  </Tag>
                </div>
              )}
            </div>

            {result && (
              <Text className="text-secondary" style={{ display: 'block', marginTop: 16 }}>
                解析出 {result.questionCount} 道题目，即将跳转到批量编辑...
              </Text>
            )}
          </div>
        ) : result ? (
          <div style={{ padding: 40 }}>
            <CheckCircleFilled style={{ fontSize: 48, color: '#34C759', marginBottom: 16 }} />
            <Text strong style={{ fontSize: 16, display: 'block' }}>处理完成</Text>
            <Text className="text-secondary" style={{ display: 'block', marginTop: 4 }}>
              {result.pageCount} 页 PDF → {result.questionCount} 道题目，总耗时 {result.timing.total}s
            </Text>
            <Button type="primary" style={{ marginTop: 20 }} onClick={() => navigate('/questions/batch-edit', { state: { questions: result.questions, raw_text: result.rawText } })}>
              进入批量编辑
            </Button>
          </div>
        ) : (
          <Upload.Dragger accept=".pdf" showUploadList={false} beforeUpload={handleUpload} style={{ padding: 30 }}>
            <FilePdfOutlined style={{ fontSize: 48, color: '#FF3B30', marginBottom: 12 }} />
            <Text strong style={{ fontSize: 16, display: 'block' }}>
              点击或拖拽上传 PDF
            </Text>
            <Text className="text-secondary" style={{ display: 'block', marginTop: 4 }}>
              最大 50MB，最多 30 页，自动 OCR 识别 + AI 题目拆分
            </Text>
            <div style={{ marginTop: 12 }}>
              <Text className="text-secondary" style={{ marginRight: 8, fontSize: 13 }}>
                OCR 引擎：
              </Text>
              <Radio.Group
                value={engine}
                onChange={(e) => {
                  setEngine(e.target.value);
                  localStorage.setItem('ocr_engine', e.target.value);
                }}
                optionType="button"
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="hunyuan">HunyuanOCR（云端）</Radio.Button>
                <Radio.Button value="paddle">PaddleOCR（本地）</Radio.Button>
              </Radio.Group>
            </div>
          </Upload.Dragger>
        )}
      </Card>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <Button type="text" onClick={() => navigate('/questions/add')} style={{ color: '#86868B' }}>
          返回手动录入
        </Button>
      </div>
    </div>
  );
}
