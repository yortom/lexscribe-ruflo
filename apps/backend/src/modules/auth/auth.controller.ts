import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    const result = await this.auth.login(dto, ip, userAgent);
    this.auth.setRefreshCookie(res, result.refreshPlain);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const plainToken: string | undefined = (req as any).cookies?.[
      'refresh_token'
    ];
    if (!plainToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const ip = req.ip ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    const result = await this.auth.refresh(plainToken, ip, userAgent);
    this.auth.setRefreshCookie(res, result.refreshPlain);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const plainToken: string | undefined = (req as any).cookies?.[
      'refresh_token'
    ];
    if (plainToken) {
      await this.auth.logout(plainToken);
    }
    this.auth.clearRefreshCookie(res);
  }
}
