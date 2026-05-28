import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from './common/logger/logger.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { ContactosModule } from './modules/contactos/contactos.module';
import { ClausulasModule } from './modules/clausulas/clausulas.module';
import { EsquemasModule } from './modules/esquemas/esquemas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    LoggerModule,
    HealthModule,
    AuthModule,
    ContactosModule,
    ClausulasModule,
    EsquemasModule,
    UsuariosModule,
    AuditoriaModule,
  ],
})
export class AppModule {}
