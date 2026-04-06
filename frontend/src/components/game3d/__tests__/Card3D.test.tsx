import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { CardData } from '@/types/game3d';

let frameCallback: (() => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: () => void) => { frameCallback = cb; cb(); },
  useThree: () => ({
    camera: { position: { set: vi.fn() } },
    gl: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) } },
  }),
}));

vi.mock('@react-three/drei', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useTexture: () => null,
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
    group: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
}));

vi.mock('@/theme', async () => {
  const { defaultTheme } = await import('@/theme/defaultTheme');
  return {
    useTheme: () => ({ theme: defaultTheme, setTheme: vi.fn(), availableThemes: [defaultTheme] }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    defaultTheme,
  };
});

import { useUiStore } from '@/stores/uiStore';
import { Card3D } from '../Card3D';

const creature: CardData = { objectId: 1, name: 'Bear', cardType: 'creature', color: 'green', power: 2, toughness: 2 };
const blackCard: CardData = { objectId: 2, name: 'Doom', cardType: 'instant', color: 'black' };
const landCard: CardData = { objectId: 3, name: 'Forest', cardType: 'land', color: 'green' };

describe('Card3D', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
    frameCallback = null;
  });

  it('renders card name and power/toughness for creatures', () => {
    const { getByText } = render(<Card3D card={creature} position={[0, 0, 0]} />);
    expect(getByText('Bear')).toBeInTheDocument();
    expect(getByText('2/2')).toBeInTheDocument();
  });

  it('does not render power/toughness for non-creatures', () => {
    const { queryByText } = render(<Card3D card={blackCard} position={[0, 0, 0]} />);
    expect(queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
  });

  it('renders with highlighted prop', () => {
    const { getByText } = render(<Card3D card={creature} position={[0, 0, 0]} highlighted />);
    expect(getByText('Bear')).toBeInTheDocument();
  });

  it('renders with custom rotation', () => {
    const { getByText } = render(<Card3D card={creature} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} />);
    expect(getByText('Bear')).toBeInTheDocument();
  });

  it('renders land card', () => {
    const { getByText } = render(<Card3D card={landCard} position={[0, 0, 0]} />);
    expect(getByText('Forest')).toBeInTheDocument();
  });

  it('renders selected card with gold glow', () => {
    useUiStore.setState({ selectedObjectId: 1 });
    const { getByText } = render(<Card3D card={creature} position={[0, 0, 0]} />);
    expect(getByText('Bear')).toBeInTheDocument();
  });

  it('click selects card in store', () => {
    const { container } = render(<Card3D card={creature} position={[0, 0, 0]} />);
    const mesh = container.querySelector('mesh');
    if (mesh) {
      fireEvent.click(mesh, { stopPropagation: vi.fn() });
    }
    expect(useUiStore.getState().selectedObjectId).toBe(1);
  });

  it('click deselects already-selected card', () => {
    useUiStore.setState({ selectedObjectId: 1 });
    const { container } = render(<Card3D card={creature} position={[0, 0, 0]} />);
    const mesh = container.querySelector('mesh');
    if (mesh) {
      fireEvent.click(mesh, { stopPropagation: vi.fn() });
    }
    expect(useUiStore.getState().selectedObjectId).toBeNull();
  });

  it('pointer over sets hovered in store', () => {
    const { container } = render(<Card3D card={creature} position={[0, 0, 0]} />);
    const mesh = container.querySelector('mesh');
    if (mesh) {
      fireEvent.pointerOver(mesh, { stopPropagation: vi.fn() });
    }
    expect(useUiStore.getState().hoveredObjectId).toBe(1);
  });

  it('pointer out clears hovered in store', () => {
    useUiStore.setState({ hoveredObjectId: 1 });
    const { container } = render(<Card3D card={creature} position={[0, 0, 0]} />);
    const mesh = container.querySelector('mesh');
    if (mesh) {
      fireEvent.pointerOver(mesh, { stopPropagation: vi.fn() });
      fireEvent.pointerOut(mesh);
    }
    expect(useUiStore.getState().hoveredObjectId).toBeNull();
  });

  it('useFrame callback runs without error', () => {
    render(<Card3D card={creature} position={[0, 0, 0]} />);
    expect(frameCallback).toBeDefined();
    // Call again to exercise the lerp path
    frameCallback!();
  });
});
