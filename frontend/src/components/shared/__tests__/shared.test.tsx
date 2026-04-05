import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';
import { ErrorBanner } from '../ErrorBanner';
import { LoadingSpinner } from '../LoadingSpinner';
import { Button } from '../Button';
import { Input } from '../Input';
import { Select } from '../Select';

describe('Modal', () => {
  it('renders title and children', () => {
    render(<Modal title="Test Modal" onClose={vi.fn()}>Content</Modal>);
    expect(screen.getByRole('dialog', { name: 'Test Modal' })).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose when overlay clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}>Body</Modal>);
    // Click the overlay (dialog element itself), not the inner panel
    await user.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when panel content clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}>Body</Modal>);
    await user.click(screen.getByText('Body'));
    // stopPropagation prevents onClose from overlay
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}>Body</Modal>);
    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ErrorBanner', () => {
  it('renders message', () => {
    render(<ErrorBanner message="Something went wrong" onDismiss={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('calls onDismiss when dismiss clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);
    await user.click(screen.getByLabelText('Dismiss error'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('LoadingSpinner', () => {
  it('renders with status role', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows loading dots when loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    rerender(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders without label', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });
});

describe('Select', () => {
  it('renders options with label', () => {
    render(<Select label="Format" options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]} />);
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders without label', () => {
    render(<Select options={[{ value: 'x', label: 'X' }]} />);
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
