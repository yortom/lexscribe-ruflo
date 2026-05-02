/**
 * softDeletePlugin — Mongoose plugin para soft-delete universal (AUTH-06)
 *
 * Aplica `activo: Boolean = true` y `fechaInactivacion: Date | null` a un schema.
 * Queries de lectura excluyen documentos con `activo: false` por defecto.
 * Escape hatch: `query.setOptions({ withInactive: true })` para incluir inactivos.
 *
 * NUNCA registrar con `mongoose.plugin()` globalmente — aplicar por schema.
 * Excepciones: `auditoria` y `esquemas` NO usan este plugin (ver DATOS.md §4.8).
 */
import { Schema, Query } from 'mongoose';

export function softDeletePlugin(schema: Schema): void {
  // Add soft-delete fields to schema
  schema.add({
    activo: { type: Boolean, default: true, index: true },
    fechaInactivacion: { type: Date, default: null },
  });

  // Operations that need automatic activo:true filter
  const readOps = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'count',
    'countDocuments',
    'updateOne',
    'updateMany',
  ] as const;

  for (const op of readOps) {
    schema.pre(op as Parameters<typeof schema.pre>[0], function (
      this: Query<unknown, unknown>,
    ) {
      // Escape hatch: bypass filter when withInactive option is set
      const opts = this.getOptions() as { withInactive?: boolean };
      if (opts.withInactive) return;

      // Only inject filter if activo is not explicitly queried
      const filter = this.getFilter() as Record<string, unknown>;
      if (filter.activo === undefined) {
        this.where({ activo: true });
      }
    });
  }

  // Static method: soft-delete instead of hard-delete
  schema.statics.softDelete = function (filter: Record<string, unknown>) {
    return this.updateMany(filter, {
      $set: { activo: false, fechaInactivacion: new Date() },
    });
  };
}
