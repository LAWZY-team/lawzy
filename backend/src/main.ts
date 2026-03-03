import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('etag', false);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Frontend defaults to http://localhost:5000 in several places, so keep dev default aligned.
  const port = Number(process.env.PORT) || 5000;
  await app.listen(port);
}
bootstrap();
