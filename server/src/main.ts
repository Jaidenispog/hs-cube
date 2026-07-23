import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // The mobile app builds every request as `${API_BASE_URL}${path}` where API_BASE_URL ends in /api/v1.
  app.setGlobalPrefix('api/v1');

  // The web build runs on a different origin, so allow cross-origin calls. Native apps don't need this.
  app.enableCors({ origin: true });

  // whitelist strips unknown fields; we do NOT forbidNonWhitelisted, so extra fields never 400 the caller.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`OneStack API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
