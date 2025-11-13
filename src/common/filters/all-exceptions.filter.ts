import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationErrorPayload {
  [field: string]: string;
}

interface HttpExceptionResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: ValidationErrorPayload | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const responseObj = exception.getResponse();

      if (typeof responseObj === 'string') {
        message = responseObj;
      } else {
        const typed = responseObj as HttpExceptionResponse;

        if (Array.isArray(typed.message)) {
          details = this.formatValidationMessages(typed.message);
          message = 'Validation failed';
        } else if (typeof typed.message === 'string') {
          message = typed.message;
        }
      }
    }

    this.logger.error({
      message,
      status,
      path: request.url,
      method: request.method,
    });

    const payload = {
      success: false as const,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details ? { details } : {}),
    };

    response.status(status).json(payload);
  }

  private formatValidationMessages(messages: string[]): ValidationErrorPayload {
    const result: ValidationErrorPayload = {};

    messages.forEach((msg, index) => {
      result[`error_${index + 1}`] = msg;
    });

    return result;
  }
}
