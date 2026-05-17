import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { UsuariosRepository } from '../src/modules/usuarios/usuarios.repository';
import { EsquemasRepository } from '../src/modules/esquemas/esquemas.repository';

export async function runSeed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const log = new Logger('seed');

  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    await app.close();
    throw new Error('SEED_USER_EMAIL and SEED_USER_PASSWORD are required');
  }

  const usuarios = app.get(UsuariosRepository);
  const esquemas = app.get(EsquemasRepository);

  let user = await usuarios.findByEmail(email);
  if (!user) {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    user = await usuarios.create({
      email,
      nombre: 'Admin',
      rol: 'admin',
      passwordHash,
    });
    log.log(`Created seed user ${email}`);
  } else {
    log.log(
      `Seed user ${email} already exists, skipping (password not overwritten)`,
    );
  }

  for (const tipo of ['expediente', 'contacto'] as const) {
    await esquemas.upsertEmpty(user._id, tipo);
    log.log(`Esquema ${tipo} ensured`);
  }

  await app.close();
}

// Only run as entrypoint when called directly
if (require.main === module) {
  runSeed().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
