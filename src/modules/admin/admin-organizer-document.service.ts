import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizerDocument } from './entities/organizer-document.entity';

@Injectable()
export class AdminOrganizerDocumentService {
  private readonly logger = new Logger(AdminOrganizerDocumentService.name);

  constructor(
    @InjectRepository(OrganizerDocument)
    private readonly repo: Repository<OrganizerDocument>,
  ) {}

  async listDocuments(organizerId: string) {
    return this.repo.find({
      where: { organizerId },
      order: { createdAt: 'DESC' },
    });
  }

  async approve(docId: string, verifiedBy: string) {
    const doc = await this.repo.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Document not found');
    doc.status = 'verified';
    doc.verifiedBy = verifiedBy;
    doc.verifiedAt = new Date();
    await this.repo.save(doc);
    this.logger.log(`Approved document ${docId}`);
    return doc;
  }

  async reject(docId: string, reason: string) {
    const doc = await this.repo.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Document not found');
    doc.status = 'rejected';
    doc.rejectionReason = reason;
    await this.repo.save(doc);
    this.logger.log(`Rejected document ${docId}: ${reason}`);
    return doc;
  }

  async expiring(days: number) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return this.repo.find({
      where: {
        status: 'verified',
        expiresAt: threshold > new Date() ? undefined : undefined,
      },
    });
  }

  async getExpiring() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const in60 = new Date(now.getTime() + 60 * 86400000);
    const in90 = new Date(now.getTime() + 90 * 86400000);

    const all = await this.repo.find({
      where: { status: 'verified' },
      order: { expiresAt: 'ASC' },
    });

    return {
      within30Days: all.filter((d) => d.expiresAt && d.expiresAt <= in30),
      within60Days: all.filter(
        (d) => d.expiresAt && d.expiresAt > in30 && d.expiresAt <= in60,
      ),
      within90Days: all.filter(
        (d) => d.expiresAt && d.expiresAt > in60 && d.expiresAt <= in90,
      ),
    };
  }
}
