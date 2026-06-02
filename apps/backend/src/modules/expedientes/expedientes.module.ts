import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expediente, ExpedienteSchema } from './schemas/expediente.schema';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { ExpedientesRepository } from './expedientes.repository';
import { EsquemasModule } from '../esquemas/esquemas.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';
import { ContactosModule } from '../contactos/contactos.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Expediente.name, schema: ExpedienteSchema }]),
    EsquemasModule, // EsquemasService (EXPE-04 parámetros dinámicos)
    AuditoriaModule, // AuditInterceptor
    AuthModule, // JwtAuthGuard
    forwardRef(() => ContactosModule), // ContactosRepository (link valida contacto) — ciclo CONT-05
  ],
  controllers: [ExpedientesController],
  providers: [ExpedientesService, ExpedientesRepository],
  exports: [ExpedientesService, ExpedientesRepository],
})
export class ExpedientesModule {}
