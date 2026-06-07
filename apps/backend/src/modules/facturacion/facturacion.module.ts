/**
 * FacturacionModule — REST endpoints + business logic for the facturas module.
 * FAC-01..FAC-05: CRUD + estado update + getTotales aggregate.
 * Exports FacturacionService for potential cross-module consumption.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Factura, FacturaSchema } from './schemas/factura.schema';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';
import { FacturacionRepository } from './facturacion.repository';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Factura.name, schema: FacturaSchema }]),
    AuditoriaModule,
    AuthModule,
  ],
  controllers: [FacturacionController],
  providers: [FacturacionService, FacturacionRepository],
  exports: [FacturacionService],
})
export class FacturacionModule {}
