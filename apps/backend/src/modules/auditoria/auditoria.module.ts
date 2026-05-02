import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Auditoria, AuditoriaSchema } from './schemas/auditoria.schema';
import { AuditoriaRepository } from './auditoria.repository';
import { AuditoriaService } from './auditoria.service';
import { AuditListener } from './listeners/audit.listener';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Auditoria.name, schema: AuditoriaSchema },
    ]),
  ],
  providers: [AuditoriaRepository, AuditoriaService, AuditListener, AuditInterceptor],
  exports: [AuditoriaService, AuditInterceptor],
})
export class AuditoriaModule {}
