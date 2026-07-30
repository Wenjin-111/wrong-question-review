import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Upload, Steps, Input, message, Space, Spin, Radio, Segmented, Switch, Tag } from 'antd';
import { CameraOutlined, ScanOutlined, RobotOutlined, CheckCircleOutlined, ArrowLeftOutlined, FileTextOutlined, EyeOutlined, CheckCircleFilled } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { uploadApi } from '../api/upload';
import { ocrApi } from '../api/ocr';
import { renderMarkdown } from '../utils/markdown';
import ImageCropper from '../components/common/ImageCropper';

const { Title, Text } = Typography;

type Step = 'upload' | 'crop' | 'ocr' | 'parse' | 'verify';

interface ImageFile {
  fileId: number;
  url: string;
  cropped: boolean;
  cropParams?: { x: number; y: number; width: number; height: number };
  rotation?: number;
}

export default function OCREntryPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [croppingIdx, setCroppingIdx] = useState<number | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrBlocks, setOcrBlocks] = useState<any[]>([]);
  const [ocrElapsed, setOcrElapsed] = useState(0);
  const [aiResult, setAiResult] = useState<Record<string, string> | null>(null);
  const [editedOcr, setEditedOcr] = useState('');
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState(() => localStorage.getItem('ocr_engine') || 'hunyuan');
  const [viewMode, setViewMode] = useState<'raw' | 'md'>('raw' as 'raw' | 'md');
  const [multiQuestion, setMultiQuestion] = useState(false);
  const processedRef = useRef(false);

  // Cleanup preview URLs
  const clearPreviews = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    const files = info.fileList.map((f) => f.originFileObj as File).filter(Boolean);
    clearPreviews();
    const urls = files.map((f) => URL.createObjectURL(f));
    setPendingFiles(files);
    setPreviewUrls(urls);
    processedRef.current = false;
  };

  const uploadAll = async (): Promise<ImageFile[]> => {
    const uploaded: ImageFile[] = [];
    for (const file of pendingFiles) {
      try {
        const { data } = await uploadApi.image(file);
        uploaded.push({ fileId: data.file_id, url: data.url, cropped: false });
      } catch {
        message.error(`${file.name} 上传失败`);
      }
    }
    if (uploaded.length > 0) {
      setImages(uploaded);
      clearPreviews();
      setPendingFiles([]);
    }
    return uploaded;
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCropDone = (crop: { x: number; y: number; width: number; height: number }, rotation: number) => {
    if (croppingIdx === null) return;
    const updated = [...images];
    updated[croppingIdx] = { ...updated[croppingIdx], cropped: true, cropParams: crop, rotation };
    setImages(updated);

    if (images.length === 1) {
      startOCRWithImages(updated);
    } else {
      // Auto-advance to next uncropped image, or back to grid if all done
      const next = images.findIndex((_, i) => i > croppingIdx && !updated[i].cropped);
      if (next >= 0) setCroppingIdx(next);
      else setCroppingIdx(null);
    }
  };

  const startOCRWithImages = async (imgs: ImageFile[]) => {
    setLoading(true);
    setStep('ocr');
    const allTexts: string[] = [];
    const allBlocks: any[] = [];
    let totalElapsed = 0;

    for (let i = 0; i < imgs.length; i++) {
      try {
        const img = imgs[i];
        const { data } = await ocrApi.recognize({
          image_file_id: img.fileId,
          crop: img.cropParams,
          rotation: img.rotation || 0,
          engine,
        });
        allTexts.push(data.raw_text || '');
        allBlocks.push(...(data.blocks || []));
        totalElapsed += data.elapsed || 0;
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        if (detail) message.error(detail);
        else message.error(`第 ${i + 1} 张图片识别失败`);
        allTexts.push(`[第 ${i + 1} 张识别失败]`);
      }
    }

    const combined = allTexts.join('\n\n---\n\n');
    setOcrText(combined);
    setOcrBlocks(allBlocks);
    setEditedOcr(combined);
    setOcrElapsed(Math.round(totalElapsed * 100) / 100);
    setLoading(false);
  };

  const stepOrder: Step[] = ['upload', 'crop', 'ocr', 'parse', 'verify'];

  const goBack = () => {
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]);
  };

  const handleAiParseRequest = async () => {
    setLoading(true);
    try {
      if (multiQuestion) {
        const { data } = await ocrApi.parseBatch({ ocr_text: editedOcr });
        const questions = data.questions || [];
        if (questions.length === 0) {
          message.warning('AI 未能解析出题目');
          return;
        }
        navigate('/questions/batch-edit', { state: { questions, raw_text: editedOcr } });
      } else {
        const { data } = await ocrApi.parse({ ocr_text: editedOcr });
        setAiResult(data);
        setStep('parse');
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'AI 解析失败');
    }
    finally { setLoading(false); }
  };

  const handleSkipAi = () => {
    if (multiQuestion) {
      navigate('/questions/batch-edit', {
        state: {
          questions: [{ question: editedOcr, answer: '', explanation: '', type: 'subjective' }],
          raw_text: editedOcr,
        },
      });
    } else {
      setStep('verify');
    }
  };

  const handleConfirm = () => {
    navigate('/questions/add', {
      state: {
        ocrData: {
          content: aiResult?.question || editedOcr,
          answer: aiResult?.answer || '',
          explanation: aiResult?.explanation || '',
          ocr_text: ocrText,
          image_file_id: images[0]?.fileId,
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

  const currentStepIdx = ['upload', 'crop', 'ocr', 'parse', 'verify'].indexOf(step);
  const allCropped = images.every((img) => img.cropped);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 20 }}>
        OCR 智能录入
      </Title>

      <Steps current={currentStepIdx} items={steps} style={{ marginBottom: 24 }} />

      <Card className="card-elevated" style={{ borderRadius: 14 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <Text className="text-secondary" style={{ display: 'block', marginTop: 12 }}>处理中...</Text>
          </div>
        )}

        {/* ---- Upload Step ---- */}
        {!loading && step === 'upload' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Upload.Dragger
              accept="image/*"
              multiple
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleFileChange}
              style={{ padding: 40 }}
            >
              <CameraOutlined style={{ fontSize: 48, color: '#007AFF', marginBottom: 16 }} />
              <Text strong style={{ fontSize: 16, display: 'block' }}>点击或拖拽上传题目图片（支持多张）</Text>
              <Text className="text-secondary" style={{ display: 'block', marginTop: 4 }}>支持 jpg/png/bmp/webp，最大 10MB / 张</Text>
            </Upload.Dragger>

            {previewUrls.length > 0 && (
              <div style={{ marginTop: 20, textAlign: 'left' }}>
                <Text strong>已选择 {previewUrls.length} 张图片：</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  {previewUrls.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 120, height: 120, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e5e5' }}>
                      <img src={url} alt="" style={{ width: 120, height: 120, objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                <Space style={{ marginTop: 16 }}>
                  <Button type="primary" onClick={async () => {
                    const imgs = await uploadAll();
                    if (imgs.length > 0) {
                      setCroppingIdx(0);
                      setStep('crop');
                    }
                  }}>
                    开始框选
                  </Button>
                  <Button onClick={async () => {
                    const imgs = await uploadAll();
                    if (imgs.length > 0) startOCRWithImages(imgs);
                  }}>
                    跳过框选，直接 OCR
                  </Button>
                </Space>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Text className="text-secondary" style={{ marginRight: 8 }}>OCR 引擎：</Text>
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
          </div>
        )}

        {/* ---- Crop Step: Cropping a specific image ---- */}
        {!loading && step === 'crop' && croppingIdx !== null && images[croppingIdx] && (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setCroppingIdx(null)}>
                  返回选择
                </Button>
                {images.length > 1 && (
                  <>
                    <Button
                      size="small"
                      disabled={croppingIdx === 0}
                      onClick={() => setCroppingIdx(croppingIdx - 1)}
                    >
                      上一张
                    </Button>
                    <Text className="text-secondary">第 {croppingIdx + 1}/{images.length} 张</Text>
                    <Button
                      size="small"
                      disabled={croppingIdx === images.length - 1}
                      onClick={() => setCroppingIdx(croppingIdx + 1)}
                    >
                      下一张
                    </Button>
                  </>
                )}
              </Space>
              <Button onClick={() => startOCRWithImages(images)}>跳过所有框选</Button>
            </div>

            {/* Thumbnail strip for quick navigation */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflow: 'auto', paddingBottom: 4 }}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCroppingIdx(idx)}
                    style={{
                      width: 56, height: 56, borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                      border: idx === croppingIdx ? '2px solid #007AFF' : '2px solid transparent',
                      opacity: img.cropped ? 0.5 : 1, flexShrink: 0, position: 'relative',
                    }}
                  >
                    <img src={img.url} alt="" style={{ width: 56, height: 56, objectFit: 'cover' }} />
                    {img.cropped && (
                      <CheckCircleFilled style={{
                        position: 'absolute', top: -2, right: -2, color: '#34C759',
                        fontSize: 16, background: '#fff', borderRadius: '50%',
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            <ImageCropper
              key={croppingIdx}
              src={images[croppingIdx].url}
              onCrop={handleCropDone}
              onSkip={() => {
                const updated = [...images];
                updated[croppingIdx] = { ...updated[croppingIdx], cropped: true };
                setImages(updated);
                if (images.length === 1) {
                  startOCRWithImages(updated);
                } else {
                  // Auto-advance to next uncropped image, or go back to grid
                  const next = images.findIndex((_, i) => i > croppingIdx && !updated[i].cropped);
                  if (next >= 0) setCroppingIdx(next);
                  else setCroppingIdx(null);
                }
              }}
            />
          </div>
        )}

        {/* ---- Crop Step: Grid view to pick which image to crop ---- */}
        {!loading && step === 'crop' && croppingIdx === null && images.length > 1 && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => { setStep('upload'); }}>
                返回上传
              </Button>
            </div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>
              选择要框选的图片（{images.filter((i) => i.cropped).length}/{images.length} 已框选）
            </Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setCroppingIdx(idx)}
                  style={{
                    width: 160, borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                    border: '2px solid #e5e5e5', transition: 'border-color 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#007AFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = img.cropped ? '#34C759' : '#e5e5e5')}
                >
                  <img src={img.url} alt="" style={{ width: 160, height: 120, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '8px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {img.cropped ? (
                      <>
                        <CheckCircleFilled style={{ color: '#34C759' }} />
                        <Text style={{ color: '#34C759' }}>已框选</Text>
                      </>
                    ) : (
                      <>
                        <ScanOutlined style={{ color: '#007AFF' }} />
                        <Text style={{ color: '#007AFF' }}>点击框选</Text>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <Button type="primary" onClick={() => startOCRWithImages(images)} disabled={!allCropped}>
                {allCropped ? '开始 OCR 识别' : '跳过剩余框选，开始 OCR'}
              </Button>
              <Button onClick={() => startOCRWithImages(images)}>跳过所有框选，直接 OCR</Button>
            </div>
          </div>
        )}

        {/* ---- OCR Step ---- */}
        {!loading && step === 'ocr' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack}>返回框选</Button>
            </div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>OCR 识别结果</Text>
            <Space style={{ marginBottom: 12 }}>
              {ocrElapsed > 0 && (
                <Tag color="blue" style={{ fontSize: 12 }}>总耗时 {ocrElapsed}s</Tag>
              )}
              {images.length > 1 && (
                <Tag color="green" style={{ fontSize: 12 }}>共 {images.length} 张图片</Tag>
              )}
            </Space>
            <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              请核对并修正识别结果
            </Text>

            <div style={{ marginBottom: 12, padding: '8px 16px', background: '#f5f5f7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 13 }}>题目模式：</Text>
              <Switch
                checked={multiQuestion}
                onChange={setMultiQuestion}
                checkedChildren="多题"
                unCheckedChildren="单题"
              />
              <Text className="text-secondary" style={{ fontSize: 12 }}>
                {multiQuestion
                  ? 'OCR 文本含多道题，AI 将拆分解析并跳转到批量编辑'
                  : 'OCR 文本属于同一道题，AI 将合并解析'}
              </Text>
            </div>

            <Segmented
              size="small"
              value={viewMode}
              onChange={(val) => setViewMode(val as 'raw' | 'md')}
              options={[
                { label: '原文', value: 'raw', icon: <FileTextOutlined /> },
                { label: 'Markdown 渲染', value: 'md', icon: <EyeOutlined /> },
              ]}
              style={{ marginBottom: 12 }}
            />
            {viewMode === 'raw' ? (
              <Input.TextArea
                value={editedOcr}
                onChange={(e) => setEditedOcr(e.target.value)}
                rows={18}
                style={{ fontSize: 14, lineHeight: 1.7, fontFamily: '"Cascadia Code", "Consolas", "SF Mono", monospace' }}
              />
            ) : (
              <div
                className="markdown-preview"
                style={{
                  border: '1px solid #e5e5e5', borderRadius: 8, padding: '16px 24px',
                  minHeight: 400, background: '#fafafa', fontSize: 15, lineHeight: 1.9,
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(editedOcr) }}
              />
            )}

            {ocrBlocks.length > 0 && engine === 'paddle' && (
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
              <Button type="primary" onClick={handleAiParseRequest} icon={<RobotOutlined />}>
                {multiQuestion ? 'AI 多题拆分解析' : 'AI 智能解析'}
              </Button>
              <Button onClick={handleSkipAi}>
                {multiQuestion ? '跳过 AI，手动编辑' : '跳过 AI，手动填写'}
              </Button>
            </div>
          </div>
        )}

        {/* ---- Parse Step (single question only) ---- */}
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
                  background: 'rgba(242,242,247,0.8)', padding: '12px 16px', borderRadius: 8, marginTop: 4,
                  minHeight: 40, fontSize: 14, lineHeight: 1.8,
                }}>
                  {item.value
                    ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(item.value) }} />
                    : <Text className="text-tertiary">未识别到，请手动填写</Text>
                  }
                </div>
              </div>
            ))}
            <Space style={{ marginTop: 8 }}>
              <Button type="primary" onClick={handleConfirm}>填入表单继续编辑</Button>
              <Button onClick={() => setStep('ocr')}>返回修正 OCR</Button>
            </Space>
          </div>
        )}

        {/* ---- Verify Step (single question, skip AI) ---- */}
        {!loading && step === 'verify' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ textAlign: 'left', marginBottom: 12 }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack}>返回上一步</Button>
            </div>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#34C759', marginBottom: 16 }} />
            <Text strong style={{ fontSize: 16, display: 'block' }}>OCR 识别完成 {ocrElapsed > 0 && `(耗时 ${ocrElapsed}s)`}</Text>
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
