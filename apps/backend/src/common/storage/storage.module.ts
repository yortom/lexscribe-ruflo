import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * StorageModule — exports StorageService for explicit import in feature modules.
 * NOT @Global() — modules import this explicitly (DDD, CLAUDE.md).
 * Used by: PlantillasModule (Phase 5), DocumentosModule (Phase 6).
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
