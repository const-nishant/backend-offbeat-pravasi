import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const swaggerConfig = new DocumentBuilder()
  .setTitle('Offbeat प्रवासी API')
  .setDescription(
    'Full-scale, production-ready trek discovery and booking platform.',
  )
  .setVersion('1.0.0')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    'access-token',
  )
  .addServer('http://localhost:4000', 'Local development')
  .build();

async function bootstrap() {
  const { AppModule } = await import('../src/app.module.js');
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const docsPath = join(process.cwd(), 'docs');
  mkdirSync(docsPath, { recursive: true });
  writeFileSync(
    join(docsPath, 'swagger.json'),
    JSON.stringify(document, null, 2),
    'utf8',
  );
  console.log(
    `Generated swagger.json (${Object.keys(document.paths ?? {}).length} paths)`,
  );
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
