import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Upload, Steps, Input, message, Space, Spin } from 'antd';
import { CameraOutlined, ScanOutlined, RobotOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { uploadApi } from '../api/upload';
import { ocrApi } from '../api/ocr';
import { draftApi } from '../api/draft';
import ImageCropper from '../components/common/ImageCropper';

const { Title, Text } = Typography;

type Step = 'upload' | 'crop' | 'ocr' | 'parse' | 'verify';

export default function OCREntryPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [fileId, setFileId] = useState<number>(0);
  const [ocrText, setOcrText] = useState('');
  const [ocrBlocks, setOcrBlocks] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<Record<string, string> | null>(null);
  const [editedOcr, setEditedOcr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const { data } = await uploadApi.image(file);
      setImageUrl(data.url);
      setFileId(data.file_id);
      setStep('crop');
    } catch { message.error('图片上传失败'); }
    finally { setLoading(false); }
    return false;
  };

  const handleCrop = async (crop: { x: number; y: number; width: number; height: number }, rotation: number) => {
    setLoading(true);
    try {
      const { data } = await ocrApi.recognize({ image_file_id: fileId, crop, rotation });
      setOcrText(data.raw_text || '');
      setOcrBlocks(data.blocks || []);
      setEditedOcr(data.raw_text || '');
      setStep('ocr');
    } catch (err: any) {
      if (err.response?.status === 501) {
        message.warning('OCR 服务未安装，请先安装依赖');
      } else {
        message.error('OCR 识别失败');
      }
    }
    finally { setLoading(false); }
  };

  const stepOrder: Step[] = ['upload', 'crop', 'ocr', 'parse', 'verify'];

  const goBack = () => {
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]);
  };

  const handleSkipCrop = async () => {
    setLoading(true);
    try {
      const { data } = await ocrApi.recognize({ image_file_id: fileId });
      setOcrText(data.raw_text || '');
      setOcrBlocks(data.blocks || []);
      setEditedOcr(data.raw_text || '');
      setStep('ocr');
    } catch { message.error('OCR 识别失败'); }
    finally { setLoading(false); }
  };

  const handleAiParse = async () => {
    setLoading(true);
    try {
      const { data } = await ocrApi.parse({ ocr_text: editedOcr });
      setAiResult(data);
      setStep('parse');
    } catch (err: any) { message.error(err.response?.data?.detail || 'AI 解析失败'); }
    finally { setLoading(false); }
  };

  const handleSkipAi = () => {
    setStep('verify');
  };

  const handleConfirm = () => {
    navigate('/questions/add', {
      state: {
        ocrData: {
          content: aiResult?.question || editedOcr,
          answer: aiResult?.answer || '',
          explanation: aiResult?.explanation || '',
          ocr_text: ocrText,
          image_file_id: fileId,
        },
      },
    });
  };

  const steps = [
    { title: '上传', icon: <CameraOutlined /> },
    { title: '框选', icon: <ScanOutlined /> },
    { title: 'OCR', icon: <ScanOutlined /> },
    { title: 'AI 解析', icon: <RobotOutlined /> },
    { title: '确认', icon: <CheckCircleOutlined /> },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 20 }}>
        OCR 智能录入
      </Title>

      <Steps current={['upload','crop','ocr','parse','verify'].indexOf(step)} items={steps} style={{ marginBottom: 24 }} />

      <Card className="card-elevated" style={{ borderRadius: 14 }}>
        {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /><Text className="text-secondary" style={{ display: 'block', marginTop: 12 }}>处理中...</Text></div>}

        {!loading && step === 'upload' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Upload.Dragger accept="image/*" showUploadList={false} beforeUpload={handleUpload} style={{ padding: 40 }}>
              <CameraOutlined style={{ fontSize: 48, color: '#007AFF', marginBottom: 16 }} />
              <Text strong style={{ fontSize: 16, display: 'block' }}>点击或拖拽上传题目图片</Text>
              <Text className="text-secondary" style={{ display: 'block', marginTop: 4 }}>支持 jpg/png/bmp/webp，最大 10MB</Text>
            </Upload.Dragger>
          </div>
        )}

        {!loading && step === 'crop' && imageUrl && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack}>返回上一步</Button>
            </div>
            <ImageCropper src={imageUrl} onCrop={handleCrop} onSkip={handleSkipCrop} />
          </div>
        )}

        {!loading && step === 'ocr' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack}>返回框选</Button>
            </div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>OCR 识别结果</Text>
            <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              请核对并修正识别结果，修正后点击 AI 智能解析
            </Text>
            <Input.TextArea
              value={editedOcr}
              onChange={(e) => setEditedOcr(e.target.value)}
              rows={8}
              style={{ fontSize: 14, lineHeight: 1.6 }}
            />
            {ocrBlocks.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text className="text-secondary" style={{ fontSize: 12 }}>
                  置信度低片段：
                  {ocrBlocks.filter((b: any) => b.confidence < 0.7).map((b: any, i: number) => (
                    <span key={i} style={{ background: '#FFF3CD', padding: '1px 4px', borderRadius: 3, margin: '0 4px' }}>
                      {b.text} ({Math.round(b.confidence * 100)}%)
                    </span>
                  ))}
                  {ocrBlocks.filter((b: any) => b.confidence < 0.7).length === 0 && ' 无'}
                </Text>
              </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <Button type="primary" onClick={handleAiParse} icon={<RobotOutlined />}>AI 智能解析</Button>
              <Button onClick={handleSkipAi}>跳过 AI，手动填写</Button>
            </div>
          </div>
        )}

        {!loading && step === 'parse' && aiResult && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack}>返回修正 OCR</Button>
            </div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>AI 解析结果</Text>
            {[
              { label: '题目内容', key: 'question', value: aiResult.question },
              { label: '正确答案', key: 'answer', value: aiResult.answer },
              { label: '解析', key: 'explanation', value: aiResult.explanation },
            ].map((item) => (
              <div key={item.key} style={{ marginBottom: 16 }}>
                <Text strong style={{ color: '#007AFF' }}>{item.label}</Text>
                <div style={{
                  background: 'rgba(242,242,247,0.8)', padding: 12, borderRadius: 8, marginTop: 4,
                  minHeight: 40, fontSize: 14, lineHeight: 1.6,
                }}>
                  {item.value || <Text className="text-tertiary">未识别到，请手动填写</Text>}
                </div>
              </div>
            ))}
            <Space style={{ marginTop: 8 }}>
              <Button type="primary" onClick={handleConfirm}>填入表单继续编辑</Button>
              <Button onClick={() => setStep('ocr')}>返回修正 OCR</Button>
            </Space>
          </div>
        )}

        {!loading && step === 'verify' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ textAlign: 'left', marginBottom: 12 }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack}>返回上一步</Button>
            </div>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#34C759', marginBottom: 16 }} />
            <Text strong style={{ fontSize: 16, display: 'block' }}>OCR 识别完成</Text>
            <Text className="text-secondary" style={{ display: 'block', marginTop: 4, marginBottom: 20 }}>
              识别结果将作为草稿保存，您可以在编辑页面中继续完善
            </Text>
            <Button type="primary" onClick={handleConfirm}>填入表单继续编辑</Button>
          </div>
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
