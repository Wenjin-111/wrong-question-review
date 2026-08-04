import { useState, useRef, useCallback } from 'react';
import { Button, Space } from 'antd';
import { RotateLeftOutlined, RotateRightOutlined } from '@ant-design/icons';

interface Props {
  src: string;
  onCrop: (crop: { x: number; y: number; width: number; height: number }, rotation: number) => void;
  onSkip: () => void;
}

interface Rect {
  x: number; y: number; width: number; height: number;
}

export default function ImageCropper({ src, onCrop, onSkip }: Props) {
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragCorner, setDragCorner] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrop({ x, y, width: 0, height: 0 });
    setDragStart({ x, y });
    setDragging(true);
    setDragCorner(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !crop) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragCorner) {
      // Resize from corner
      const newCrop = { ...crop };
      if (dragCorner.includes('e')) newCrop.width = Math.max(20, mx - crop.x);
      if (dragCorner.includes('w')) { newCrop.width = crop.x + crop.width - mx; newCrop.x = mx; newCrop.width = Math.max(20, newCrop.width); }
      if (dragCorner.includes('s')) newCrop.height = Math.max(20, my - crop.y);
      if (dragCorner.includes('n')) { newCrop.height = crop.y + crop.height - my; newCrop.y = my; newCrop.height = Math.max(20, newCrop.height); }
      setCrop(newCrop);
    } else {
      setCrop({
        x: Math.min(dragStart.x, mx),
        y: Math.min(dragStart.y, my),
        width: Math.abs(mx - dragStart.x),
        height: Math.abs(my - dragStart.y),
      });
    }
  }, [dragging, crop, dragStart, dragCorner]);

  const handleMouseUp = () => {
    setDragging(false);
    setDragCorner(null);
  };

  const rotate = (deg: number) => {
    setRotation((r) => (r + deg) % 360);
  };

  const confirmCrop = () => {
    if (crop && crop.width > 20 && crop.height > 20) {
      onCrop(crop, rotation);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Button icon={<RotateLeftOutlined />} onClick={() => rotate(-90)}>左转</Button>
          <Button icon={<RotateRightOutlined />} onClick={() => rotate(90)}>右转</Button>
          <Button onClick={onSkip}>完整解析</Button>
        </Space>
      </div>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          position: 'relative', display: 'inline-block', maxWidth: '100%',
          border: '1px solid var(--ink-alpha-10)', borderRadius: 10, overflow: 'hidden',
          cursor: 'crosshair', userSelect: 'none',
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt="题目图片"
          style={{
            maxWidth: '100%', maxHeight: 500, display: 'block',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.3s',
          }}
          draggable={false}
        />
        {crop && (
          <div
            style={{
              position: 'absolute', left: crop.x, top: crop.y,
              width: crop.width, height: crop.height,
              border: '2px solid var(--blue-ink)', background: 'var(--blue-ink-10)',
              pointerEvents: dragging ? 'none' : 'auto',
              borderRadius: 2,
            }}
          >
            {['nw', 'ne', 'sw', 'se'].map((corner) => (
              <div
                key={corner}
                onMouseDown={(e) => { e.stopPropagation(); setDragCorner(corner); setDragging(true); }}
                style={{
                  position: 'absolute', width: 10, height: 10, background: 'var(--blue-ink)', borderRadius: 5,
                  ...(corner.includes('n') ? { top: -5 } : { bottom: -5 }),
                  ...(corner.includes('w') ? { left: -5 } : { right: -5 }),
                  cursor: `${corner}-resize`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      {crop && crop.width > 20 && (
        <div style={{ marginTop: 12 }}>
          <Button type="primary" onClick={confirmCrop}>确认框选，开始解析</Button>
        </div>
      )}
      <div style={{ marginTop: 8, color: 'var(--ink-secondary)', fontSize: 13 }}>
        拖拽鼠标框选题目区域，拖拽四角可调整选区大小
      </div>
    </div>
  );
}
