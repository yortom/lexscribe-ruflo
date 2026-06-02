import { describe, it, expect } from 'vitest';
import {
  ORDINALES,
  intToOrdinal,
  ordinalToInt,
  detectClausulaHeaders,
  insertClausulaAndRenumber,
} from './clausula-renumber';

describe('ORDINALES', () => {
  it('ORDINALES[1] is PRIMERA', () => {
    expect(ORDINALES[1]).toBe('PRIMERA');
  });

  it('ORDINALES[2] is SEGUNDA', () => {
    expect(ORDINALES[2]).toBe('SEGUNDA');
  });

  it('ORDINALES[10] is DECIMA', () => {
    expect(ORDINALES[10]).toBe('DECIMA');
  });

  it('ORDINALES[50] is QUINCUAGESIMA', () => {
    expect(ORDINALES[50]).toBe('QUINCUAGESIMA');
  });
});

describe('intToOrdinal', () => {
  it('intToOrdinal(1) === PRIMERA', () => {
    expect(intToOrdinal(1)).toBe('PRIMERA');
  });

  it('intToOrdinal(2) === SEGUNDA', () => {
    expect(intToOrdinal(2)).toBe('SEGUNDA');
  });

  it('intToOrdinal(10) === DECIMA', () => {
    expect(intToOrdinal(10)).toBe('DECIMA');
  });

  it('intToOrdinal(11) === UNDECIMA', () => {
    expect(intToOrdinal(11)).toBe('UNDECIMA');
  });

  it('intToOrdinal(20) === VIGESIMA', () => {
    expect(intToOrdinal(20)).toBe('VIGESIMA');
  });

  it('intToOrdinal(21) === VIGESIMA PRIMERA', () => {
    expect(intToOrdinal(21)).toBe('VIGESIMA PRIMERA');
  });

  it('intToOrdinal(30) === TRIGESIMA', () => {
    expect(intToOrdinal(30)).toBe('TRIGESIMA');
  });

  it('intToOrdinal(50) === QUINCUAGESIMA', () => {
    expect(intToOrdinal(50)).toBe('QUINCUAGESIMA');
  });

  it('intToOrdinal(25) === VIGESIMA QUINTA', () => {
    expect(intToOrdinal(25)).toBe('VIGESIMA QUINTA');
  });
});

describe('ordinalToInt', () => {
  it('ordinalToInt("PRIMERA") === 1', () => {
    expect(ordinalToInt('PRIMERA')).toBe(1);
  });

  it('ordinalToInt("SEGUNDA") === 2', () => {
    expect(ordinalToInt('SEGUNDA')).toBe(2);
  });

  it('ordinalToInt("DECIMA") === 10', () => {
    expect(ordinalToInt('DECIMA')).toBe(10);
  });

  it('ordinalToInt("VIGESIMA") === 20', () => {
    expect(ordinalToInt('VIGESIMA')).toBe(20);
  });

  it('ordinalToInt("VIGESIMA PRIMERA") === 21', () => {
    expect(ordinalToInt('VIGESIMA PRIMERA')).toBe(21);
  });

  it('ordinalToInt("QUINCUAGESIMA") === 50', () => {
    expect(ordinalToInt('QUINCUAGESIMA')).toBe(50);
  });

  it('is case-insensitive: "primera" === 1', () => {
    expect(ordinalToInt('primera')).toBe(1);
  });

  it('returns null for unknown ordinal', () => {
    expect(ordinalToInt('CENTESIMA')).toBeNull();
  });

  it('handles accented input: "DÉCIMA" -> 10', () => {
    expect(ordinalToInt('DÉCIMA')).toBe(10);
  });
});

describe('detectClausulaHeaders', () => {
  it('detects two headers in standard text', () => {
    const text = 'CLÁUSULA PRIMERA.- Objeto\nAlgún texto.\nCLÁUSULA SEGUNDA.- Precio';
    const headers = detectClausulaHeaders(text);
    expect(headers).toHaveLength(2);
    expect(headers[0].ordinal).toBe('PRIMERA');
    expect(headers[0].numero).toBe(1);
    expect(headers[1].ordinal).toBe('SEGUNDA');
    expect(headers[1].numero).toBe(2);
  });

  it('provides indiceLinea (0-based) for each header', () => {
    const text = 'Intro\nCLÁUSULA PRIMERA.- Objeto';
    const headers = detectClausulaHeaders(text);
    expect(headers[0].indiceLinea).toBe(1);
  });

  it('tolerates accent-less CLAUSULA', () => {
    const text = 'CLAUSULA PRIMERA.- Objeto';
    const headers = detectClausulaHeaders(text);
    expect(headers).toHaveLength(1);
    expect(headers[0].numero).toBe(1);
  });

  it('tolerates mixed case "Cláusula Primera.-"', () => {
    const text = 'Cláusula Primera.- Objeto';
    const headers = detectClausulaHeaders(text);
    expect(headers).toHaveLength(1);
    expect(headers[0].numero).toBe(1);
  });

  it('returns empty for text with no clause headers', () => {
    const headers = detectClausulaHeaders('Texto sin cláusulas');
    expect(headers).toHaveLength(0);
  });

  it('raw field contains the matched header text', () => {
    const text = 'CLÁUSULA PRIMERA.- Objeto';
    const headers = detectClausulaHeaders(text);
    expect(headers[0].raw).toContain('PRIMERA');
  });
});

describe('insertClausulaAndRenumber', () => {
  it('inserts clause at position afterNumero=1, old SEGUNDA becomes TERCERA', () => {
    const texto =
      'CLÁUSULA PRIMERA.- Objeto\nTexto de la primera.\nCLÁUSULA SEGUNDA.- Precio\nTexto de la segunda.';
    const result = insertClausulaAndRenumber(texto, 'Pago aplazado...', 1);
    expect(result).toContain('CLÁUSULA SEGUNDA.-');
    expect(result).toContain('Pago aplazado...');
    expect(result).toContain('CLÁUSULA TERCERA.-');
    expect(result).toContain('Texto de la segunda');
  });

  it('afterNumero=0 inserts as PRIMERA, existing PRIMERA becomes SEGUNDA', () => {
    const texto = 'CLÁUSULA PRIMERA.- Objeto\nTexto de la primera.';
    const result = insertClausulaAndRenumber(texto, 'Intro nueva', 0);
    expect(result).toContain('CLÁUSULA PRIMERA.-');
    expect(result).toContain('Intro nueva');
    expect(result).toContain('CLÁUSULA SEGUNDA.-');
    expect(result).toContain('Texto de la primera');
  });

  it('inserts into text with no existing headers as PRIMERA', () => {
    const texto = 'Texto libre sin cláusulas.';
    const result = insertClausulaAndRenumber(texto, 'Contenido nuevo', 0);
    expect(result).toContain('CLÁUSULA PRIMERA.-');
    expect(result).toContain('Contenido nuevo');
  });

  it('inserting at end appends new clause after last', () => {
    const texto =
      'CLÁUSULA PRIMERA.- Objeto\nTexto.\nCLÁUSULA SEGUNDA.- Precio\nTexto precio.';
    const result = insertClausulaAndRenumber(texto, 'Cláusula final', 2);
    expect(result).toContain('CLÁUSULA TERCERA.-');
    expect(result).toContain('Cláusula final');
    // Original headers should remain unchanged (no shift needed)
    expect(result).toContain('CLÁUSULA PRIMERA.-');
    expect(result).toContain('CLÁUSULA SEGUNDA.-');
  });
});
