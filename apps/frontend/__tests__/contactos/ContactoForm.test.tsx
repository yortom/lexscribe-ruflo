import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ContactoForm } from '../../components/contactos/ContactoForm';

describe('ContactoForm', () => {
  it('renders the form with required fields', () => {
    render(<ContactoForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Nombre / Razon social')).toBeTruthy();
    expect(screen.getByText('Tipo')).toBeTruthy();
    expect(screen.getByText('Tipologia')).toBeTruthy();
    expect(screen.getByText('Guardar')).toBeTruthy();
  });

  it('calls onSubmit with correct payload on valid submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ContactoForm onSubmit={onSubmit} submitLabel="Crear contacto" />);

    // Fill in nombre — use querySelector since label/input not linked with htmlFor in component
    const nombreInput = document.querySelector<HTMLInputElement>('input[name="nombre"]')!;
    fireEvent.change(nombreInput, { target: { value: 'Ana López' } });

    // Select tipo = fisica (already default)
    const tipoSelect = document.querySelector<HTMLSelectElement>('select[name="tipo"]')!;
    fireEvent.change(tipoSelect, { target: { value: 'fisica' } });

    // Select tipologia = cliente (already default)
    const tipologiaSelect = document.querySelector<HTMLSelectElement>('select[name="tipologia"]')!;
    fireEvent.change(tipologiaSelect, { target: { value: 'cliente' } });

    // Submit
    fireEvent.click(screen.getByText('Crear contacto'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Ana López',
          tipo: 'fisica',
          tipologia: 'cliente',
        }),
        expect.anything(), // RHF passes event as second arg to the handler
      );
    });
  });

  it('shows validation error when nombre is empty', async () => {
    render(<ContactoForm onSubmit={vi.fn()} />);

    // Submit without filling nombre
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      // Zod error for min(1) on nombre — message in English from Zod (i18n deferred)
      const body = document.body.textContent ?? '';
      expect(body).toMatch(/at least 1/i);
    });
  });

  it('renders with initial values', () => {
    render(
      <ContactoForm
        initial={{
          nombre: 'Test Corp',
          tipo: 'juridica',
          tipologia: 'parte_contraria',
        }}
        onSubmit={vi.fn()}
      />,
    );
    const nombreInput = document.querySelector<HTMLInputElement>('input[name="nombre"]')!;
    expect(nombreInput.value).toBe('Test Corp');
  });
});
