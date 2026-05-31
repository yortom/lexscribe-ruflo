import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plantilla, PlantillaSchema } from './schemas/plantilla.schema';
import { PlantillasController } from './plantillas.controller';
import { PlantillasService } from './plantillas.service';
import { PlantillasRepository } from './plantillas.repository';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';
import { EsquemasModule } from '../esquemas/esquemas.module';
import { StorageModule } from '../../common/storage/storage.module';

/**
 * PlantillasModule — versioned plantilla CRUD + declare-variable + .docx conversion.
 * Exports PlantillasService + PlantillasRepository for Phase 6 (documentos) to read versions.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plantilla.name, schema: PlantillaSchema }]),
    AuditoriaModule,  // AuditInterceptor
    AuthModule,       // JwtAuthGuard
    EsquemasModule,   // EsquemasService.addParametro (PLAN-04)
    StorageModule,    // StorageService.putObject (PLAN-01 .docx upload)
  ],
  controllers: [PlantillasController],
  providers: [PlantillasService, PlantillasRepository],
  exports: [PlantillasService, PlantillasRepository],
})
export class PlantillasModule {}
