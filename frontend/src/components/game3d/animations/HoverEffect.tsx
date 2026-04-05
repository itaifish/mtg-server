import { type ReactNode, useState } from 'react';
import { useSpring, animated } from '@react-spring/three';
import type { ThreeEvent } from '@react-three/fiber';

interface HoverEffectProps {
  children: ReactNode;
  /** Scale multiplier on hover (default 1.08) */
  hoverScale?: number;
  /** Y-axis lift on hover in scene units (default 0.15) */
  hoverLift?: number;
  /** Whether the effect is enabled (default true) */
  enabled?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

/**
 * Reusable hover effect wrapper: scales up and lifts on pointer hover.
 * Uses @react-spring/three for smooth spring animation.
 */
export function HoverEffect({
  children,
  hoverScale = 1.08,
  hoverLift = 0.15,
  enabled = true,
  onHoverStart,
  onHoverEnd,
}: HoverEffectProps) {
  const [hovered, setHovered] = useState(false);
  const active = enabled && hovered;

  const spring = useSpring({
    scale: active ? hoverScale : 1,
    positionY: active ? hoverLift : 0,
    config: { tension: 170, friction: 26 },
  });

  return (
    <animated.group
      scale={spring.scale}
      position-y={spring.positionY}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        onHoverStart?.();
      }}
      onPointerOut={() => {
        setHovered(false);
        onHoverEnd?.();
      }}
    >
      {children}
    </animated.group>
  );
}
