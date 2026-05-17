import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedError } from '../../common/errors';

/**
 * Refresh token format: `<userId>:<64-char-random-hex>`
 * Encoding the userId allows reuse detection even after the token is rotated.
 */

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usuarios: UsuariosRepository,
    private readonly jwt: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async login(
    dto: LoginDto,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{
    accessToken: string;
    refreshPlain: string;
    expiresIn: number;
    user: { id: string; email: string; nombre: string };
  }> {
    const user = await this.usuarios.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user._id.toString(), email: user.email },
      { expiresIn: '15m' },
    );

    const refreshPlain = this._generateRefreshToken(user._id.toString());
    const refreshHash = await argon2.hash(refreshPlain, {
      type: argon2.argon2id,
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.usuarios.pushRefreshToken(user._id, {
      tokenHash: refreshHash,
      expiresAt,
      ip,
      userAgent,
    });

    const usuarioId = user._id.toString();
    this.eventEmitter.emit('auth.login', {
      usuarioId,
      recurso: 'usuario',
      recursoId: usuarioId,
      contexto: null,
      ip,
      userAgent,
    });

    return {
      accessToken,
      refreshPlain,
      expiresIn: 900,
      user: { id: usuarioId, email: user.email, nombre: user.nombre },
    };
  }

  async refresh(
    plainToken: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{ accessToken: string; refreshPlain: string; expiresIn: number }> {
    const userId = this._extractUserIdFromToken(plainToken);

    if (!userId) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Find user by ID from token prefix
    const user = await this.usuarios.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Find matching token hash in user's refreshTokens
    const matchedToken = await this._findMatchingToken(user, plainToken);

    if (!matchedToken) {
      // Token not found — could be a reuse attack (token already rotated)
      // Clear all tokens as a security measure
      await this.usuarios.clearAllRefreshTokens(user._id);
      this.logger.warn(
        `auth.refresh.reused userId=${user._id.toString()} ip=${ip}`,
      );
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check expiry
    if (matchedToken.expiresAt < new Date()) {
      await this.usuarios.clearAllRefreshTokens(user._id);
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new refresh token
    const newRefreshPlain = this._generateRefreshToken(user._id.toString());
    const newRefreshHash = await argon2.hash(newRefreshPlain, {
      type: argon2.argon2id,
    });
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Atomic rotate: $pull old + $push new in separate operations
    const rotated = await this.usuarios.rotateRefreshToken(
      user._id,
      matchedToken.tokenHash,
      {
        tokenHash: newRefreshHash,
        expiresAt: newExpiresAt,
        ip,
        userAgent,
      },
    );

    if (!rotated) {
      // Concurrent request already rotated this token
      await this.usuarios.clearAllRefreshTokens(user._id);
      throw new UnauthorizedError('Invalid refresh token');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user._id.toString(), email: user.email },
      { expiresIn: '15m' },
    );

    return { accessToken, refreshPlain: newRefreshPlain, expiresIn: 900 };
  }

  async logout(
    plainToken: string,
    ip?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    const userId = this._extractUserIdFromToken(plainToken);
    if (!userId) return;

    const user = await this.usuarios.findById(userId);
    if (!user) return;

    const matchedToken = await this._findMatchingToken(user, plainToken);
    if (matchedToken) {
      await this.usuarios.pullRefreshToken(user._id, matchedToken.tokenHash);
    }

    this.eventEmitter.emit('auth.logout', {
      usuarioId: userId,
      recurso: 'usuario',
      recursoId: userId,
      contexto: null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
    // Silently succeed even if token not found
  }

  setRefreshCookie(res: Response, plain: string): void {
    res.cookie('refresh_token', plain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 604800000, // 7 days in ms
    });
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  /**
   * Generate a refresh token with userId prefix for reuse detection.
   * Format: `<userId>:<64-char-random-hex>`
   */
  private _generateRefreshToken(userId: string): string {
    const random = randomBytes(32).toString('hex');
    return `${userId}:${random}`;
  }

  /**
   * Extract userId from token prefix.
   */
  private _extractUserIdFromToken(plainToken: string): string | null {
    const colonIdx = plainToken.indexOf(':');
    if (colonIdx <= 0) return null;
    return plainToken.substring(0, colonIdx);
  }

  /**
   * Find the matching token hash in a user's refreshTokens array.
   */
  private async _findMatchingToken(
    user: UsuarioDocument,
    plainToken: string,
  ): Promise<{
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    ip: string | null;
    userAgent: string | null;
  } | null> {
    for (const rt of user.refreshTokens) {
      try {
        const match = await argon2.verify(rt.tokenHash, plainToken);
        if (match) {
          return rt;
        }
      } catch {
        // Invalid hash format — skip
      }
    }
    return null;
  }
}
