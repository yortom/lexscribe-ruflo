import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from 'next/navigation';
import { GeneracionForm } from '../../components/documentos/GeneracionForm';
import { generarDocumento } from '../../lib/api/documentos';
import type { Plantilla, ExpedienteDetailResponse } from '@lexscribe/shared-types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock documentos API
vi.mock('../../lib/api/documentos', () => ({
  generarDocumento: vi.fn(),
}));

// Mock contactos API (needed by RolFaltanteModal)
vi.mock('../../lib/api/contactos', () => ({
  listContactos: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
  createContacto: vi.fn(),
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const sampleExpediente: ExpedienteDetailResponse = {
  _id: 'exp001',
  usuarioId: 'u1',
  nombre: 'Expediente Test',
  parametros: { honorariosBase: 500 },
  contactos: [],
  documentos: [],
  activo: true,
  fechaInactivacion: null,
  fechaCreacion: '2026-01-01T00:00:00Z',
  fechaActualizacion: '2026-01-01T00:00:00Z',
};

function makePlantilla(variablesDetectadas: Plantilla['variablesDetectadas']): Plantilla {
  return {
    _id: '507f1f77bcf86cd799439011',
    usuarioId: 'u1',
    plantillaRaizId: '507f1f77bcf86cd799439011',
    version: 1,
    nombre: 'Contrato Base',
    contenido: '',
    formatoOriginal: 'pegado',
    storagePath: null,
    variablesDetectadas,
    clausulasReferenciadas: [],
    activo: true,
    fechaInactivacion: null,
    fechaCreacion: '2026-01-01T00:00:00Z',
    fechaActualizacion: '2026-01-01T00:00:00Z',
  };
}

describe('GeneracionForm', () => {
  const mockRouter = { push: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
  });

  it('renderiza seccion "Datos del expediente" para variables expediente', () => {
    const plantilla = makePlantilla([
      { raw: '{{expediente.nombre}}', tipoObjeto: 'expediente', rol: null, campo: 'nombre', esArray: false },
    ]);

    render(
      <GeneracionForm
        expedienteId="exp001"
        plantilla={plantilla}
        expediente={sampleExpediente}
        contactoFieldsByRol={{}}
      />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByText('Datos del expediente')).toBeTruthy();
  });

  it('boton Generar deshabilitado con etiqueta "Generar (faltan N)" cuando hay campos vacios', () => {
    const plantilla = makePlantilla([
      { raw: '{{expediente.descripcion}}', tipoObjeto: 'expediente', rol: null, campo: 'descripcion', esArray: false },
      { raw: '{{fecha.firma}}', tipoObjeto: 'fecha', rol: null, campo: 'firma', esArray: false },
    ]);

    render(
      <GeneracionForm
        expedienteId="exp001"
        plantilla={plantilla}
        expediente={sampleExpediente}
        contactoFieldsByRol={{}}
      />,
      { wrapper: makeWrapper() },
    );

    const btn = screen.getByRole('button', { name: /generar \(faltan/i });
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('boton Generar se habilita y muestra "Generar" al rellenar todos los campos', async () => {
    const plantilla = makePlantilla([
      { raw: '{{expediente.descripcion}}', tipoObjeto: 'expediente', rol: null, campo: 'descripcion', esArray: false },
    ]);

    render(
      <GeneracionForm
        expedienteId="exp001"
        plantilla={plantilla}
        expediente={sampleExpediente}
        contactoFieldsByRol={{}}
      />,
      { wrapper: makeWrapper() },
    );

    // Inicialmente deshabilitado
    expect(screen.getByRole('button', { name: /generar \(faltan/i })).toBeTruthy();

    // Rellenar el campo
    const input = screen.getByPlaceholderText('descripcion');
    fireEvent.change(input, { target: { value: 'Contrato de prueba' } });

    // Ahora habilitado
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /^Generar$/ });
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('muestra boton de asignar rol cuando hay roles requeridos sin resolver', () => {
    const plantilla = makePlantilla([
      { raw: '{{contacto.vendedor.nombre}}', tipoObjeto: 'contacto', rol: 'vendedor', campo: 'nombre', esArray: false },
    ]);

    render(
      <GeneracionForm
        expedienteId="exp001"
        plantilla={plantilla}
        expediente={sampleExpediente}
        contactoFieldsByRol={{}}
      />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByText(/asignar contacto para rol vendedor/i)).toBeTruthy();
  });

  it('pre-rellena el campo expediente.nombre con el nombre del expediente', () => {
    const plantilla = makePlantilla([
      { raw: '{{expediente.nombre}}', tipoObjeto: 'expediente', rol: null, campo: 'nombre', esArray: false },
    ]);

    render(
      <GeneracionForm
        expedienteId="exp001"
        plantilla={plantilla}
        expediente={sampleExpediente}
        contactoFieldsByRol={{}}
      />,
      { wrapper: makeWrapper() },
    );

    const input = screen.getByPlaceholderText('nombre') as HTMLInputElement;
    expect(input.value).toBe('Expediente Test');
  });

  it('llama generarDocumento y redirige al expediente al enviar', async () => {
    vi.mocked(generarDocumento).mockResolvedValueOnce({} as never);

    const plantilla = makePlantilla([
      { raw: '{{expediente.nombre}}', tipoObjeto: 'expediente', rol: null, campo: 'nombre', esArray: false },
    ]);

    render(
      <GeneracionForm
        expedienteId="exp001"
        plantilla={plantilla}
        expediente={sampleExpediente}
        contactoFieldsByRol={{}}
      />,
      { wrapper: makeWrapper() },
    );

    // nombre ya pre-rellenado — boton habilitado
    const btn = screen.getByRole('button', { name: /^Generar$/ });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(generarDocumento).toHaveBeenCalledWith(
        'exp001',
        expect.objectContaining({
          plantillaId: '507f1f77bcf86cd799439011',
        }),
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/expedientes/exp001');
    });
  });
});
