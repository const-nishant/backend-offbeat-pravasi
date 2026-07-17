import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';

@Injectable()
export class AdminEmailTemplateService {
  private readonly logger = new Logger(AdminEmailTemplateService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly repo: Repository<EmailTemplate>,
  ) {}

  async list() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async get(id: string) {
    const tpl = await this.repo.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Email template not found');
    return tpl;
  }

  async create(data: {
    name: string;
    subject: string;
    bodyHtml: string;
    variables?: string[];
    isActive?: boolean;
  }) {
    const existing = await this.repo.findOne({ where: { name: data.name } });
    if (existing) throw new BadRequestException('Template name already exists');

    const tpl = this.repo.create({
      name: data.name,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      variables: data.variables ?? null,
      isActive: data.isActive ?? true,
      version: 1,
    });
    return this.repo.save(tpl);
  }

  async update(
    id: string,
    data: {
      subject?: string;
      bodyHtml?: string;
      variables?: string[];
      isActive?: boolean;
    },
  ) {
    const tpl = await this.repo.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Email template not found');

    const historyEntry: NonNullable<EmailTemplate['versionHistory']>[0] = {
      subject: tpl.subject,
      bodyHtml: tpl.bodyHtml,
      variables: tpl.variables ?? [],
      version: tpl.version,
      updatedAt: new Date().toISOString(),
    };

    if (data.subject !== undefined) tpl.subject = data.subject;
    if (data.bodyHtml !== undefined) tpl.bodyHtml = data.bodyHtml;
    if (data.variables !== undefined) tpl.variables = data.variables;
    if (data.isActive !== undefined) tpl.isActive = data.isActive;

    tpl.version += 1;
    tpl.versionHistory = [...(tpl.versionHistory ?? []), historyEntry];

    return this.repo.save(tpl);
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Email template not found');
    this.logger.log(`Deleted email template: ${id}`);
    return { success: true };
  }

  async preview(id: string) {
    const tpl = await this.repo.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Email template not found');

    return {
      subject: tpl.subject,
      bodyHtml: tpl.bodyHtml,
    };
  }

  async getVersions(id: string) {
    const tpl = await this.repo.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Email template not found');

    const current = {
      subject: tpl.subject,
      bodyHtml: tpl.bodyHtml,
      variables: tpl.variables,
      version: tpl.version,
      updatedAt: tpl.updatedAt.toISOString(),
      isCurrent: true,
    };

    const history = (tpl.versionHistory ?? []).map((v) => ({
      ...v,
      isCurrent: false,
    }));

    return [...history, current];
  }
}
