import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';

@Injectable()
export class MailerTemplateService implements OnModuleInit {
  private readonly logger = new Logger(MailerTemplateService.name);
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly templatesDir: string;

  constructor() {
    this.templatesDir = join(__dirname, 'templates');
  }

  onModuleInit() {
    this.registerPartials();
    this.registerHelpers();
    this.logger.log('Mailer templates initialized');
  }

  private registerPartials() {
    const partialsDir = join(this.templatesDir, 'partials');
    const partials = ['header', 'footer', 'button'];

    for (const name of partials) {
      const path = join(partialsDir, `${name}.hbs`);
      if (existsSync(path)) {
        const content = readFileSync(path, 'utf-8');
        Handlebars.registerPartial(name, content);
      }
    }
  }

  private registerHelpers() {
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(amount);
    });

    Handlebars.registerHelper('formatDate', (date: string) => {
      return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
  }

  private loadTemplate(name: string): Handlebars.TemplateDelegate {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    const [category, template] = name.split('/');
    const path = join(this.templatesDir, category, `${template}.hbs`);

    if (!existsSync(path)) {
      throw new Error(`Template not found: ${name}`);
    }

    const content = readFileSync(path, 'utf-8');
    const compiled = Handlebars.compile(content);
    this.cache.set(name, compiled);
    return compiled;
  }

  render(templateName: string, context: Record<string, any>): string {
    const template = this.loadTemplate(templateName);
    const content = template({ year: new Date().getFullYear(), ...context });
    const layout = this.loadLayout();
    return layout({ body: content, year: new Date().getFullYear() });
  }

  private loadLayout(): Handlebars.TemplateDelegate {
    const key = '__layout__';
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const path = join(this.templatesDir, 'layouts', 'main.hbs');
    if (!existsSync(path)) {
      throw new Error('Layout template not found: layouts/main.hbs');
    }

    const content = readFileSync(path, 'utf-8');
    const compiled = Handlebars.compile(content);
    this.cache.set(key, compiled);
    return compiled;
  }
}
