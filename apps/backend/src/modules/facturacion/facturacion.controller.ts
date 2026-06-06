/**
 * FacturacionController — REST endpoints for the facturas module.
 * FAC-01: GET /facturas lists entries for an expediente sorted by fecha desc.
 * FAC-02: POST /facturas creates an entry (fecha defaults to today, estado defaults pendiente).
 * FAC-03: PATCH /facturas/:id/estado updates estado only (dedicated endpoint).
 * FAC-04: PATCH /facturas/:id edits mutable fields; DELETE /facturas/:id soft-deletes.
 * FAC-05: GET /facturas/totales/:expedienteId returns total + subtotals via aggregate.
 *
 * AUTH-04: @CurrentUser extracts usuarioId from JWT — never accepted in request body.
 *
 * ROUTE ORDER: GET totales/:expedienteId MUST be declared BEFORE GET :id to avoid shadowing.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MongoIdPipe } from '../../common/pipes/mongo-id.pipe';
import { AuditInterceptor } from '../auditoria/interceptors/audit.interceptor';
import { Audited } from '../auditoria/decorators/audited.decorator';
import { FacturacionService } from './facturacion.service';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { QueryFacturaDto } from './dto/query-factura.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('facturas')
export class FacturacionController {
  constructor(private readonly service: FacturacionService) {}

  /**
   * POST /facturas
   * Crea una entrada de facturación — FAC-02.
   * fecha defaults to today in service; estado defaults to pendiente from Zod.
   */
  @Post()
  @Audited('factura', 'create')
  create(
    @CurrentUser('id') uid: string,
    @Body() dto: CreateFacturaDto,
  ) {
    return this.service.create(uid, dto);
  }

  /**
   * GET /facturas/totales/:expedienteId
   * Devuelve total + subtotales por estado via aggregate — FAC-05.
   * MUST be declared BEFORE :id route to avoid route shadowing.
   */
  @Get('totales/:expedienteId')
  getTotales(
    @CurrentUser('id') uid: string,
    @Param('expedienteId', MongoIdPipe) expedienteId: string,
  ) {
    return this.service.getTotales(uid, expedienteId);
  }

  /**
   * GET /facturas?expedienteId=:id
   * Lista entradas de facturación de un expediente — FAC-01.
   */
  @Get()
  list(
    @CurrentUser('id') uid: string,
    @Query() q: QueryFacturaDto,
  ) {
    return this.service.list(uid, q);
  }

  /**
   * GET /facturas/:id
   * Obtiene una entrada de facturación por ID.
   */
  @Get(':id')
  getById(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
  ) {
    return this.service.getById(uid, id);
  }

  /**
   * PATCH /facturas/:id/estado
   * Actualiza el estado de una factura (pendiente/facturado/cobrado) — FAC-03.
   */
  @Patch(':id/estado')
  @Audited('factura', 'update')
  updateEstado(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.service.updateEstado(uid, id, dto.estado);
  }

  /**
   * PATCH /facturas/:id
   * Edita campos mutables de una factura — FAC-04.
   */
  @Patch(':id')
  @Audited('factura', 'update')
  update(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateFacturaDto,
  ) {
    return this.service.update(uid, id, dto);
  }

  /**
   * DELETE /facturas/:id
   * Soft-delete de una factura — FAC-04.
   */
  @Delete(':id')
  @Audited('factura', 'delete')
  remove(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
  ) {
    return this.service.remove(uid, id);
  }
}
