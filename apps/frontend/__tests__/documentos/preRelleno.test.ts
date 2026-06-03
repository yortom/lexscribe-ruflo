import { describe, it, expect } from 'vitest';
import { preRellenarFormulario } from '../../lib/generacion/preRelleno';
import type { VariableDetectada } from '@lexscribe/shared-validation';

function makeVar(
  tipoObjeto: string,
  campo: string,
  rol: string | null = null,
): VariableDetectada {
  return {
    raw: `{{${tipoObjeto}.${rol ? rol + '.' : ''}${campo}}}`,
    tipoObjeto,
    rol,
    campo,
    esArray: false,
    valido: true,
    linea: 1,
    columna: 1,
  };
}

const baseExpediente = {
  nombre: 'Expediente Alpha',
  parametros: {
    honorariosBase: 1500,
    descripcion: 'Contrato de compraventa',
  },
  contactos: [
    { contactoId: 'c001', rol: 'vendedor' },
    { contactoId: 'c002', rol: 'comprador' },
  ],
};

describe('preRellenarFormulario', () => {
  it('pre-rellena expediente.campo desde parametros', () => {
    const vars = [makeVar('expediente', 'honorariosBase')];
    const result = preRellenarFormulario(vars, baseExpediente, {});
    expect(result.valores.expediente['honorariosBase']).toBe(1500);
  });

  it('pre-rellena expediente.nombre desde expediente.nombre', () => {
    const vars = [makeVar('expediente', 'nombre')];
    const result = preRellenarFormulario(vars, baseExpediente, {});
    expect(result.valores.expediente['nombre']).toBe('Expediente Alpha');
  });

  it('no incluye campo expediente si no esta en parametros', () => {
    const vars = [makeVar('expediente', 'campoinexistente')];
    const result = preRellenarFormulario(vars, baseExpediente, {});
    expect('campoinexistente' in result.valores.expediente).toBe(false);
  });

  it('pre-rellena contacto.rol.campo cuando el rol esta vinculado', () => {
    const vars = [makeVar('contacto', 'nombre', 'vendedor')];
    const result = preRellenarFormulario(vars, baseExpediente, {
      vendedor: { nombre: 'Juan Perez', nif: '12345678A' },
    });
    expect(result.valores.contacto['vendedor']['nombre']).toBe('Juan Perez');
  });

  it('deja contacto.rol.campo vacio si rol no tiene datos en contactoFieldsByRol', () => {
    const vars = [makeVar('contacto', 'nombre', 'representante')];
    const result = preRellenarFormulario(vars, baseExpediente, {});
    expect(result.valores.contacto['representante']).toBeDefined();
    expect('nombre' in result.valores.contacto['representante']).toBe(false);
  });

  it('rolesRequeridos incluye roles de variables contacto con rol != null', () => {
    const vars = [
      makeVar('contacto', 'nombre', 'vendedor'),
      makeVar('contacto', 'email', 'comprador'),
      makeVar('contacto', 'nif', 'vendedor'), // duplicado del mismo rol
    ];
    const result = preRellenarFormulario(vars, baseExpediente, {});
    expect(result.rolesRequeridos).toContain('vendedor');
    expect(result.rolesRequeridos).toContain('comprador');
    expect(result.rolesRequeridos).toHaveLength(2); // deduplicado
  });

  it('rolesPresentes refleja los vinculos del expediente', () => {
    const vars = [makeVar('expediente', 'nombre')];
    const result = preRellenarFormulario(vars, baseExpediente, {});
    expect(result.rolesPresentes).toEqual(['vendedor', 'comprador']);
  });

  it('no agrega roles a rolesRequeridos cuando tipoObjeto no es contacto', () => {
    const vars = [
      makeVar('expediente', 'nombre'),
      makeVar('fecha', 'firma'),
    ];
    const result = preRellenarFormulario(vars, baseExpediente, {});
    expect(result.rolesRequeridos).toHaveLength(0);
  });

  it('variables de fecha inicializan a cadena vacia en valores.fecha', () => {
    const vars = [makeVar('fecha', 'firma')];
    const result = preRellenarFormulario(vars, baseExpediente, {});
    expect(result.valores.fecha['firma']).toBe('');
  });

  it('expediente sin contactos devuelve rolesPresentes vacio', () => {
    const expedienteSinContactos = {
      ...baseExpediente,
      contactos: [],
    };
    const result = preRellenarFormulario([], expedienteSinContactos, {});
    expect(result.rolesPresentes).toHaveLength(0);
  });
});
