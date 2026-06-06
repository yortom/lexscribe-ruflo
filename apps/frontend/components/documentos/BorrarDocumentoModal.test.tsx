/**
 * BorrarDocumentoModal tests (CAL-05 frontend / FL-9).
 * Verifies that the modal shows event count and correct buttons,
 * and that clicking each button calls onConfirm with the correct action.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { BorrarDocumentoModal } from './BorrarDocumentoModal';

describe('BorrarDocumentoModal', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the event count message', () => {
    render(
      <BorrarDocumentoModal count={3} onConfirm={onConfirm} onClose={onClose} />,
    );

    expect(screen.getByText(/3 evento\(s\)/i)).toBeTruthy();
  });

  it('clicking Conservar eventos calls onConfirm with conservar', () => {
    render(
      <BorrarDocumentoModal count={2} onConfirm={onConfirm} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /conservar eventos/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('conservar');
  });

  it('clicking Eliminar eventos calls onConfirm with eliminar', () => {
    render(
      <BorrarDocumentoModal count={2} onConfirm={onConfirm} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /eliminar eventos/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('eliminar');
  });

  it('clicking Cancelar calls onClose', () => {
    render(
      <BorrarDocumentoModal count={1} onConfirm={onConfirm} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
