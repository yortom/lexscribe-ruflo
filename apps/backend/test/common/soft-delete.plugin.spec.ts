/**
 * Unit tests for softDeletePlugin (AUTH-06)
 * Uses mongodb-memory-server directly (not e2e setup-e2e.ts).
 */
import mongoose, { Schema, model, Model, Document } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { softDeletePlugin } from '../../src/common/plugins/soft-delete.plugin';

interface FooDoc extends Document {
  nombre: string;
  activo: boolean;
  fechaInactivacion: Date | null;
}

interface FooModel extends Model<FooDoc> {
  softDelete(filter: object): Promise<unknown>;
}

let mongo: MongoMemoryServer;
let Foo: FooModel;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const fooSchema = new Schema<FooDoc>({ nombre: { type: String, required: true } });
  fooSchema.plugin(softDeletePlugin);

  Foo = model<FooDoc, FooModel>('Foo', fooSchema);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Foo.deleteMany({});
});

describe('softDeletePlugin', () => {
  it('Test 1: schema adds activo:Boolean=true and fechaInactivacion:Date|null fields', async () => {
    const doc = await Foo.create({ nombre: 'a' });
    expect(doc.activo).toBe(true);
    expect(doc.fechaInactivacion).toBeNull();
  });

  it('Test 2: find() returns active docs; after softDelete(), find() returns 0', async () => {
    await Foo.create({ nombre: 'a' });
    const before = await Foo.find();
    expect(before).toHaveLength(1);

    await (Foo as FooModel).softDelete({ nombre: 'a' });

    const after = await Foo.find();
    expect(after).toHaveLength(0);
  });

  it('Test 3: find().setOptions({withInactive:true}) returns inactive docs', async () => {
    await Foo.create({ nombre: 'b' });
    await (Foo as FooModel).softDelete({ nombre: 'b' });

    const withInactive = await Foo.find().setOptions({ withInactive: true });
    expect(withInactive).toHaveLength(1);
  });

  it('Test 4: softDelete sets fechaInactivacion to a non-null Date', async () => {
    await Foo.create({ nombre: 'c' });
    await (Foo as FooModel).softDelete({ nombre: 'c' });

    const [doc] = await Foo.find().setOptions({ withInactive: true });
    expect(doc.fechaInactivacion).toBeInstanceOf(Date);
    expect(doc.fechaInactivacion).not.toBeNull();
  });

  it('Test 5: findOne with explicit activo:false filter and withInactive:true finds the inactive doc', async () => {
    await Foo.create({ nombre: 'd' });
    await (Foo as FooModel).softDelete({ nombre: 'd' });

    const doc = await Foo.findOne({ activo: false }).setOptions({ withInactive: true });
    expect(doc).not.toBeNull();
    expect(doc!.nombre).toBe('d');
  });

  it('Test 6: countDocuments() excludes inactive by default', async () => {
    await Foo.create({ nombre: 'e' });
    await Foo.create({ nombre: 'f' });
    await (Foo as FooModel).softDelete({ nombre: 'e' });

    const count = await Foo.countDocuments();
    expect(count).toBe(1);
  });
});
