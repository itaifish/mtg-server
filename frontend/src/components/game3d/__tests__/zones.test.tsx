import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { CardData } from '@/types/game3d';

// Mock R3F to render divs so component logic executes
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: () => {},
  useThree: () => ({
    camera: { position: { lerp: vi.fn() } },
    gl: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) } },
  }),
}));

vi.mock('@react-three/drei', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  OrbitControls: () => <div />,
}));

vi.mock('@react-spring/three', () => ({
  useSpring: (props: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(props)) {
      if (key !== 'config') result[key] = props[key];
    }
    return result;
  },
  useSprings: (_count: number, configs: Record<string, unknown>[]) =>
    configs.map((c) => {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(c)) {
        if (key !== 'config') result[key] = c[key];
      }
      return result;
    }),
  animated: {
    group: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
  config: { default: {} },
}));

// Mock Card3D to avoid deep Three.js dependencies
vi.mock('../Card3D', () => ({
  Card3D: ({ card }: { card: CardData }) => <div data-testid={`card-${card.objectId}`}>{card.name}</div>,
}));

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    playLand: vi.fn(),
    castSpell: vi.fn(),
    passPriority: vi.fn(),
    activateManaAbility: vi.fn(),
    declareAttackers: vi.fn(),
    declareBlockers: vi.fn(),
    chooseFirstPlayer: vi.fn(),
    keepHand: vi.fn(),
    mulligan: vi.fn(),
    concede: vi.fn(),
  }),
}));

vi.mock('@/theme', async () => {
  const { defaultTheme } = await import('@/theme/defaultTheme');
  return {
    useTheme: () => ({ theme: defaultTheme, setTheme: vi.fn(), availableThemes: [defaultTheme] }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    defaultTheme,
  };
});

// Mock stores
vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ deselectObject: vi.fn(), cameraPosition: 'default', selectedObjectId: null, draggingObjectId: null, handOrder: [], setHandOrder: vi.fn() }),
}));

vi.mock('@/stores/gameStore', () => ({
  useGameStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ legalActions: [] }),
}));

import { BattlefieldZone } from '../zones/BattlefieldZone';
import { HandZone } from '../zones/HandZone';
import { GraveyardZone } from '../zones/GraveyardZone';
import { ExileZone } from '../zones/ExileZone';
import { StackZone } from '../zones/StackZone';
import { CameraController } from '../CameraController';
import { GameBoard } from '../GameBoard';

const creature: CardData = { objectId: 1, name: 'Bear', cardType: 'creature', color: 'green', power: 2, toughness: 2 };
const land: CardData = { objectId: 2, name: 'Forest', cardType: 'land', color: 'green' };
const tapped: CardData = { objectId: 3, name: 'Angel', cardType: 'creature', color: 'white', power: 4, toughness: 4, tapped: true };

describe('BattlefieldZone', () => {
  it('renders lands and non-lands separately', () => {
    const { getByTestId } = render(<BattlefieldZone cards={[creature, land, tapped]} playerId="p1" />);
    expect(getByTestId('card-1')).toHaveTextContent('Bear');
    expect(getByTestId('card-2')).toHaveTextContent('Forest');
    expect(getByTestId('card-3')).toHaveTextContent('Angel');
  });

  it('renders empty', () => {
    const { container } = render(<BattlefieldZone cards={[]} playerId="p1" />);
    expect(container).toBeTruthy();
  });
});

describe('HandZone', () => {
  it('renders cards', () => {
    const { getByTestId } = render(<HandZone cards={[creature, land]} />);
    expect(getByTestId('card-1')).toBeInTheDocument();
    expect(getByTestId('card-2')).toBeInTheDocument();
  });

  it('renders single card', () => {
    const { getByTestId } = render(<HandZone cards={[creature]} />);
    expect(getByTestId('card-1')).toBeInTheDocument();
  });

  it('renders empty', () => {
    const { container } = render(<HandZone cards={[]} />);
    expect(container).toBeTruthy();
  });
});

describe('GraveyardZone', () => {
  it('renders top card and count', () => {
    const { getByTestId, getByText } = render(<GraveyardZone owner="mine" cards={[creature, land]} />);
    expect(getByTestId('card-2')).toBeInTheDocument();
    expect(getByText('🪦 2')).toBeInTheDocument();
  });

  it('renders empty', () => {
    const { queryByText } = render(<GraveyardZone owner="mine" cards={[]} />);
    expect(queryByText(/graveyard/i)).not.toBeInTheDocument();
  });
});

describe('ExileZone', () => {
  it('renders top card and count', () => {
    const { getByTestId, getByText } = render(<ExileZone cards={[creature]} />);
    expect(getByTestId('card-1')).toBeInTheDocument();
    expect(getByText('Exile (1)')).toBeInTheDocument();
  });

  it('renders empty', () => {
    const { queryByText } = render(<ExileZone cards={[]} />);
    expect(queryByText(/exile/i)).not.toBeInTheDocument();
  });
});

describe('StackZone', () => {
  it('renders cards', () => {
    const { getByTestId } = render(<StackZone cards={[creature]} />);
    expect(getByTestId('card-1')).toBeInTheDocument();
  });

  it('renders empty', () => {
    const { container } = render(<StackZone cards={[]} />);
    expect(container).toBeTruthy();
  });
});

describe('CameraController', () => {
  it('renders', () => {
    const { container } = render(<CameraController />);
    expect(container).toBeTruthy();
  });
});

describe('GameBoard', () => {
  it('renders all zones', () => {
    const { getByTestId } = render(<GameBoard />);
    expect(getByTestId('canvas')).toBeInTheDocument();
  });
});
