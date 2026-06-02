import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MongoIdPipe } from '../../common/pipes/mongo-id.pipe';
import { AuditInterceptor } from '../auditoria/interceptors/audit.interceptor';
import { Audited } from '../auditoria/decorators/audited.decorator';
import { PlantillasService } from './plantillas.service';
import { CreatePlantillaDto } from './dto/create-plantilla.dto';
import { UpdatePlantillaDto } from './dto/update-plantilla.dto';
import { QueryPlantillaDto } from './dto/query-plantilla.dto';
import { DeclararVariableDto } from './dto/declarar-variable.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('plantillas')
export class PlantillasController {
  constructor(private readonly service: PlantillasService) {}

  /** GET /plantillas — list active plantillas (newest first, paginated) */
  @Get()
  list(@CurrentUser('id') uid: string, @Query() q: QueryPlantillaDto) {
    return this.service.list(uid, q);
  }

  /** GET /plantillas/:id — get active version by id */
  @Get(':id')
  getById(@CurrentUser('id') uid: string, @Param('id', MongoIdPipe) id: string) {
    return this.service.getById(uid, id);
  }

  /** GET /plantillas/:id/versions — all versions (incl inactive) sorted desc */
  @Get(':id/versions')
  getVersions(@CurrentUser('id') uid: string, @Param('id', MongoIdPipe) id: string) {
    return this.service.getVersions(uid, id);
  }

  /** POST /plantillas — create from pasted or .txt text (PLAN-01 text path) */
  @Post()
  @Audited('plantilla', 'create')
  create(@CurrentUser('id') uid: string, @Body() dto: CreatePlantillaDto) {
    return this.service.create(uid, dto);
  }

  /**
   * POST /plantillas/upload — create from original .docx file (PLAN-01 docx path).
   * Multipart: field "file" (docx buffer) + field "nombre" (string).
   */
  @Post('upload')
  @Audited('plantilla', 'create')
  @UseInterceptors(FileInterceptor('file'))
  createFromDocx(
    @CurrentUser('id') uid: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('nombre') nombre: string,
  ) {
    return this.service.createFromDocx(uid, nombre, file.buffer);
  }

  /** PATCH /plantillas/:id — edit creates new active version (PLAN-06) */
  @Patch(':id')
  @Audited('plantilla', 'update')
  update(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdatePlantillaDto,
  ) {
    return this.service.update(uid, id, dto);
  }

  /** POST /plantillas/:id/declarar-variable — declare new dynamic schema field (PLAN-04) */
  @Post(':id/declarar-variable')
  @Audited('esquema', 'create')
  declararVariable(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: DeclararVariableDto,
  ) {
    return this.service.declararVariable(uid, id, dto);
  }

  /** DELETE /plantillas/:id — soft-delete */
  @Delete(':id')
  @Audited('plantilla', 'delete')
  remove(@CurrentUser('id') uid: string, @Param('id', MongoIdPipe) id: string) {
    return this.service.remove(uid, id);
  }
}
