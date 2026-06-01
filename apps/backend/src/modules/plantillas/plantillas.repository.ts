/**
 * PlantillasRepository — versioned plantilla persistence (DATOS §4.3).
 *
 * Versioning rule (LOCKED — DATOS §4.3 note + STATE key-decisions):
 *   NO transactions (single-node mongod). Sequential two-step:
 *   (a) INSERT new doc version+1 activo:true FIRST
 *   (b) deactivate old (activo:false, fechaInactivacion:now)
 *   A crash never leaves zero active versions.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plantilla, PlantillaDocument } from './schemas/plantilla.schema';
import { QueryPlantillaInput } from '@lexscribe/shared-validation';

/** Data payload shared by create/version operations (no usuarioId, no versioning fields). */
interface PlantillaData {
  nombre: string;
  contenido: string;
  formatoOriginal: 'txt' | 'docx' | 'pegado';
  storagePath?: string | null;
  variablesDetectadas?: Array<{
    raw: string;
    tipoObjeto: string;
    rol: string | null;
    campo: string;
    esArray: boolean;
  }>;
  clausulasReferenciadas?: Types.ObjectId[];
}

@Injectable()
export class PlantillasRepository {
  constructor(
    @InjectModel(Plantilla.name) private readonly model: Model<PlantillaDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  /**
   * Create the first version (v1) of a plantilla.
   * After insert, sets plantillaRaizId = _id to self-reference (v1 is its own root).
   */
  async createFirstVersion(usuarioId: string, data: PlantillaData): Promise<PlantillaDocument> {
    const doc = await this.model.create({
      ...data,
      usuarioId: this.toObjectId(usuarioId),
      version: 1,
      activo: true,
    });

    // plantillaRaizId = own _id for v1
    const updated = await this.model
      .findByIdAndUpdate(
        doc._id,
        { $set: { plantillaRaizId: doc._id } },
        { returnDocument: 'after', new: true },
      )
      .setOptions({ withInactive: true })
      .exec();

    return updated ?? doc;
  }

  /**
   * Create a new version of an existing plantilla.
   * Two-step: INSERT new version FIRST, then deactivate old (no transaction).
   */
  async createNewVersion(
    usuarioId: string,
    raizId: string,
    data: PlantillaData,
  ): Promise<PlantillaDocument> {
    // Compute next version number
    const lastVersionDoc = await this.model
      .findOne({ plantillaRaizId: this.toObjectId(raizId) })
      .sort({ version: -1 })
      .setOptions({ withInactive: true })
      .exec();

    const nextVersion = (lastVersionDoc?.version ?? 0) + 1;

    // STEP 1: INSERT new version (activo:true) FIRST
    const newDoc = await this.model.create({
      ...data,
      usuarioId: this.toObjectId(usuarioId),
      plantillaRaizId: this.toObjectId(raizId),
      version: nextVersion,
      activo: true,
    });

    // STEP 2: deactivate prior active version (NOT the newly created one)
    await this.model
      .findOneAndUpdate(
        {
          plantillaRaizId: this.toObjectId(raizId),
          activo: true,
          _id: { $ne: newDoc._id },
        },
        { $set: { activo: false, fechaInactivacion: new Date() } },
        { returnDocument: 'after' },
      )
      .setOptions({ withInactive: true })
      .exec();

    return newDoc;
  }

  async findActiveById(usuarioId: string, id: string): Promise<PlantillaDocument | null> {
    return this.model
      .findOne({
        _id: this.toObjectId(id),
        usuarioId: this.toObjectId(usuarioId),
      })
      .exec();
  }

  /**
   * Find a plantilla by _id INCLUDING inactive versions (existence checks).
   * Used by declararVariable: declaring a schema field is esquema-scoped, so it
   * must succeed even if the caller passed a now-superseded (inactive) version id.
   */
  async findByIdIncludingInactive(
    usuarioId: string,
    id: string,
  ): Promise<PlantillaDocument | null> {
    return this.model
      .findOne({
        _id: this.toObjectId(id),
        usuarioId: this.toObjectId(usuarioId),
      })
      .setOptions({ withInactive: true })
      .exec();
  }

  async findActiveByRaiz(
    usuarioId: string,
    raizId: string,
  ): Promise<PlantillaDocument | null> {
    return this.model
      .findOne({
        plantillaRaizId: this.toObjectId(raizId),
        usuarioId: this.toObjectId(usuarioId),
        activo: true,
      })
      .setOptions({ withInactive: true })
      .exec();
  }

  async listActive(
    usuarioId: string,
    query: QueryPlantillaInput,
  ): Promise<{ items: PlantillaDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      usuarioId: this.toObjectId(usuarioId),
      activo: true,
    };

    if (query.search) {
      filter.nombre = { $regex: query.search, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ fechaCreacion: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .setOptions({ withInactive: true })
        .exec(),
      this.model.countDocuments(filter).setOptions({ withInactive: true }).exec(),
    ]);

    return { items, total };
  }

  async findVersions(
    usuarioId: string,
    raizId: string,
  ): Promise<PlantillaDocument[]> {
    return this.model
      .find({
        plantillaRaizId: this.toObjectId(raizId),
        usuarioId: this.toObjectId(usuarioId),
      })
      .sort({ version: -1 })
      .setOptions({ withInactive: true })
      .exec();
  }

  async softDelete(usuarioId: string, id: string): Promise<PlantillaDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: { activo: false, fechaInactivacion: new Date() } },
        { returnDocument: 'after' },
      )
      .setOptions({ withInactive: true })
      .exec();
  }

  /** Update storagePath after MinIO upload. */
  async updateStoragePath(
    id: string,
    storagePath: string,
  ): Promise<PlantillaDocument | null> {
    return this.model
      .findByIdAndUpdate(
        this.toObjectId(id),
        { $set: { storagePath } },
        { returnDocument: 'after' },
      )
      .setOptions({ withInactive: true })
      .exec();
  }
}
