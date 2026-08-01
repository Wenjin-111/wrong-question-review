import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useGame24 } from './Game24Provider';
import Game24Modal from './Game24Modal';

const SIZE = 56;
const STORAGE_KEY = 'game24_fab_pos';

interface Pos {
  x: number;
  y: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function loadPos(): Pos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Pos;
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        return {
          x: clamp(p.x, 0, Math.max(0, window.innerWidth - SIZE)),
          y: clamp(p.y, 0, Math.max(0, window.innerHeight - SIZE)),
        };
      }
    }
  } catch {}
  return { x: 24, y: Math.max(0, window.innerHeight - SIZE - 24) };
}

export default function Game24FloatingButton() {
  const { enabled } = useGame24();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>(loadPos);
  const posRef = useRef(pos);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  if (!enabled) return null;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true;
    const next = {
      x: clamp(d.origX + dx, 0, Math.max(0, window.innerWidth - SIZE)),
      y: clamp(d.origY + dy, 0, Math.max(0, window.innerHeight - SIZE)),
    };
    posRef.current = next;
    setPos(next);
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    if (!d) return;
    const wasClick = !d.moved;
    dragRef.current = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
    if (wasClick) setOpen(true);
  };

  return (
    <>
      <div
        title="算24"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--red-pen), var(--red-pen-deep))',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 700,
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
          boxShadow: '0 4px 16px rgba(255, 59, 48, 0.35)',
          zIndex: 999,
        }}
      >
        24
      </div>
      <Game24Modal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
