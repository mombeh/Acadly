import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: 'http://localhost:3000',
  });

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
