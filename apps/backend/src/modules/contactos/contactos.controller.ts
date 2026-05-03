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
import { AuditInterceptor } from '../auditoria/interceptors/audit.interceptor';
import { Audited } from '../auditoria/decorators/audited.decorator';
import { ContactosService } from './contactos.service';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';
import { QueryContactoDto } from './dto/query-contacto.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('contactos')
export class ContactosController {
  constructor(private readonly service: ContactosService) {}

  @Get()
  list(@CurrentUser('id') uid: string, @Query() q: QueryContactoDto) {
    return this.service.list(uid, q);
  }

  @Get(':id')
  getById(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.service.getById(uid, id);
  }

  @Post()
  @Audited('contacto', 'create')
  create(@CurrentUser('id') uid: string, @Body() dto: CreateContactoDto) {
    return this.service.create(uid, dto);
  }

  @Patch(':id')
  @Audited('contacto', 'update')
  update(
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactoDto,
  ) {
    return this.service.update(uid, id, dto);
  }

  @Delete(':id')
  @Audited('contacto', 'delete')
  remove(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.service.remove(uid, id);
  }
}
