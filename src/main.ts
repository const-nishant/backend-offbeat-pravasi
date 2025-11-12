import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet, { HelmetOptions } from 'helmet';
import { ApiKeyGuard } from './common/guards/api-key.guard';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // ✅ Global prefix and API versioning base
  app.setGlobalPrefix('api/v1');

  // ✅ Security headers with strict type
  const helmetOptions: HelmetOptions = {}; // customize if needed
  app.use(helmet(helmetOptions));

  // ✅ Typed and safe CORS setup
  const frontendOrigins: string[] = process.env.FRONTEND_URL?.split(',').map(
    (url) => url.trim(),
  ) ?? ['http://localhost:3000'];

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      process.env.API_KEY_HEADER ?? 'x-api-key',
    ],
    maxAge: 86400,
  });

  // ✅ Validation pipe with strict transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ✅ Global API key guard (reads config safely)
  app.useGlobalGuards(new ApiKeyGuard());

  // ✅ Type-safe port parsing
  const port = Number(process.env.PORT ?? 4000);

  await app.listen(port);
  console.log(`🚀 Server running at http://localhost:${port}/api/v1`);
}

bootstrap().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('❌ Bootstrap error:', error.message);
    console.error(error.stack);
  } else {
    console.error('❌ Unknown bootstrap error:', error);
  }
  process.exit(1);
});
