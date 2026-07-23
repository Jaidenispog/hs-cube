import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';

@Module({
  imports: [
    // `global: true` exports JwtService app-wide so the global AuthGuard (in AppModule) can inject it.
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
