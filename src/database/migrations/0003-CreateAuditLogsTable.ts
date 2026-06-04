import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs0003 implements MigrationInterface {
  name = 'CreateAuditLogs0003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id uuid,
        actor_email varchar(120),
        actor_role varchar(64),
        action varchar(128) NOT NULL,
        resource_type varchar(64),
        resource_id uuid,
        detail jsonb,
        ip varchar(45),
        user_agent text,
        created_at timestamptz DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs (resource_type, resource_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs (created_at);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_resource;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_action;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_actor;`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs;`);
  }
}
