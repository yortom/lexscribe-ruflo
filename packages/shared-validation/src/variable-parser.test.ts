import { describe, it, expect } from 'vitest';
import {
  KNOWN_TIPO_OBJETO,
  parseVariables,
  groupByTipoObjeto,
  validarVariables,
} from './variable-parser';

describe('KNOWN_TIPO_OBJETO', () => {
  it('contains exactly expediente, contacto, clausula, fecha', () => {
    expect(KNOWN_TIPO_OBJETO).toEqual(['expediente', 'contacto', 'clausula', 'fecha']);
  });
});

describe('parseVariables', () => {
  it('returns empty array for text with no braces', () => {
    const result = parseVariables('Texto sin variables aquí');
    expect(result).toEqual([]);
  });

  it('parses simple two-part variable {{expediente.nombre}}', () => {
    const result = parseVariables('{{expediente.nombre}}');
    expect(result).toHaveLength(1);
    const v = result[0];
    expect(v.raw).toBe('{{expediente.nombre}}');
    expect(v.tipoObjeto).toBe('expediente');
    expect(v.rol).toBeNull();
    expect(v.campo).toBe('nombre');
    expect(v.esArray).toBe(false);
    expect(v.valido).toBe(true);
    expect(v.linea).toBe(1);
    expect(v.columna).toBeGreaterThan(0);
  });

  it('parses roled three-part variable {{contacto.vendedor.nombre}}', () => {
    const result = parseVariables('{{contacto.vendedor.nombre}}');
    expect(result).toHaveLength(1);
    const v = result[0];
    expect(v.raw).toBe('{{contacto.vendedor.nombre}}');
    expect(v.tipoObjeto).toBe('contacto');
    expect(v.rol).toBe('vendedor');
    expect(v.campo).toBe('nombre');
    expect(v.valido).toBe(true);
  });

  it('marks unknown tipo as invalid — {{contrato.algo}}', () => {
    const result = parseVariables('{{contrato.algo}}');
    expect(result).toHaveLength(1);
    expect(result[0].tipoObjeto).toBe('contrato');
    expect(result[0].valido).toBe(false);
  });

  it('marks {{fecha.hoy}} as valid', () => {
    const result = parseVariables('{{fecha.hoy}}');
    expect(result[0].valido).toBe(true);
    expect(result[0].tipoObjeto).toBe('fecha');
  });

  it('marks {{clausula.objeto}} as valid', () => {
    const result = parseVariables('{{clausula.objeto}}');
    expect(result[0].valido).toBe(true);
    expect(result[0].tipoObjeto).toBe('clausula');
  });

  it('tracks linea=2 and column resets per line', () => {
    const text = 'línea uno\n{{expediente.nombre}}';
    const result = parseVariables(text);
    expect(result).toHaveLength(1);
    expect(result[0].linea).toBe(2);
    expect(result[0].columna).toBe(1);
  });

  it('returns 2 occurrences for duplicate variable', () => {
    const result = parseVariables('{{expediente.nombre}} y {{expediente.nombre}}');
    expect(result).toHaveLength(2);
  });

  it('does NOT match malformed {{ expediente.nombre }} with inner spaces', () => {
    const result = parseVariables('{{ expediente.nombre }}');
    expect(result).toHaveLength(0);
  });

  it('parses {{contacto.cliente}} as two-part: rol=null, campo=cliente', () => {
    const result = parseVariables('{{contacto.cliente}}');
    expect(result).toHaveLength(1);
    expect(result[0].tipoObjeto).toBe('contacto');
    expect(result[0].rol).toBeNull();
    expect(result[0].campo).toBe('cliente');
    expect(result[0].valido).toBe(true);
  });

  it('esArray is always false in MVP', () => {
    const result = parseVariables('{{expediente.nombre}}');
    expect(result[0].esArray).toBe(false);
  });

  it('columna is 1-based position of {{ on that line', () => {
    const result = parseVariables('inicio {{expediente.nombre}}');
    expect(result[0].columna).toBe(8); // "inicio " = 7 chars, then {{
  });
});

describe('groupByTipoObjeto', () => {
  it('groups by tipoObjeto', () => {
    const vars = parseVariables(
      '{{expediente.nombre}} {{expediente.fecha}} {{contacto.cliente}}'
    );
    const groups = groupByTipoObjeto(vars);
    const types = groups.map((g) => g.tipoObjeto);
    expect(types).toContain('expediente');
    expect(types).toContain('contacto');
  });

  it('dedupes within group by (rol|campo)', () => {
    const vars = parseVariables(
      '{{expediente.nombre}} {{expediente.nombre}} {{expediente.fecha}}'
    );
    const groups = groupByTipoObjeto(vars);
    const expedienteGroup = groups.find((g) => g.tipoObjeto === 'expediente')!;
    expect(expedienteGroup.variables).toHaveLength(2); // nombre once, fecha once
  });

  it('preserves insertion order of groups', () => {
    const vars = parseVariables('{{expediente.nombre}} {{contacto.vendedor.nombre}}');
    const groups = groupByTipoObjeto(vars);
    expect(groups[0].tipoObjeto).toBe('expediente');
    expect(groups[1].tipoObjeto).toBe('contacto');
  });

  it('marks group valido false when tipoObjeto is unknown', () => {
    const vars = parseVariables('{{contrato.algo}}');
    const groups = groupByTipoObjeto(vars);
    expect(groups[0].valido).toBe(false);
  });
});

describe('validarVariables', () => {
  it('returns valido:true and no invalidas when all vars are known', () => {
    const vars = parseVariables('{{expediente.nombre}} {{contacto.vendedor.nif}}');
    const resultado = validarVariables(vars);
    expect(resultado.valido).toBe(true);
    expect(resultado.invalidas).toHaveLength(0);
  });

  it('returns valido:false and lists invalidas when unknown tipo exists', () => {
    const vars = parseVariables('{{contrato.algo}} {{expediente.nombre}}');
    const resultado = validarVariables(vars);
    expect(resultado.valido).toBe(false);
    expect(resultado.invalidas).toHaveLength(1);
    expect(resultado.invalidas[0].tipoObjeto).toBe('contrato');
  });

  it('returns valido:true for empty array', () => {
    const resultado = validarVariables([]);
    expect(resultado.valido).toBe(true);
    expect(resultado.invalidas).toHaveLength(0);
  });
});
