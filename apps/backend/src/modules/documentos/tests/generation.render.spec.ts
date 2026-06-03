/**
 * GenerationService — REAL docxtemplater render regression test (no mocks).
 *
 * Regression guard for the {{ }} delimiter bug: docxtemplater defaults to single-brace
 * { } delimiters, which mis-parses the project's {{objeto.campo}} syntax (FUNCIONAL.md §5.2)
 * as a "duplicate_close_tag" multi_error. This spec exercises the real PizZip + Docxtemplater
 * + conversion pipeline (storagePath=null branch) to prove {{ }} variables render correctly.
 *
 * Unlike generation.service.spec.ts, this file does NOT mock docxtemplater/pizzip/conversion.
 */
import { Types } from 'mongoose';
import { GenerationService } from '../generation/generation.service';
import { docxToTexto } from '../../plantillas/conversion';

describe('GenerationService — real docxtemplater render ({{ }} delimiters)', () => {
  const uid = '507f1f77bcf86cd799439011';
  const expedienteId = '507f1f77bcf86cd799439012';

  function buildService(
    contenido: string,
    variablesDetectadas: Array<Record<string, unknown>>,
  ) {
    const plantilla = {
      _id: new Types.ObjectId(),
      nombre: 'Plantilla render test',
      contenido,
      storagePath: null as string | null,
      variablesDetectadas,
      clausulasReferenciadas: [],
    };
    const expediente = {
      _id: new Types.ObjectId(),
      nombre: 'Compraventa Piso Goya',
      fechaCreacion: new Date('2026-01-01').toISOString(),
      parametros: {},
      contactos: [],
    };

    let uploaded: Buffer | undefined;
    const storage = {
      putObject: jest.fn().mockImplementation((_key: string, buf: Buffer) => {
        uploaded = buf;
        return Promise.resolve(_key);
      }),
      getObject: jest.fn(),
    };

    const service = new GenerationService(
      { getById: jest.fn().mockResolvedValue(plantilla) } as any,
      { findById: jest.fn().mockResolvedValue(expediente) } as any,
      { addParametro: jest.fn().mockResolvedValue({}) } as any,
      storage as any,
      {
        create: jest
          .fn()
          .mockImplementation((_u: string, d: Record<string, unknown>) =>
            Promise.resolve({ ...d }),
          ),
      } as any,
    );

    return { service, getUploaded: () => uploaded };
  }

  function makeDto(overrides: Record<string, unknown> = {}) {
    return {
      plantillaId: '507f1f77bcf86cd799439013',
      nombre: 'documento render',
      valores: { expediente: {}, contacto: {}, clausula: {}, fecha: {} },
      asignacionesRol: [],
      camposNuevos: [],
      ...overrides,
    };
  }

  it('renders {{expediente.nombre}} without duplicate_close_tag and substitutes the value', async () => {
    const { service, getUploaded } = buildService('Cliente: {{expediente.nombre}}', [
      { raw: '{{expediente.nombre}}', tipoObjeto: 'expediente', rol: null, campo: 'nombre' },
    ]);

    await expect(
      service.generar(uid, expedienteId, makeDto() as any),
    ).resolves.toBeDefined();

    const buf = getUploaded();
    expect(buf).toBeInstanceOf(Buffer);
    const texto = await docxToTexto(buf as Buffer);
    expect(texto).toContain('Cliente: Compraventa Piso Goya');
    expect(texto).not.toContain('{{');
    expect(texto).not.toContain('}}');
  });

  it('renders a three-part {{contacto.rol.campo}} variable', async () => {
    const { service, getUploaded } = buildService(
      'Vendedor: {{contacto.vendedor.nombre}}',
      [
        {
          raw: '{{contacto.vendedor.nombre}}',
          tipoObjeto: 'contacto',
          rol: 'vendedor',
          campo: 'nombre',
        },
      ],
    );

    const dto = makeDto({
      valores: {
        expediente: {},
        contacto: { vendedor: { nombre: 'Ana López' } },
        clausula: {},
        fecha: {},
      },
    });

    await expect(service.generar(uid, expedienteId, dto as any)).resolves.toBeDefined();

    const texto = await docxToTexto(getUploaded() as Buffer);
    expect(texto).toContain('Vendedor: Ana López');
  });
});
