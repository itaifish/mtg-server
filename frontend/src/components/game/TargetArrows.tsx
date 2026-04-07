import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { cardWorldPositions, globalCamera } from '@/components/game3d/cardPositions';

interface Arrow {
  key: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

export function TargetArrows() {
  const stack = useGameStore((s) => s.gameState?.stack);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const targetObjectIds = new Set<number>();
    for (const entry of stack ?? []) {
      for (const t of entry.targets ?? []) {
        if ('object' in t) targetObjectIds.add(t.object.objectId);
      }
    }
    if (targetObjectIds.size === 0) { setArrows([]); return; }

    const update = () => {
      const camera = globalCamera;
      const canvas = document.querySelector('canvas');
      if (!camera || !canvas) { rafRef.current = requestAnimationFrame(update); return; }
      const rect = canvas.getBoundingClientRect();

      const stackEl = document.querySelector('[data-stack-panel]');
      const stackRect = stackEl?.getBoundingClientRect();
      const stackX = stackRect ? stackRect.left : rect.right - 20;
      const stackCenterY = stackRect ? stackRect.top + stackRect.height / 2 : rect.top + rect.height / 2;

      const newArrows: Arrow[] = [];
      for (const objId of targetObjectIds) {
        const worldPos = cardWorldPositions.get(objId);
        if (!worldPos) continue;
        const projected = worldPos.clone().project(camera);
        const screenX = (projected.x * 0.5 + 0.5) * rect.width + rect.left;
        const screenY = (-projected.y * 0.5 + 0.5) * rect.height + rect.top;
        newArrows.push({ key: `${objId}`, x1: stackX, y1: stackCenterY, x2: screenX, y2: screenY });
      }
      setArrows(newArrows);
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stack]);

  if (arrows.length === 0) return null;

  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 25 }}>
      <defs>
        <marker id="target-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--color-gold)" />
        </marker>
      </defs>
      {arrows.map((a) => (
        <line
          key={a.key}
          x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="var(--color-gold)" strokeWidth={2} strokeDasharray="6 3"
          markerEnd="url(#target-arrowhead)" opacity={0.8}
        />
      ))}
    </svg>
  );
}
