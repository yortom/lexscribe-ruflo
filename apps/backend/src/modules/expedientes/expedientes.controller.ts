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
import { ExpedientesService } from './expedientes.service';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { QueryExpedienteDto } from './dto/query-expediente.dto';
import { LinkContactoDto } from './dto/link-contacto.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly service: ExpedientesService) {}

  @Get()
  list(@CurrentUser('id') uid: string, @Query() q: QueryExpedienteDto) {
    return this.service.list(uid, q);
  }

  @Get(':id')
  getById(@CurrentUser('id') uid: string, @Param('id', MongoIdPipe) id: string) {
    return this.service.getById(uid, id);
  }

  @Post()
  @Audited('expediente', 'create')
  create(@CurrentUser('id') uid: string, @Body() dto: CreateExpedienteDto) {
    return this.service.create(uid, dto);
  }

  @Patch(':id')
  @Audited('expediente', 'update')
  update(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateExpedienteDto,
  ) {
    return this.service.update(uid, id, dto);
  }

  @Delete(':id')
  @Audited('expediente', 'delete')
  remove(@CurrentUser('id') uid: string, @Param('id', MongoIdPipe) id: string) {
    return this.service.remove(uid, id);
  }

  // EXPE-02: link contacto — auditoría vía evento '*.linked' (no @Audited).
  @Post(':id/contactos')
  linkContacto(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: LinkContactoDto,
  ) {
    return this.service.linkContacto(uid, id, dto);
  }

  // EXPE-02: unlink contacto — auditoría vía evento '*.unlinked' (no @Audited).
  @Delete(':id/contactos/:contactoId/:rol')
  unlinkContacto(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Param('contactoId', MongoIdPipe) contactoId: string,
    @Param('rol') rol: string,
  ) {
    return this.service.unlinkContacto(uid, id, contactoId, rol);
  }
}
