import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@react-three/fiber', () => ({
  useFrame: () => {},
  useThree: () => ({ camera: { position: { lerp: vi.fn() } } }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit" />,
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ cameraPosition: 'default' }),
}));

import { CameraController } from '../CameraController';

describe('CameraController', () => {
  it('renders OrbitControls', () => {
    const { getByTestId } = render(<CameraController />);
    expect(getByTestId('orbit')).toBeInTheDocument();
  });
});
