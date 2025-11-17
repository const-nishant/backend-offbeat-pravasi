import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { swaggerDocumentOptions } from './config/swagger.config';

async function generateSwaggerDocs(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(app, swaggerDocumentOptions);

  const docsPath = join(process.cwd(), 'docs');
  await mkdir(docsPath, { recursive: true });
  await writeFile(
    join(docsPath, 'swagger.json'),
    JSON.stringify(document, null, 2),
    {
      encoding: 'utf8',
      flag: 'w',
    },
  );

  await app.close();
}

generateSwaggerDocs().catch((error) => {
  console.error('Failed to generate Swagger document:', error);
  process.exit(1);
});
