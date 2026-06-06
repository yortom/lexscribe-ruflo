/**
 * EventosController — REST endpoints for the eventos module.
 * CAL-01/CAL-02: POST /eventos creates evento (origen documento|manual).
 * CAL-03: GET /eventos lists with filters (expedienteId, date range, soloCalendario).
 * CAL-04: PATCH /eventos/:id updates mutable fields (color, mostrarEnCalendario, etc.).
 * CAL-05/FL-9: GET /eventos/count?documentoId=:id returns count for pre-delete modal.
 * AUTH-04: @CurrentUser extracts usuarioId from JWT — never accepted in body.
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
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { QueryEventoDto } from './dto/query-evento.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('eventos')
export class EventosController {
  constructor(private readonly service: EventosService) {}

  /**
   * POST /eventos
   * Crea un evento (origen documento o manual) — CAL-01 / CAL-02.
   */
  @Post()
  @Audited('evento', 'create')
  create(
    @CurrentUser('id') uid: string,
    @Body() dto: CreateEventoDto,
  ) {
    return this.service.create(uid, dto);
  }

  /**
   * GET /eventos/count?documentoId=:id
   * Devuelve el número de eventos activos de un documento (FL-9 pre-check).
   * MUST be placed BEFORE GET(':id') to avoid route shadowing.
   */
  @Get('count')
  countByDocumento(
    @CurrentUser('id') uid: string,
    @Query('documentoId') documentoId: string,
  ) {
    return this.service.countByDocumento(uid, documentoId);
  }

  /**
   * GET /eventos
   * Lista eventos con filtros opcionales (CAL-03).
   */
  @Get()
  list(
    @CurrentUser('id') uid: string,
    @Query() q: QueryEventoDto,
  ) {
    return this.service.list(uid, q);
  }

  /**
   * GET /eventos/:id
   * Obtiene un evento por ID.
   */
  @Get(':id')
  getById(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
  ) {
    return this.service.getById(uid, id);
  }

  /**
   * PATCH /eventos/:id
   * Actualiza campos mutables del evento (color, mostrarEnCalendario, etc.) — CAL-04.
   */
  @Patch(':id')
  @Audited('evento', 'update')
  update(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateEventoDto,
  ) {
    return this.service.update(uid, id, dto);
  }

  /**
   * DELETE /eventos/:id
   * Soft-delete de un evento.
   */
  @Delete(':id')
  @Audited('evento', 'delete')
  remove(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
  ) {
    return this.service.remove(uid, id);
  }
}
