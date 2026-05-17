import { Injectable } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository';
import { UsuarioDocument } from './schemas/usuario.schema';
import { Types } from 'mongoose';

@Injectable()
export class UsuariosService {
  constructor(private readonly repo: UsuariosRepository) {}

  findByEmail(email: string): Promise<UsuarioDocument | null> {
    return this.repo.findByEmail(email);
  }

  findById(id: string | Types.ObjectId): Promise<UsuarioDocument | null> {
    return this.repo.findById(id);
  }
}
