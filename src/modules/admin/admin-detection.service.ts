import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DuplicateCandidate } from './entities/duplicate-candidate.entity';

@Injectable()
export class AdminDetectionService {
  constructor(
    @InjectRepository(DuplicateCandidate)
    private readonly repo: Repository<DuplicateCandidate>,
    private readonly dataSource: DataSource,
  ) {}

  async trekDuplicates() {
    const rows = await this.dataSource.query(`
      SELECT
        a.id AS primary_id,
        a.name AS primary_name,
        b.id AS candidate_id,
        b.name AS candidate_name,
        similarity(a.name, b.name) AS name_similarity
      FROM treks a
      JOIN treks b ON a.id < b.id
        AND similarity(a.name, b.name) > 0.4
      ORDER BY name_similarity DESC
      LIMIT 100
    `);
    return rows.map((r: any) => ({
      primaryId: r.primary_id,
      primaryName: r.primary_name,
      candidateId: r.candidate_id,
      candidateName: r.candidate_name,
      similarityScore: Number(r.name_similarity).toFixed(4),
    }));
  }

  async userDuplicates() {
    const byEmail = await this.dataSource.query(`
      SELECT
        a.id AS primary_id,
        a.email AS primary_email,
        b.id AS candidate_id,
        b.email AS candidate_email,
        'same_email' AS match_type
      FROM users a
      JOIN users b ON a.id < b.id AND a.email = b.email
    `);

    const byPhone = await this.dataSource.query(`
      SELECT
        a.id AS primary_id,
        a.email AS primary_email,
        b.id AS candidate_id,
        b.email AS candidate_email,
        'same_phone' AS match_type
      FROM users a
      JOIN users b ON a.id < b.id AND a.phone = b.phone AND a.phone IS NOT NULL
    `);

    return [...byEmail, ...byPhone].map((r: any) => ({
      primaryId: r.primary_id,
      primaryEmail: r.primary_email,
      candidateId: r.candidate_id,
      candidateEmail: r.candidate_email,
      matchType: r.match_type,
    }));
  }

  async resolveTrekDuplicate(id: string) {
    const candidate = await this.repo.findOne({
      where: { id, entityType: 'trek' },
    });
    if (!candidate) {
      return this.repo.save(
        this.repo.create({
          id,
          entityType: 'trek',
          primaryId: id,
          candidateId: id,
          status: 'resolved',
        }),
      );
    }
    candidate.status = 'resolved';
    return this.repo.save(candidate);
  }
}
