import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ClausulaForm } from '../../components/clausulas/ClausulaForm';

describe('ClausulaForm', () => {
  it('renders the form with required fields', () => {
    render(<ClausulaForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Nombre')).toBeTruthy();
    expect(screen.getByText('Texto')).toBeTruthy();
    expect(screen.getByText('Labels')).toBeTruthy();
    expect(screen.getByText('Guardar')).toBeTruthy();
  });

  it('calls onSubmit with nombre + texto on valid submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ClausulaForm onSubmit={onSubmit} submitLabel="Crear clausula" />);

    const nombre = document.querySelector<HTMLInputElement>('input[name="nombre"]')!;
    fireEvent.change(nombre, { target: { value: 'Garantia estandar' } });
    const texto = document.querySelector<HTMLTextAreaElement>('textarea[name="texto"]')!;
    fireEvent.change(texto, { target: { value: 'El vendedor garantiza...' } });

    fireEvent.click(screen.getByText('Crear clausula'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Garantia estandar',
          texto: 'El vendedor garantiza...',
        }),
        expect.anything(),
      );
    });
  });

  it('shows validation error when nombre is empty', async () => {
    render(<ClausulaForm onSubmit={vi.fn()} />);
    const texto = document.querySelector<HTMLTextAreaElement>('textarea[name="texto"]')!;
    fireEvent.change(texto, { target: { value: 'texto valido' } });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      const body = document.body.textContent ?? '';
      expect(body).toMatch(/at least 1/i);
    });
  });

  it('adds a label via Enter key and includes it on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ClausulaForm onSubmit={onSubmit} />);

    const nombre = document.querySelector<HTMLInputElement>('input[name="nombre"]')!;
    fireEvent.change(nombre, { target: { value: 'Clausula X' } });
    const texto = document.querySelector<HTMLTextAreaElement>('textarea[name="texto"]')!;
    fireEvent.change(texto, { target: { value: 'cuerpo' } });

    const labelInput = screen.getByPlaceholderText(/Anadir label/i);
    fireEvent.change(labelInput, { target: { value: 'Compraventa' } });
    fireEvent.keyDown(labelInput, { key: 'Enter' });

    // Chip rendered normalized to lowercase
    expect(screen.getByText('compraventa')).toBeTruthy();

    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['compraventa'] }),
        expect.anything(),
      );
    });
  });

  it('removes a label chip when clicking its remove button', () => {
    render(
      <ClausulaForm
        initial={{ nombre: 'C', texto: 't', labels: ['uno', 'dos'] }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('uno')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Eliminar label uno'));
    expect(screen.queryByText('uno')).toBeNull();
    expect(screen.getByText('dos')).toBeTruthy();
  });

  it('renders with initial values', () => {
    render(
      <ClausulaForm initial={{ nombre: 'Inicial', texto: 'cuerpo inicial' }} onSubmit={vi.fn()} />,
    );
    const nombre = document.querySelector<HTMLInputElement>('input[name="nombre"]')!;
    expect(nombre.value).toBe('Inicial');
  });
});
