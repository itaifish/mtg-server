import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useFrame: () => {},
  useThree: () => ({}),
}));

vi.mock('@react-spring/three', () => ({
  useSpring: (props: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(props)) {
      if (key !== 'config') result[key] = props[key];
    }
    return result;
  },
  animated: {
    group: ({ children, onPointerOver, onPointerOut, ...props }: Record<string, unknown>) => (
      <div
        onPointerOver={onPointerOver as React.PointerEventHandler}
        onPointerOut={onPointerOut as React.PointerEventHandler}
        {...props}
      >
        {children as React.ReactNode}
      </div>
    ),
  },
  config: { default: {} },
}));

import { CardTransition } from '../animations/CardTransition';
import { HoverEffect } from '../animations/HoverEffect';
import { DamageParticles } from '../animations/DamageParticles';
import { HealParticles } from '../animations/HealParticles';

describe('CardTransition', () => {
  it('renders children with spring animation', () => {
    const { getByText } = render(
      <CardTransition position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <span>Card</span>
      </CardTransition>,
    );
    expect(getByText('Card')).toBeInTheDocument();
  });
});

describe('HoverEffect', () => {
  it('renders children', () => {
    const { getByText } = render(
      <HoverEffect>
        <span>Child</span>
      </HoverEffect>,
    );
    expect(getByText('Child')).toBeInTheDocument();
  });

  it('handles pointer over and out events', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { container } = render(
      <HoverEffect onHoverStart={onStart} onHoverEnd={onEnd}>
        <span>Hover</span>
      </HoverEffect>,
    );
    const el = container.firstElementChild!;
    fireEvent.pointerOver(el, { stopPropagation: vi.fn() });
    expect(onStart).toHaveBeenCalled();
    fireEvent.pointerOut(el);
    expect(onEnd).toHaveBeenCalled();
  });

  it('renders disabled', () => {
    const { getByText } = render(
      <HoverEffect enabled={false}>
        <span>Disabled</span>
      </HoverEffect>,
    );
    expect(getByText('Disabled')).toBeInTheDocument();
  });
});

describe('DamageParticles', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<DamageParticles visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders particles when visible', () => {
    const { container } = render(<DamageParticles visible={true} position={[1, 2, 3]} count={4} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders with default props', () => {
    const { container } = render(<DamageParticles visible={true} />);
    expect(container.innerHTML).not.toBe('');
  });
});

describe('HealParticles', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<HealParticles visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders particles when visible', () => {
    const { container } = render(<HealParticles visible={true} position={[0, 0, 0]} count={4} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders with default props', () => {
    const { container } = render(<HealParticles visible={true} />);
    expect(container.innerHTML).not.toBe('');
  });
});
