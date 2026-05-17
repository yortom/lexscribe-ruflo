import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ParametrosEditor } from '../../components/contactos/ParametrosEditor';

describe('ParametrosEditor', () => {
  it('serializes valid numeric parametros as numbers', async () => {
    const onChange = vi.fn();
    render(<ParametrosEditor value={{}} onChange={onChange} />);

    fireEvent.click(screen.getByText('+ Anadir parametro'));
    fireEvent.change(screen.getByPlaceholderText('nombre'), {
      target: { value: 'honorariosBase' },
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'numero' } });
    fireEvent.change(screen.getByPlaceholderText('valor'), { target: { value: '1250.5' } });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith({ honorariosBase: 1250.5 });
    });
  });

  it('does not serialize invalid numeric parametros as NaN or null', async () => {
    const onChange = vi.fn();
    render(<ParametrosEditor value={{}} onChange={onChange} />);

    fireEvent.click(screen.getByText('+ Anadir parametro'));
    fireEvent.change(screen.getByPlaceholderText('nombre'), {
      target: { value: 'honorariosBase' },
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'numero' } });
    const valueInput = screen.getByPlaceholderText('valor') as HTMLInputElement;
    expect(valueInput.type).toBe('number');

    fireEvent.change(valueInput, { target: { value: '1e999' } });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith({});
    });
  });
});
