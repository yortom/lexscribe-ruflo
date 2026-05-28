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
import { ClausulasService } from './clausulas.service';
import { CreateClausulaDto } from './dto/create-clausula.dto';
import { UpdateClausulaDto } from './dto/update-clausula.dto';
import { QueryClausulaDto } from './dto/query-clausula.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('clausulas')
export class ClausulasController {
  constructor(private readonly service: ClausulasService) {}

  @Get()
  list(@CurrentUser('id') uid: string, @Query() q: QueryClausulaDto) {
    return this.service.list(uid, q);
  }

  @Get(':id')
  getById(@CurrentUser('id') uid: string, @Param('id', MongoIdPipe) id: string) {
    return this.service.getById(uid, id);
  }

  @Post()
  @Audited('clausula', 'create')
  create(@CurrentUser('id') uid: string, @Body() dto: CreateClausulaDto) {
    return this.service.create(uid, dto);
  }

  @Patch(':id')
  @Audited('clausula', 'update')
  update(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateClausulaDto,
  ) {
    return this.service.update(uid, id, dto);
  }

  @Delete(':id')
  @Audited('clausula', 'delete')
  remove(@CurrentUser('id') uid: string, @Param('id', MongoIdPipe) id: string) {
    return this.service.remove(uid, id);
  }
}
