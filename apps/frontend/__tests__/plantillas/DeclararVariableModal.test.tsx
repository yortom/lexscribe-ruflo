/**
 * DeclararVariableModal tests.
 * Verifies Pitfall 4: only expediente/contacto are declarable; clausula/fecha show "no declarable".
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DeclararVariableModal } from '../../components/plantillas/DeclararVariableModal';
import { declararVariable } from '../../lib/api/plantillas';
import type { VariableDetectada } from '@lexscribe/shared-validation';

vi.mock('../../lib/api/plantillas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/plantillas')>();
  return { ...actual, declararVariable: vi.fn() };
});

const makeVar = (tipoObjeto: string, campo: string): VariableDetectada => ({
  raw: `{{${tipoObjeto}.${campo}}}`,
  tipoObjeto,
  rol: null,
  campo,
  esArray: false,
  valido: true,
  linea: 1,
  columna: 1,
});

describe('DeclararVariableModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const nuevasVariables: VariableDetectada[] = [
    makeVar('expediente', 'honorariosBase'),
    makeVar('fecha', 'hoy'),
  ];

  it('shows expediente row with tipoDato select and Declarar button', () => {
    render(
      <DeclararVariableModal
        plantillaId="p1"
        nuevasVariables={nuevasVariables}
        onClose={vi.fn()}
        onDeclared={vi.fn()}
      />,
    );
    expect(screen.getByText('expediente.honorariosBase')).toBeTruthy();
    // Has a select (tipoDato)
    expect(screen.getByLabelText(/tipo de dato para expediente.honorariosBase/i)).toBeTruthy();
    // Has Declarar button
    expect(screen.getByText('Declarar')).toBeTruthy();
  });

  it('shows fecha row as "no declarable" (Pitfall 4)', () => {
    render(
      <DeclararVariableModal
        plantillaId="p1"
        nuevasVariables={nuevasVariables}
        onClose={vi.fn()}
        onDeclared={vi.fn()}
      />,
    );
    expect(screen.getByText('fecha.hoy')).toBeTruthy();
    expect(screen.getByLabelText(/fecha.hoy no declarable/i)).toBeTruthy();
  });

  it('calls declararVariable with correct args on Declarar click', async () => {
    vi.mocked(declararVariable).mockResolvedValue(undefined);
    const onDeclared = vi.fn();
    const onClose = vi.fn();

    render(
      <DeclararVariableModal
        plantillaId="p1"
        nuevasVariables={nuevasVariables}
        onClose={onClose}
        onDeclared={onDeclared}
      />,
    );

    // Default tipoDato is 'texto'; change to 'numero'
    const select = screen.getByLabelText(/tipo de dato para expediente.honorariosBase/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'numero' } });
    expect(select.value).toBe('numero');

    fireEvent.click(screen.getByText('Declarar'));

    await waitFor(() => {
      expect(declararVariable).toHaveBeenCalledWith('p1', {
        tipoObjeto: 'expediente',
        nombre: 'honorariosBase',
        tipoDato: 'numero',
      });
      expect(onDeclared).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows empty state when no variables', () => {
    render(
      <DeclararVariableModal
        plantillaId="p1"
        nuevasVariables={[]}
        onClose={vi.fn()}
        onDeclared={vi.fn()}
      />,
    );
    expect(screen.getByText(/no hay variables nuevas/i)).toBeTruthy();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <DeclararVariableModal
        plantillaId="p1"
        nuevasVariables={[]}
        onClose={onClose}
        onDeclared={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalled();
  });
});
