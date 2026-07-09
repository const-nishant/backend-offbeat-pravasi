import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminTasksTable0048 implements MigrationInterface {
  name = 'CreateAdminTasksTable0048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    `);

    await queryRunner.query(`
      CREATE TYPE task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        type varchar(64) NOT NULL,
        resource_type varchar(64),
        resource_id uuid,
        assigned_to uuid,
        status task_status NOT NULL DEFAULT 'OPEN',
        priority task_priority NOT NULL DEFAULT 'MEDIUM',
        due_by timestamptz,
        resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned
        ON admin_tasks (assigned_to)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_tasks_status
        ON admin_tasks (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_tasks_type
        ON admin_tasks (type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS admin_tasks`);
    await queryRunner.query(`DROP TYPE IF EXISTS task_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS task_priority`);
  }
}
