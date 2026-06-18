import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  swaggerCustomOptions,
  swaggerDocumentOptions,
} from './config/swagger.config';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

function serveDocsYaml(app: INestApplication): void {
  const yamlPath = join(process.cwd(), 'docs', 'openapi.yaml');
  if (!existsSync(yamlPath)) return;
  const yaml = readFileSync(yamlPath, 'utf8');
  app.getHttpAdapter().get('/docs/openapi.yaml', (_req, res) => {
    res.type('text/yaml').send(yaml);
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    maxAge: 86400,
  });

  app.setGlobalPrefix('api/v1');

  const document = SwaggerModule.createDocument(app, swaggerDocumentOptions);
  SwaggerModule.setup('docs', app, document, swaggerCustomOptions);

  serveDocsYaml(app);

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application', error);
  process.exit(1);
});
