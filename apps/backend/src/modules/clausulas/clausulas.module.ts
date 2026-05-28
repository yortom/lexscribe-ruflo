import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Clausula, ClausulaSchema } from './schemas/clausula.schema';
import { ClausulasController } from './clausulas.controller';
import { ClausulasService } from './clausulas.service';
import { ClausulasRepository } from './clausulas.repository';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Clausula.name, schema: ClausulaSchema }]),
    AuditoriaModule, // Para AuditInterceptor
    AuthModule, // Para JwtAuthGuard
  ],
  controllers: [ClausulasController],
  providers: [ClausulasService, ClausulasRepository],
  exports: [ClausulasService, ClausulasRepository],
})
export class ClausulasModule {}
