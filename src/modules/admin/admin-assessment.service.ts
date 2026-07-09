import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminAssessmentService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async list(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await this.dataSource.query(
      `SELECT
         fa.id, fa.user_id, fa.total_score, fa.difficulty_bracket, fa.completed_at,
         u.email, u.full_name
       FROM fitness_assessments fa
       JOIN users u ON u.id = fa.user_id
       ORDER BY fa.completed_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM fitness_assessments`,
    );
    return {
      data: rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        email: r.email,
        fullName: r.full_name,
        totalScore: r.total_score,
        difficultyBracket: r.difficulty_bracket,
        completedAt: r.completed_at,
      })),
      total: Number(countResult[0]?.total ?? 0),
      page,
      limit,
    };
  }

  async history(userId: string) {
    return this.dataSource.query(
      `SELECT id, total_score, difficulty_bracket, completed_at
       FROM fitness_assessments
       WHERE user_id = $1
       ORDER BY completed_at DESC`,
      [userId],
    );
  }

  async flagForReassessment(userId: string) {
    const user = await this.dataSource.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId],
    );
    if (user.length === 0) throw new NotFoundException('User not found');
    return { success: true, userId, message: 'User flagged for re-assessment (notification dispatch placeholder)' };
  }
}
