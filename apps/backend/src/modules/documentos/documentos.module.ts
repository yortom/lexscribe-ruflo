/**
 * DocumentosModule — HTTP layer + orquestación de documentos.
 * Pattern 5 (Research §forwardRef): DocumentosModule ↔ ExpedientesModule tienen ciclo.
 * DOC-04/05/06: generar, descargar, subir documentos.
 * EXPE-07: DocumentosRepository exportado para que ExpedientesService pueda poblar documentos reales.
 */
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Documento, DocumentoSchema } from './schemas/documento.schema';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { DocumentosRepository } from './documentos.repository';
import { GenerationService } from './generation/generation.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';
import { EsquemasModule } from '../esquemas/esquemas.module';
import { StorageModule } from '../../common/storage/storage.module';
import { PlantillasModule } from '../plantillas/plantillas.module';
import { ExpedientesModule } from '../expedientes/expedientes.module';
import { ContactosModule } from '../contactos/contactos.module';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Documento.name, schema: DocumentoSchema }]),
    AuditoriaModule,
    AuthModule,
    EsquemasModule,
    StorageModule,
    PlantillasModule,                       // PlantillasService.getById (sin forwardRef — no hay ciclo)
    forwardRef(() => ExpedientesModule),    // ExpedientesService.linkContacto/getById (ciclo con ExpedientesModule)
    forwardRef(() => ContactosModule),      // ContactosRepository (modal D-06, opcional)
    EventosModule,                          // EventosRepository (FL-9 softDeleteByDocumentoId — one-way, no forwardRef — Pitfall 4)
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService, DocumentosRepository, GenerationService],
  exports: [DocumentosService, DocumentosRepository],
})
export class DocumentosModule {}
