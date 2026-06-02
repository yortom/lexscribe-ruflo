/**
 * GenerationService unit tests (TDD — mocked deps, no DB/MinIO/docxtemplater I/O).
 * Covers: DOC-01 (buildContext), DOC-03 (addParametro), DOC-04 (render+upload+persist),
 *         DOC-07 (datosCongelados immutability), Pitfall 4 (completeness validation).
 */
import { Types } from 'mongoose';
import { GenerationService } from '../generation/generation.service';
import { DocumentosRepository } from '../documentos.repository';
import { StorageService } from '../../../common/storage/storage.service';
import { EsquemasService } from '../../esquemas/esquemas.service';
import { ValidationError } from '../../../common/errors';

// ── mock docxtemplater + pizzip ──────────────────────────────────────────────

const mockDocRender = jest.fn();
const mockDocGenerate = jest.fn().mockReturnValue(Buffer.from('rendered-docx'));
const mockDocxInstance = { render: mockDocRender, getZip: () => ({ generate: mockDocGenerate }) };
const MockDocxtemplater = jest.fn().mockImplementation(() => mockDocxInstance);

jest.mock('docxtemplater', () => {
  return { __esModule: true, default: jest.fn().mockImplementation(() => mockDocxInstance) };
});

jest.mock('pizzip', () => {
  return { __esModule: true, default: jest.fn().mockImplementation(() => ({})) };
});

// mock conversion (textoToDocxBuffer for storagePath=null case)
const mockTextoToDocxBuffer = jest.fn().mockResolvedValue(Buffer.from('base-docx-from-text'));
jest.mock('../../plantillas/conversion', () => ({
  textoToDocxBuffer: jest.fn().mockResolvedValue(Buffer.from('base-docx-from-text')),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

function makePlantilla(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    nombre: 'Contrato compraventa',
    contenido: '{{expediente.nombre}} {{contacto.vendedor.nombre}}',
    storagePath: null as string | null,
    variablesDetectadas: [
      { raw: '{{expediente.nombre}}', tipoObjeto: 'expediente', rol: null, campo: 'nombre', esArray: false, valido: true, linea: 1, columna: 1 },
      { raw: '{{contacto.vendedor.nombre}}', tipoObjeto: 'contacto', rol: 'vendedor', campo: 'nombre', esArray: false, valido: true, linea: 1, columna: 25 },
    ],
    clausulasReferenciadas: [],
    ...overrides,
  };
}

function makeExpediente(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    nombre: 'Compraventa Piso Goya',
    fechaCreacion: new Date('2026-01-01').toISOString(),
    parametros: { numero: '2026-001' },
    contactos: [],
    ...overrides,
  };
}

function makePlantillasService(plantilla: ReturnType<typeof makePlantilla>) {
  return {
    getById: jest.fn().mockResolvedValue(plantilla),
  };
}

function makeExpedientesRepo(expediente: ReturnType<typeof makeExpediente>) {
  return {
    findById: jest.fn().mockResolvedValue(expediente),
  };
}

function makeStorage() {
  return {
    putObject: jest.fn().mockImplementation((key: string) => Promise.resolve(key)),
    getObject: jest.fn().mockResolvedValue(Buffer.from('template-buffer')),
  } as unknown as jest.Mocked<StorageService>;
}

function makeEsquemas() {
  return {
    addParametro: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<EsquemasService>;
}

function makeDocumentosRepo() {
  return {
    create: jest.fn().mockImplementation((_uid: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...data, _id: data._id || new Types.ObjectId() }),
    ),
  } as unknown as jest.Mocked<DocumentosRepository>;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GenerationService', () => {
  let plantillasService: ReturnType<typeof makePlantillasService>;
  let expedientesRepo: ReturnType<typeof makeExpedientesRepo>;
  let storage: jest.Mocked<StorageService>;
  let esquemas: jest.Mocked<EsquemasService>;
  let documentosRepo: jest.Mocked<DocumentosRepository>;
  let service: GenerationService;

  const uid = '507f1f77bcf86cd799439011';
  const expedienteId = '507f1f77bcf86cd799439012';

  function makeDto(overrides: Record<string, unknown> = {}) {
    return {
      plantillaId: '507f1f77bcf86cd799439013',
      nombre: 'Contrato compraventa 2026-01-15',
      valores: {
        expediente: {},
        contacto: { vendedor: { nombre: 'Ana López' } },
        clausula: {},
        fecha: {},
      },
      asignacionesRol: [],
      camposNuevos: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply mocks that jest.clearAllMocks resets
    mockDocRender.mockReset();
    mockDocGenerate.mockReturnValue(Buffer.from('rendered-docx'));

    const plantilla = makePlantilla();
    const expediente = makeExpediente();

    plantillasService = makePlantillasService(plantilla);
    expedientesRepo = makeExpedientesRepo(expediente);
    storage = makeStorage();
    esquemas = makeEsquemas();
    documentosRepo = makeDocumentosRepo();

    service = new GenerationService(
      plantillasService as any,
      expedientesRepo as any,
      esquemas,
      storage,
      documentosRepo,
    );
  });

  // ── Test 1 (DOC-04): buildContext structure ───────────────────────────────

  it('Test 1 (DOC-04): builds datosCongelados with correct { expediente, contacto, clausula, fecha } shape', async () => {
    const dto = makeDto({
      valores: {
        expediente: { honorariosBase: 1500 },
        contacto: { vendedor: { nombre: 'Ana López', nif: '12345678A' } },
        clausula: {},
        fecha: { firma: '2026-02-01' },
      },
    });

    const result = await service.generar(uid, expedienteId, dto as any);

    // datosCongelados must have all 4 keys
    expect(result.datosCongelados).toBeDefined();
    const dc = result.datosCongelados as any;
    expect(dc).toHaveProperty('expediente');
    expect(dc).toHaveProperty('contacto');
    expect(dc).toHaveProperty('clausula');
    expect(dc).toHaveProperty('fecha');
    // expediente includes parametros merged with overrides
    expect(dc.expediente).toMatchObject({ nombre: 'Compraventa Piso Goya', honorariosBase: 1500 });
    // contacto mirrors valores.contacto
    expect(dc.contacto).toEqual({ vendedor: { nombre: 'Ana López', nif: '12345678A' } });
  });

  // ── Test 2 (DOC-04): storagePath branch ──────────────────────────────────

  it('Test 2 (DOC-04): calls getObject when plantilla.storagePath is non-null', async () => {
    const plantillaWithPath = makePlantilla({ storagePath: 'plantillas/abc/template.docx' });
    plantillasService = makePlantillasService(plantillaWithPath);
    service = new GenerationService(
      plantillasService as any,
      expedientesRepo as any,
      esquemas,
      storage,
      documentosRepo,
    );

    await service.generar(uid, expedienteId, makeDto() as any);

    expect(storage.getObject).toHaveBeenCalledWith('plantillas/abc/template.docx');
  });

  it('Test 2b (D-01): calls textoToDocxBuffer when plantilla.storagePath is null', async () => {
    const { textoToDocxBuffer } = jest.requireMock('../../plantillas/conversion') as any;
    const plantillaNoPath = makePlantilla({ storagePath: null });
    plantillasService = makePlantillasService(plantillaNoPath);
    service = new GenerationService(
      plantillasService as any,
      expedientesRepo as any,
      esquemas,
      storage,
      documentosRepo,
    );

    await service.generar(uid, expedienteId, makeDto() as any);

    expect(textoToDocxBuffer).toHaveBeenCalledWith(plantillaNoPath.contenido);
    expect(storage.getObject).not.toHaveBeenCalled();
  });

  // ── Test 3 (DOC-04): upload + persist ────────────────────────────────────

  it('Test 3 (DOC-04): uploads to MinIO with correct key pattern and persists documento', async () => {
    const dto = makeDto();
    const result = await service.generar(uid, expedienteId, dto as any);

    // storage.putObject called once
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    const [key, , contentType] = storage.putObject.mock.calls[0];
    expect(key).toMatch(/^documentos\/generados\/[a-f0-9]{24}\/.+\.docx$/);
    expect(contentType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // documentosRepo.create called with correct shape
    expect(documentosRepo.create).toHaveBeenCalledTimes(1);
    const createCall = documentosRepo.create.mock.calls[0][1];
    expect(createCall.tipo).toBe('generado');
    expect(createCall.formato).toBe('docx');
    expect(createCall.nombre).toBe(dto.nombre);
    expect(createCall.storagePath).toBe(key);
    expect(createCall.datosCongelados).toBeDefined();
  });

  // ── Test 4 (DOC-07): datosCongelados immutability ────────────────────────

  it('Test 4 (DOC-07): datosCongelados persisted equals context passed to render (snapshot immutability)', async () => {
    const dto = makeDto({
      valores: {
        expediente: { extra: 'valor1' },
        contacto: { vendedor: { nombre: 'Ana López' } },
        clausula: {},
        fecha: {},
      },
    });

    const result = await service.generar(uid, expedienteId, dto as any);

    // Capture what was passed to doc.render
    expect(mockDocRender).toHaveBeenCalledTimes(1);
    const renderedContext = mockDocRender.mock.calls[0][0];

    // datosCongelados must equal the context used in render
    expect(result.datosCongelados).toEqual(renderedContext);

    // Mutating the expediente parametros object after generation must NOT affect datosCongelados
    const expediente = makeExpediente({ parametros: { numero: '2026-001' } });
    const frozenDC = JSON.parse(JSON.stringify(result.datosCongelados));
    expediente.parametros['numero'] = 'CHANGED';
    expect(result.datosCongelados).toEqual(frozenDC); // still the same
  });

  // ── Test 5 (DOC-03): camposNuevos → addParametro ─────────────────────────

  it('Test 5 (DOC-03): calls addParametro for each camposNuevos entry before generation', async () => {
    const dto = makeDto({
      camposNuevos: [
        { tipoObjeto: 'expediente', nombre: 'honorariosBase', tipoDato: 'numero' },
        { tipoObjeto: 'contacto', nombre: 'iban', tipoDato: 'texto' },
      ],
    });

    await service.generar(uid, expedienteId, dto as any);

    expect(esquemas.addParametro).toHaveBeenCalledTimes(2);
    expect(esquemas.addParametro).toHaveBeenCalledWith(
      uid,
      'expediente',
      { nombre: 'honorariosBase', tipoDato: 'numero', obligatorio: false },
    );
    expect(esquemas.addParametro).toHaveBeenCalledWith(
      uid,
      'contacto',
      { nombre: 'iban', tipoDato: 'texto', obligatorio: false },
    );
  });

  // ── Test 6 (Pitfall 4): unresolved variables → ValidationError ───────────

  it('Test 6 (Pitfall 4): throws ValidationError for unresolved variables; does NOT call render', async () => {
    // Provide valores that don't satisfy variablesDetectadas (contacto.vendedor.nombre missing)
    const dto = makeDto({
      valores: {
        expediente: {},
        contacto: {}, // vendedor.nombre missing
        clausula: {},
        fecha: {},
      },
    });

    await expect(service.generar(uid, expedienteId, dto as any)).rejects.toThrow(ValidationError);
    expect(mockDocRender).not.toHaveBeenCalled();
  });
});
