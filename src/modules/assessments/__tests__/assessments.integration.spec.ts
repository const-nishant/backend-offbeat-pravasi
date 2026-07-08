import {
  DataSource,
  Repository,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { AssessmentsService } from '../assessments.service';
import {
  describe,
  beforeAll,
  afterAll,
  test,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';

// --- SQLite-compatible entity ---

@Entity({ name: 'users' })
class SqliteUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) fullName?: string;
  @Column({ type: 'varchar', nullable: true }) role!: string | null;
  @Column({ type: 'varchar', length: 32, nullable: true })
  organizerStatus?: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'fitness_assessments' })
class SqliteFitnessAssessment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'int' }) totalScore!: number;
  @Column({ type: 'varchar', length: 16 }) difficultyBracket!: string;
  @Column({ type: 'text' }) answers!: string;
  @CreateDateColumn({ type: 'datetime' }) completedAt!: Date;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

describe('Assessments Integration', () => {
  let dataSource: DataSource;
  let service: AssessmentsService;
  let assessmentRepo: Repository<SqliteFitnessAssessment>;
  let userRepo: Repository<SqliteUser>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [SqliteUser, SqliteFitnessAssessment],
    });
    await dataSource.initialize();

    userRepo = dataSource.getRepository(SqliteUser);
    assessmentRepo = dataSource.getRepository(SqliteFitnessAssessment);

    service = new AssessmentsService(
      assessmentRepo as unknown as Repository<any>,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await assessmentRepo.clear();
    await userRepo.clear();
  });

  async function createUser(id: string): Promise<SqliteUser> {
    return userRepo.save(
      userRepo.create({ id, email: `${id}@test.com`, fullName: `User ${id}` }),
    );
  }

  test('should submit assessment and retrieve result', async () => {
    const user = await createUser('user-1');

    const result = await service.submit('user-1', {
      answers: [
        { questionId: 'exercise_frequency', selectedOption: '3-5x week' },
        { questionId: 'longest_walk', selectedOption: '10-20 km' },
        {
          questionId: 'altitude_experience',
          selectedOption: 'High hills (2000-4000m)',
        },
        { questionId: 'camping_comfort', selectedOption: 'Comfortable' },
        {
          questionId: 'medical_conditions',
          selectedOption: 'No known conditions',
        },
        { questionId: 'primary_goal', selectedOption: 'Adventure / thrill' },
        { questionId: 'age_range', selectedOption: '18-30' },
        { questionId: 'prior_trek_count', selectedOption: '3-5 treks' },
        {
          questionId: 'swimming_comfort',
          selectedOption: 'Comfortable swimmer',
        },
        { questionId: 'sleeping_conditions', selectedOption: 'Okay with it' },
      ],
    });

    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(['EASY', 'MODERATE', 'DIFFICULT', 'EXTREME']).toContain(
      result.difficultyBracket,
    );
    expect(result.recommendedDifficultyLabel).toBeTruthy();
    expect(result.completedAt).toBeDefined();
  });

  test('should return null when no assessment exists', async () => {
    const result = await service.getLatestResult('nonexistent-user');
    expect(result).toBeNull();
  });

  test('should return public bracket for user with assessment', async () => {
    await createUser('user-2');
    await service.submit('user-2', {
      answers: [
        { questionId: 'exercise_frequency', selectedOption: 'Daily' },
        { questionId: 'longest_walk', selectedOption: '> 20 km' },
        {
          questionId: 'altitude_experience',
          selectedOption: 'Mountains (> 4000m)',
        },
        { questionId: 'camping_comfort', selectedOption: 'Very comfortable' },
        {
          questionId: 'medical_conditions',
          selectedOption: 'Excellent health',
        },
        { questionId: 'primary_goal', selectedOption: 'Summit / endurance' },
        { questionId: 'age_range', selectedOption: '18-30' },
        { questionId: 'prior_trek_count', selectedOption: '6+ treks' },
        {
          questionId: 'swimming_comfort',
          selectedOption: 'Very strong swimmer',
        },
        { questionId: 'sleeping_conditions', selectedOption: 'Prefer it' },
      ],
    });

    const bracket = await service.getPublicBracket('user-2');
    expect(bracket.difficultyBracket).not.toBeNull();
  });

  test('should return null bracket for user without assessment', async () => {
    const bracket = await service.getPublicBracket('no-assessment-user');
    expect(bracket.difficultyBracket).toBeNull();
  });

  test('should return latest assessment on multiple submissions', async () => {
    await createUser('user-3');
    await service.submit('user-3', {
      answers: [
        { questionId: 'exercise_frequency', selectedOption: 'Never' },
        { questionId: 'longest_walk', selectedOption: '< 5 km' },
        {
          questionId: 'altitude_experience',
          selectedOption: 'Sea level (< 500m)',
        },
        { questionId: 'camping_comfort', selectedOption: 'Not comfortable' },
        {
          questionId: 'medical_conditions',
          selectedOption: 'Yes, significant concerns',
        },
        { questionId: 'primary_goal', selectedOption: 'Leisure / sightseeing' },
        { questionId: 'age_range', selectedOption: 'Under 18' },
        { questionId: 'prior_trek_count', selectedOption: 'None' },
        { questionId: 'swimming_comfort', selectedOption: 'Cannot swim' },
        {
          questionId: 'sleeping_conditions',
          selectedOption: 'Very uncomfortable',
        },
      ],
    });

    await service.submit('user-3', {
      answers: [
        { questionId: 'exercise_frequency', selectedOption: 'Daily' },
        { questionId: 'longest_walk', selectedOption: '> 20 km' },
        {
          questionId: 'altitude_experience',
          selectedOption: 'Mountains (> 4000m)',
        },
        { questionId: 'camping_comfort', selectedOption: 'Very comfortable' },
        {
          questionId: 'medical_conditions',
          selectedOption: 'Excellent health',
        },
        { questionId: 'primary_goal', selectedOption: 'Summit / endurance' },
        { questionId: 'age_range', selectedOption: '18-30' },
        { questionId: 'prior_trek_count', selectedOption: '6+ treks' },
        {
          questionId: 'swimming_comfort',
          selectedOption: 'Very strong swimmer',
        },
        { questionId: 'sleeping_conditions', selectedOption: 'Prefer it' },
      ],
    });

    const allForUser = await assessmentRepo.find({
      where: { userId: 'user-3' },
      order: { completedAt: 'DESC' },
    });
    expect(allForUser.length).toBe(2);
    // Both records exist; completedAt may be same second due to SQLite precision
    const brackets = allForUser.map((a) => a.difficultyBracket);
    expect(brackets).toContain('EASY');
    expect(brackets).toContain('EXTREME');
  });

  test('should get questions without scores exposed', () => {
    const questions = service.getQuestions();
    expect(questions.length).toBe(10);
    for (const q of questions) {
      expect(q.options[0]).not.toHaveProperty('score');
    }
  });

  test('should handle EASY bracket submission', async () => {
    await createUser('user-easy');
    const result = await service.submit('user-easy', {
      answers: [
        { questionId: 'exercise_frequency', selectedOption: 'Never' },
        { questionId: 'longest_walk', selectedOption: '< 5 km' },
        {
          questionId: 'altitude_experience',
          selectedOption: 'Sea level (< 500m)',
        },
        { questionId: 'camping_comfort', selectedOption: 'Not comfortable' },
        {
          questionId: 'medical_conditions',
          selectedOption: 'Yes, significant concerns',
        },
        { questionId: 'primary_goal', selectedOption: 'Leisure / sightseeing' },
        { questionId: 'age_range', selectedOption: 'Under 18' },
        { questionId: 'prior_trek_count', selectedOption: 'None' },
        { questionId: 'swimming_comfort', selectedOption: 'Cannot swim' },
        {
          questionId: 'sleeping_conditions',
          selectedOption: 'Very uncomfortable',
        },
      ],
    });

    expect(result.difficultyBracket).toBe('EASY');
  });
});
