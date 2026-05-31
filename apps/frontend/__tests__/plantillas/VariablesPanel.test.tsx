/**
 * VariablesPanel tests.
 * Verifies that variables are grouped by tipoObjeto and invalid types are marked.
 */
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { VariablesPanel } from '../../components/plantillas/VariablesPanel';

const CONTENIDO =
  '{{expediente.nombre}}\n{{contacto.cliente.nif}}\n{{contrato.x}}';

describe('VariablesPanel', () => {
  it('shows "expediente" group with campo nombre', () => {
    render(<VariablesPanel contenido={CONTENIDO} />);
    expect(screen.getByText('expediente')).toBeTruthy();
    expect(screen.getByText('nombre')).toBeTruthy();
  });

  it('shows "contacto" group with rol.campo', () => {
    render(<VariablesPanel contenido={CONTENIDO} />);
    expect(screen.getByText('contacto')).toBeTruthy();
    // rol=cliente, campo=nif -> "cliente.nif"
    expect(screen.getByText('cliente.nif')).toBeTruthy();
  });

  it('shows "contrato" group with "tipo desconocido" badge', () => {
    render(<VariablesPanel contenido={CONTENIDO} />);
    expect(screen.getByText('contrato')).toBeTruthy();
    expect(screen.getByText('tipo desconocido')).toBeTruthy();
  });

  it('shows placeholder text when no variables', () => {
    render(<VariablesPanel contenido="Sin variables aqui" />);
    expect(screen.getByText('Sin variables detectadas')).toBeTruthy();
  });

  it('calls onVariableClick when a variable item is clicked', () => {
    const onClick = vi.fn();
    render(<VariablesPanel contenido="{{expediente.nombre}}" onVariableClick={onClick} />);
    screen.getByText('nombre').click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
