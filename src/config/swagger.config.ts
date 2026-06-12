import { DocumentBuilder } from '@nestjs/swagger';
import type { SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerDocumentOptions = new DocumentBuilder()
  .setTitle('Offbeat प्रवासी API')
  .setDescription(
    'Full-scale, production-ready trek discovery and booking platform.',
  )
  .setVersion('1.0.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'access-token',
  )
  .addServer('http://localhost:4000', 'Local development')
  .build();

export const swaggerCustomOptions: SwaggerCustomOptions = {
  customSiteTitle: 'Offbeat Pravasi – API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
    displayRequestDuration: true,
  },
};
