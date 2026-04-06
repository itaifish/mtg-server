import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@react-three/fiber', () => ({
  useFrame: () => {},
  useThree: () => ({ camera: { position: { set: vi.fn() }, lookAt: vi.fn() } }),
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ cameraPosition: 'default' }),
}));

import { CameraController } from '../CameraController';

describe('CameraController', () => {
  it('renders without crashing', () => {
    const { container } = render(<CameraController />);
    expect(container).toBeDefined();
  });
});
