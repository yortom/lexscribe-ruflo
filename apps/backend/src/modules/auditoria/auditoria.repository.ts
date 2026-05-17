import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Auditoria, AuditoriaDocument } from './schemas/auditoria.schema';
import type { AuditoriaRecord } from './types';

@Injectable()
export class AuditoriaRepository {
  constructor(
    @InjectModel(Auditoria.name)
    private readonly model: Model<AuditoriaDocument>,
  ) {}

  async create(record: AuditoriaRecord): Promise<AuditoriaDocument> {
    return this.model.create(record);
  }
}
