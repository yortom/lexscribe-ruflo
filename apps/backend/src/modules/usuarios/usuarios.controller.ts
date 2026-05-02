import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUser,
} from '../../common/decorators/current-user.decorator';

@Controller('usuarios')
export class UsuariosController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtUser): JwtUser {
    return user;
  }
}
