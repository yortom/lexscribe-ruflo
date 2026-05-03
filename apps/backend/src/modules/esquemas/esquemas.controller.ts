import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../auditoria/interceptors/audit.interceptor';
import { Audited } from '../auditoria/decorators/audited.decorator';
import { EsquemasService } from './esquemas.service';
import { AddParametroDto } from './dto/add-parametro.dto';
import { TipoObjetoSchema } from './dto/tipo-objeto';
import { ValidationError } from '../../common/errors';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('esquemas')
export class EsquemasController {
  constructor(private readonly service: EsquemasService) {}

  private parseTipoObjeto(tipo: string) {
    try {
      return TipoObjetoSchema.parse(tipo);
    } catch {
      throw new ValidationError(`tipoObjeto must be one of: expediente, contacto`);
    }
  }

  @Get(':tipoObjeto')
  get(
    @Param('tipoObjeto') tipo: string,
    @CurrentUser('id') uid: string,
  ) {
    const tipoObjeto = this.parseTipoObjeto(tipo);
    return this.service.getByTipo(uid, tipoObjeto);
  }

  @Post(':tipoObjeto/parametros')
  @Audited('esquema', 'create')
  add(
    @Param('tipoObjeto') tipo: string,
    @Body() dto: AddParametroDto,
    @CurrentUser('id') uid: string,
  ) {
    const tipoObjeto = this.parseTipoObjeto(tipo);
    return this.service.addParametro(uid, tipoObjeto, dto);
  }

  @Delete(':tipoObjeto/parametros/:nombre')
  remove(
    @Param('tipoObjeto') tipo: string,
    @Param('nombre') nombre: string,
    @CurrentUser('id') uid: string,
  ) {
    const tipoObjeto = this.parseTipoObjeto(tipo);
    return this.service.deleteParametro(uid, tipoObjeto, nombre);
  }
}
