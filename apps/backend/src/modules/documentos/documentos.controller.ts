import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { DocumentosService } from './documentos.service';
import { GenerateDocumentoDto } from './dto/generate-documento.dto';
import { QueryDocumentoDto } from './dto/query-documento.dto';
import { ValidationError } from '../../common/errors';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  /**
   * POST /documentos/generar/:expedienteId
   * Genera un documento .docx desde una plantilla + expediente (DOC-04).
   * DOC-02: vincula asignaciones de rol durante la generación.
   */
  @Post('generar/:expedienteId')
  @Audited('documento', 'create')
  generar(
    @CurrentUser('id') uid: string,
    @Param('expedienteId', MongoIdPipe) expedienteId: string,
    @Body() dto: GenerateDocumentoDto,
  ) {
    return this.service.generar(uid, expedienteId, dto);
  }

  /**
   * POST /documentos/upload/:expedienteId
   * Subida de documento preexistente (.docx/.pdf/.txt) — DOC-06.
   * Multipart: field "file" (buffer) + field "nombre" (string).
   */
  @Post('upload/:expedienteId')
  @Audited('documento', 'create')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser('id') uid: string,
    @Param('expedienteId', MongoIdPipe) expedienteId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('nombre') nombre: string,
  ) {
    if (!nombre || !nombre.trim()) {
      throw new ValidationError('El campo nombre es obligatorio');
    }
    return this.service.uploadExistente(uid, expedienteId, { file, nombre });
  }

  /**
   * GET /documentos?expedienteId=...
   * Lista documentos del expediente por fechaCreacion descendente.
   */
  @Get()
  list(
    @CurrentUser('id') uid: string,
    @Query('expedienteId') expedienteId: string,
    @Query() q: QueryDocumentoDto,
  ) {
    if (!expedienteId) {
      throw new ValidationError('El parámetro expedienteId es obligatorio');
    }
    return this.service.list(uid, expedienteId, q);
  }

  /**
   * GET /documentos/:id
   * Obtiene un documento por ID.
   */
  @Get(':id')
  getById(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
  ) {
    return this.service.getById(uid, id);
  }

  /**
   * GET /documentos/:id/download
   * Devuelve una presigned URL de MinIO con 300s TTL (DOC-05).
   */
  @Get(':id/download')
  download(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
  ) {
    return this.service.getDownloadUrl(uid, id);
  }

  /**
   * DELETE /documentos/:id?eventosAction=conservar|eliminar
   * Soft-delete del documento (CAL-05 / FL-9).
   * eventosAction=eliminar also soft-deletes associated events.
   * eventosAction=conservar (default) keeps events active.
   */
  @Delete(':id')
  @Audited('documento', 'delete')
  remove(
    @CurrentUser('id') uid: string,
    @Param('id', MongoIdPipe) id: string,
    @Query('eventosAction') eventosAction: 'conservar' | 'eliminar' = 'conservar',
  ) {
    return this.service.remove(uid, id, eventosAction);
  }
}
