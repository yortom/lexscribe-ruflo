import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Auditoria, AuditoriaSchema } from './schemas/auditoria.schema';
import { AuditoriaRepository } from './auditoria.repository';
import { AuditoriaService } from './auditoria.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Auditoria.name, schema: AuditoriaSchema },
    ]),
  ],
  providers: [AuditoriaRepository, AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
