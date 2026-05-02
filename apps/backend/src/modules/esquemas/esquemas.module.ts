import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Esquema, EsquemaSchema } from './schemas/esquema.schema';
import { EsquemasRepository } from './esquemas.repository';
import { EsquemasService } from './esquemas.service';
import { EsquemasController } from './esquemas.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Esquema.name, schema: EsquemaSchema }]),
    AuditoriaModule,
  ],
  providers: [EsquemasRepository, EsquemasService],
  controllers: [EsquemasController],
  exports: [EsquemasService, EsquemasRepository],
})
export class EsquemasModule {}
