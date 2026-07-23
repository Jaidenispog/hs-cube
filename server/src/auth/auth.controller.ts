import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser, AuthUser } from './current-user.decorator';
import { Public } from './public.decorator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class DevLoginDto {
  @IsOptional()
  @IsIn(['OWNER', 'STAFF'])
  role?: 'OWNER' | 'STAFF';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('dev-login')
  devLogin(@Body() dto: DevLoginDto) {
    return this.auth.devLogin(dto.role);
  }

  @Public()
  @Get('demo-credentials')
  demoCredentials() {
    return this.auth.demoCredentials();
  }

  @Get('directory')
  directory(@CurrentUser() user: AuthUser) {
    return this.auth.directory(user.tenantId);
  }
}
