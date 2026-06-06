/**
 * EventosModule — REST endpoints + business logic for the eventos/calendario module.
 * CAL-01..CAL-05: create, list, update, delete eventos + softDeleteByDocumentoId for FL-9.
 * One-way dependency: DocumentosModule imports EventosModule (no forwardRef needed — Pitfall 4).
 * Exports EventosService + EventosRepository for FL-9 consumption in DocumentosModule (07-03).
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Evento, EventoSchema } from './schemas/evento.schema';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { EventosRepository } from './eventos.repository';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Evento.name, schema: EventoSchema }]),
    AuditoriaModule,
    AuthModule,
  ],
  controllers: [EventosController],
  providers: [EventosService, EventosRepository],
  exports: [EventosService, EventosRepository],
})
export class EventosModule {}
