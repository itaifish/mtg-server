import { type ReactNode } from 'react';
import { useSpring, animated, config } from '@react-spring/three';

interface CardTransitionProps {
  position: [number, number, number];
  rotation: [number, number, number];
  children: ReactNode;
}

const CARD_SPRING_CONFIG = { tension: 170, friction: 26 };

/**
 * Wrapper that animates card position and rotation changes using spring physics.
 * Provides smooth transitions when cards move between zones.
 */
export function CardTransition({ position, rotation, children }: CardTransitionProps) {
  const spring = useSpring({
    position,
    rotation,
    config: { ...config.default, ...CARD_SPRING_CONFIG },
  });

  return (
    <animated.group
      position={spring.position as unknown as [number, number, number]}
      rotation={spring.rotation as unknown as [number, number, number]}
    >
      {children}
    </animated.group>
  );
}
