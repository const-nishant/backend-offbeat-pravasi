import { Module, Global } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerTemplateService } from './mailer-template.service';

@Global()
@Module({
  providers: [MailerService, MailerTemplateService],
  exports: [MailerService, MailerTemplateService],
})
export class MailerModule {}
