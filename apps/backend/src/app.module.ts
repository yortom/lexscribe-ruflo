import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // === Domain modules (placeholder — implement one by one) ===
    // AuthModule,
    // UsuariosModule,        // ARQ §5.1, F-090 multi-user ready
    // ExpedientesModule,     // F-001..F-008
    // ContactosModule,       // F-050..F-055
    // PlantillasModule,      // F-020..F-029 + versionado
    // ClausulasModule,       // F-040..F-046
    // DocumentosModule,      // F-010..F-018
    // EventosModule,         // F-060..F-066
    // FacturacionModule,     // F-070..F-075
    // EsquemasModule,        // F-090..F-096 (esquema dinámico)
    // AuditoriaModule,       // ARQ §18 (log inmutable de acciones)
  ],
})
export class AppModule {}
