import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usuarios: UsuariosRepository,
    private readonly jwt: JwtService,
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
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user._id.toString(), email: user.email },
      { expiresIn: '15m' },
    );

    const refreshPlain = randomBytes(32).toString('hex');
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

    return {
      accessToken,
      refreshPlain,
      expiresIn: 900,
      user: { id: user._id.toString(), email: user.email, nombre: user.nombre },
    };
  }

  async refresh(
    plainToken: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{ accessToken: string; refreshPlain: string; expiresIn: number }> {
    const result = await this._findUserByRefreshToken(plainToken);

    if (!result) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { user, matchedHash } = result;

    // Check expiry
    const token = user.refreshTokens.find((t) => t.tokenHash === matchedHash);
    if (!token || token.expiresAt < new Date()) {
      await this.usuarios.clearAllRefreshTokens(user._id);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new refresh token
    const newRefreshPlain = randomBytes(32).toString('hex');
    const newRefreshHash = await argon2.hash(newRefreshPlain, {
      type: argon2.argon2id,
    });
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Atomic rotate: $pull old + $push new in one operation
    const rotated = await this.usuarios.rotateRefreshToken(
      user._id,
      matchedHash,
      {
        tokenHash: newRefreshHash,
        expiresAt: newExpiresAt,
        ip,
        userAgent,
      },
    );

    if (!rotated) {
      // Token was already rotated (race condition or reuse attack) — invalidate all
      await this.usuarios.clearAllRefreshTokens(user._id);
      this.logger.warn(
        `auth.refresh.reused userId=${user._id.toString()} ip=${ip}`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user._id.toString(), email: user.email },
      { expiresIn: '15m' },
    );

    return { accessToken, refreshPlain: newRefreshPlain, expiresIn: 900 };
  }

  async logout(plainToken: string): Promise<void> {
    const result = await this._findUserByRefreshToken(plainToken);
    if (result) {
      await this.usuarios.pullRefreshToken(result.user._id, result.matchedHash);
    }
    // Silently succeed even if token not found
  }

  setRefreshCookie(res: Response, plain: string): void {
    res.cookie('refresh_token', plain, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'test',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 604800000, // 7 days in ms
    });
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'test',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
  }

  /**
   * Finds a user by iterating their refreshTokens and checking argon2.verify.
   * For mono-usuario MVP this is acceptably efficient (1 user, ≤ ~10 tokens).
   */
  private async _findUserByRefreshToken(
    plainToken: string,
  ): Promise<{ user: UsuarioDocument; matchedHash: string } | null> {
    const users = await this.usuarios.findAllWithRefreshTokens();

    for (const user of users) {
      for (const rt of user.refreshTokens) {
        try {
          const match = await argon2.verify(rt.tokenHash, plainToken);
          if (match) {
            return { user, matchedHash: rt.tokenHash };
          }
        } catch {
          // Invalid hash format — skip
        }
      }
    }
    return null;
  }
}
