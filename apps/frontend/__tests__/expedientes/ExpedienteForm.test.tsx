import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ExpedienteForm } from '../../components/expedientes/ExpedienteForm';

describe('ExpedienteForm', () => {
  it('renders the form with nombre field', () => {
    render(<ExpedienteForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Nombre')).toBeTruthy();
    expect(screen.getByText('Guardar')).toBeTruthy();
  });

  it('calls onSubmit with nombre on valid submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ExpedienteForm onSubmit={onSubmit} submitLabel="Crear expediente" />);

    const nombre = document.querySelector<HTMLInputElement>('input[name="nombre"]')!;
    fireEvent.change(nombre, { target: { value: 'Caso Perez vs Garcia' } });

    fireEvent.click(screen.getByText('Crear expediente'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Caso Perez vs Garcia' }),
        expect.anything(),
      );
    });
  });

  it('shows validation error when nombre is empty', async () => {
    render(<ExpedienteForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      const body = document.body.textContent ?? '';
      expect(body).toMatch(/at least 1/i);
    });
  });

  it('renders with initial nombre', () => {
    render(<ExpedienteForm initial={{ nombre: 'Expediente X' }} onSubmit={vi.fn()} />);
    const nombre = document.querySelector<HTMLInputElement>('input[name="nombre"]')!;
    expect(nombre.value).toBe('Expediente X');
  });
});
