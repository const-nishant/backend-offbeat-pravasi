import { DataSource, Repository, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, ManyToMany, OneToMany, JoinTable, Index } from 'typeorm';
import { TreksService } from './treks.service';
import { RedisService } from '../../common/utils/redis.service';
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

// SQLite-compatible entities
@Entity({ name: 'users' })
class SqliteUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 120 }) email!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) passwordHash!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) fullName!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) username!: string | null;
  @Column({ type: 'varchar', nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', nullable: true }) location!: string | null;
  @Column({ type: 'varchar', nullable: true }) gender!: string | null;
  @Column({ type: 'date', nullable: true }) dateOfBirth!: Date | null;
  @Column({ type: 'varchar', nullable: true }) profileImageUrl!: string | null;
  @Column({ type: 'varchar', nullable: true }) bannerImageUrl!: string | null;
  @Column({ type: 'boolean', default: false }) isAdmin!: boolean;
  @Column({ type: 'varchar', default: 'NONE' }) organizerStatus!: string;
  @Column({ type: 'boolean', default: false }) emailVerified!: boolean;
  @Column({ type: 'datetime', nullable: true }) emailVerifiedAt!: Date | null;
  @Column({ type: 'float', default: 0 }) userPoints!: number;
  @Column({ type: 'int', default: 0 }) userDistanceTravelled!: number;
  @Column({ type: 'float', default: 0 }) organizerRating!: number;
  @Column({ type: 'boolean', default: false }) isOrganizerActive!: boolean;
  @Column({ type: 'boolean', default: false }) isSuspended!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'treks' })
@Index(['state'])
class SqliteTrek {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteUser, { nullable: true }) organizer!: SqliteUser | null;
  @Column({ type: 'varchar', length: 255 }) name!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) slug!: string | null;
  @Column({ type: 'varchar', length: 512, nullable: true }) shortDescription!: string | null;
  @Column({ type: 'text', nullable: true }) fullDescription!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) state!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) location!: string | null;
  @Column({ type: 'float', nullable: true }) latitude!: number | null;
  @Column({ type: 'float', nullable: true }) longitude!: number | null;
  @Column({ type: 'datetime', nullable: true }) startDate!: Date | null;
  @Column({ type: 'datetime', nullable: true }) endDate!: Date | null;
  @Column({ type: 'varchar', nullable: true }) difficulty!: string | null;
  @Column({ type: 'int', default: 0 }) costInr!: number;
  @Column({ type: 'int', default: 1 }) maxParticipants!: number;
  @Column({ type: 'boolean', default: false }) isPublished!: boolean;
  @Column({ type: 'int', default: 0 }) currentParticipants!: number;
  @Column({ type: 'varchar', length: 32, default: 'DRAFT' }) status!: string;
  @Column({ type: 'float', default: 0 }) avgRating!: number;
  @Column({ type: 'int', default: 0 }) ratingCount!: number;
  @Column({ type: 'int', default: 0 }) popularityScore!: number;
  @ManyToMany(() => SqliteTrekTag, (tag: any) => tag.treks) @JoinTable({ name: 'trek_tags_link' }) tags!: SqliteTrekTag[];
  @OneToMany(() => SqliteTrekImage, (img: any) => img.trek) images!: SqliteTrekImage[];
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
  @DeleteDateColumn({ type: 'datetime', nullable: true }) deletedAt!: Date | null;
}

@Entity({ name: 'trek_images' })
class SqliteTrekImage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteTrek, (t: any) => t.images, { onDelete: 'CASCADE' }) trek!: SqliteTrek;
  @Column({ type: 'varchar', length: 512 }) key!: string;
  @Column({ type: 'varchar', length: 1024, nullable: true }) url!: string | null;
  @Column({ type: 'boolean', default: false }) isPrimary!: boolean;
  @Column({ type: 'int', default: 0 }) order!: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) altText!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'trek_tags' })
class SqliteTrekTag {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 120, unique: true }) name!: string;
  @Column({ type: 'int', default: 0 }) usageCount!: number;
  @ManyToMany(() => SqliteTrek, (t: any) => t.tags) treks!: SqliteTrek[];
}

@Entity({ name: 'trek_reviews' })
class SqliteTrekReview {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteTrek, { onDelete: 'CASCADE' }) trek!: SqliteTrek;
  @ManyToOne(() => SqliteUser) user!: SqliteUser;
  @Column({ type: 'int' }) rating!: number;
  @Column({ type: 'text', nullable: true }) comment!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'trek_interactions' })
class SqliteTrekInteraction {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteTrek, { nullable: false, onDelete: 'CASCADE' }) trek!: SqliteTrek;
  @ManyToOne(() => SqliteUser) user!: SqliteUser;
  @Column({ type: 'varchar' }) type!: string;
  @Column({ type: 'int', default: 1 }) weight!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

describe('TreksService Integration (sqlite)', () => {
  let dataSource: DataSource;
  let service: TreksService;
  let trekRepo: Repository<SqliteTrek>;
  let userRepo: Repository<SqliteUser>;
  let tagRepo: Repository<SqliteTrekTag>;
  let imageRepo: Repository<SqliteTrekImage>;
  let redisService: jest.Mocked<RedisService>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [SqliteUser, SqliteTrek, SqliteTrekImage, SqliteTrekTag, SqliteTrekReview, SqliteTrekInteraction],
    });
    await dataSource.initialize();

    trekRepo = dataSource.getRepository(SqliteTrek);
    userRepo = dataSource.getRepository(SqliteUser);
    tagRepo = dataSource.getRepository(SqliteTrekTag);
    imageRepo = dataSource.getRepository(SqliteTrekImage);

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    jest.clearAllMocks();

    service = new TreksService(
      trekRepo as any,
      userRepo as any,
      dataSource.getRepository(SqliteTrekReview) as any,
      dataSource.getRepository(SqliteTrekInteraction) as any,
      tagRepo as any,
      imageRepo as any,
      redisService as any,
    );
  });

  describe('createTrek', () => {
    it('should create a trek with tags and images for approved organizer', async () => {
      const organizer = userRepo.create({
        email: 'org@test.com',
        passwordHash: 'hash',
        organizerStatus: 'APPROVED',
        isOrganizerActive: true,
      });
      await userRepo.save(organizer);

      const payload = {
        name: 'Integration Trek',
        costInr: 1500,
        maxParticipants: 20,
        tags: ['adventure', 'hiking'],
        imageKeys: ['img1.jpg', 'img2.jpg'],
      };

      const result = await service.createTrek(payload, organizer.id);

      expect(result).toBeDefined();
      expect(result.name).toBe('Integration Trek');
      expect(result.id).toBeDefined();

      // Verify tags were created
      const tags = await tagRepo.find();
      expect(tags.length).toBe(2);

      // Verify images were created
      const images = await imageRepo.find();
      expect(images.length).toBe(2);
    });

    it('should reject trek creation for non-approved user', async () => {
      const regularUser = userRepo.create({
        email: 'regular@test.com',
        passwordHash: 'hash',
        organizerStatus: 'NONE',
        isOrganizerActive: false,
      });
      await userRepo.save(regularUser);

      const payload = { name: 'Unauthorized Trek' };

      await expect(service.createTrek(payload, regularUser.id)).rejects.toThrow(
        'User is not an active organizer',
      );
    });

    it('should allow admin to create trek without organizer status', async () => {
      const admin = userRepo.create({
        email: 'admin@test.com',
        passwordHash: 'hash',
        isAdmin: true,
        organizerStatus: 'NONE',
        isOrganizerActive: false,
      });
      await userRepo.save(admin);

      const payload = { name: 'Admin Trek', imageKeys: [] };

      const result = await service.createTrek(payload, admin.id);
      expect(result).toBeDefined();
      expect(result.name).toBe('Admin Trek');
    });
  });

  describe('findOne', () => {
    it('should find a trek by id with images and tags', async () => {
      const organizer = userRepo.create({
        email: 'org2@test.com',
        passwordHash: 'hash',
        organizerStatus: 'APPROVED',
        isOrganizerActive: true,
      });
      await userRepo.save(organizer);

      const trek = trekRepo.create({
        name: 'Findable Trek',
        organizer,
        isPublished: true,
        costInr: 500,
      } as any);
      await trekRepo.save(trek);

      const found = await service.findOne(trek.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Findable Trek');
    });

    it('should return null for non-existent id', async () => {
      const found = await service.findOne('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('search', () => {
    it('should return paginated search results', async () => {
      const organizer = userRepo.create({
        email: 'org3@test.com',
        passwordHash: 'hash',
        organizerStatus: 'APPROVED',
        isOrganizerActive: true,
      });
      await userRepo.save(organizer);

      // Create treks
      for (let i = 0; i < 5; i++) {
        const trek = trekRepo.create({
          name: `Trek ${i + 1}`,
          organizer,
          isPublished: true,
          costInr: 1000 + i * 100,
        } as any);
        await trekRepo.save(trek);
      }

      const result = await service.search({ page: 1, limit: 3 });
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.meta.total).toBe(5);
      expect(result.meta.totalPages).toBe(2);
    });
  });
});
