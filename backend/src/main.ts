import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Avoid 304 responses (ETag caching) for API calls, which can break JSON fetch in the frontend.
  // NestJS uses Express here (@nestjs/platform-express).
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('etag', false);

  app.enableCors({
    origin: true,
  });
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
