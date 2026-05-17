import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contacto, ContactoSchema } from './schemas/contacto.schema';
import { ContactosController } from './contactos.controller';
import { ContactosService } from './contactos.service';
import { ContactosRepository } from './contactos.repository';
import { EsquemasModule } from '../esquemas/esquemas.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Contacto.name, schema: ContactoSchema }]),
    EsquemasModule, // Para inyectar EsquemasService (CONT-03)
    AuditoriaModule, // Para AuditInterceptor
    AuthModule, // Para JwtAuthGuard
  ],
  controllers: [ContactosController],
  providers: [ContactosService, ContactosRepository],
  exports: [ContactosService, ContactosRepository],
})
export class ContactosModule {}
