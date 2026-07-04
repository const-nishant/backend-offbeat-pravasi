import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  swaggerCustomOptions,
  swaggerDocumentOptions,
} from './config/swagger.config';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import cookieParser from 'cookie-parser';

function serveDocsYaml(app: INestApplication): void {
  const yamlPath = join(process.cwd(), 'docs', 'openapi.yaml');
  if (!existsSync(yamlPath)) return;
  const yaml = readFileSync(yamlPath, 'utf8');
  app.getHttpAdapter().get('/docs/openapi.yaml', (_req, res) => {
    res.type('text/yaml').send(yaml);
  });
}

async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    maxAge: 86400,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const document = SwaggerModule.createDocument(app, swaggerDocumentOptions);
  SwaggerModule.setup('docs', app, document, swaggerCustomOptions);

  serveDocsYaml(app);

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);

  return app;
}

async function shutdown(signal: string, app: INestApplication): Promise<void> {
  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await app.close();
    console.log('Application closed successfully');
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
}

bootstrap()
  .then((app) => {
    process.on('SIGTERM', () => shutdown('SIGTERM', app));
    process.on('SIGINT', () => shutdown('SIGINT', app));
  })
  .catch((error) => {
    console.error('Failed to bootstrap application', error);
    process.exit(1);
  });
