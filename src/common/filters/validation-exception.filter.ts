import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationErrorResponse {
  statusCode: number;
  message: string[]; // class-validator returns array of messages
  error: string;
}

interface FormattedValidationDetails {
  [field: string]: string;
}

@Catch(BadRequestException)
export class ValidationExceptionFilter
  implements ExceptionFilter<BadRequestException>
{
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const exceptionResponse =
      exception.getResponse() as ValidationErrorResponse;

    const messages = Array.isArray(exceptionResponse.message)
      ? exceptionResponse.message
      : [exceptionResponse.message];

    const details = this.formatMessages(messages);

    response.status(400).json({
      success: false as const,
      statusCode: 400,
      message: 'Validation failed',
      timestamp: new Date().toISOString(),
      path: request.url,
      details,
    });
  }

  private formatMessages(messages: string[]): FormattedValidationDetails {
    const result: FormattedValidationDetails = {};

    messages.forEach((msg, index) => {
      // Try to extract field names from messages like:
      // "email must be an email"
      const parts = msg.split(' ');
      const possibleField = parts[0];

      if (possibleField && /^[a-zA-Z0-9_]+$/.test(possibleField)) {
        result[possibleField] = msg.replace(`${possibleField} `, '');
      } else {
        result[`error_${index + 1}`] = msg;
      }
    });

    return result;
  }
}
