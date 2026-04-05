import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({ render: mockRender }));

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

vi.mock('./App', () => ({
  App: () => null,
}));

vi.mock('./styles/global.css', () => ({}));

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders App when root element exists', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    await import('../main');
    expect(mockCreateRoot).toHaveBeenCalledWith(root);
    expect(mockRender).toHaveBeenCalled();
  });
});
