import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminAuditDiffService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async diff(resourceType: string, resourceId: string) {
    const rows = await this.dataSource.query(
      `SELECT id, actor_id, action, metadata, created_at
       FROM audit_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at ASC`,
      [resourceType, resourceId],
    );

    if (rows.length === 0) throw new NotFoundException('No audit logs found for this resource');

    const entries = rows.map((r: any) => ({
      id: r.id,
      actorId: r.actor_id,
      action: r.action,
      detail: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      createdAt: r.created_at,
    }));

    const diffs: Array<{ fromId: string; toId: string; from: Date; to: Date; change: Record<string, unknown> }> = [];
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const curr = entries[i];
      diffs.push({
        fromId: prev.id,
        toId: curr.id,
        from: prev.createdAt,
        to: curr.createdAt,
        change: this.computeDiff(prev.detail, curr.detail),
      });
    }

    return {
      resourceType,
      resourceId,
      totalEntries: entries.length,
      entries,
      diffs,
    };
  }

  async timeline(filters: { actorId?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const conditions = ['1=1'];
    const params: any[] = [];
    let idx = 1;

    if (filters.actorId) {
      conditions.push(`actor_id = $${idx++}`);
      params.push(filters.actorId);
    }
    if (filters.action) {
      conditions.push(`action = $${idx++}`);
      params.push(filters.action);
    }
    if (filters.from) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(filters.to);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;

    const rows = await this.dataSource.query(
      `SELECT id, actor_id, action, entity_type, entity_id, metadata, created_at
       FROM audit_logs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    const totalResult = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM audit_logs WHERE ${conditions.join(' AND ')}`,
      params,
    );

    const grouped = this.groupIntoSessions(rows);

    return {
      data: grouped,
      total: Number(totalResult[0]?.total ?? 0),
      page,
      limit,
      sessionCount: grouped.length,
    };
  }

  private computeDiff(prev: Record<string, unknown> | null, curr: Record<string, unknown> | null): Record<string, unknown> {
    if (!prev && !curr) return {};
    if (!prev) return { added: curr };
    if (!curr) return { removed: prev };

    const added: Record<string, unknown> = {};
    const removed: Record<string, unknown> = {};
    const changed: Record<string, { from: unknown; to: unknown }> = {};

    for (const key of Object.keys(curr)) {
      if (!(key in prev)) {
        added[key] = curr[key];
      } else if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
        changed[key] = { from: prev[key], to: curr[key] };
      }
    }
    for (const key of Object.keys(prev)) {
      if (!(key in curr)) {
        removed[key] = prev[key];
      }
    }

    return { added, removed, changed };
  }

  private groupIntoSessions(rows: any[]) {
    if (rows.length === 0) return [];

    const sessions: any[] = [];
    let current: any = {
      actorId: rows[0].actor_id,
      startTime: rows[0].created_at,
      endTime: rows[0].created_at,
      actionCount: 1,
      actions: [rows[0]],
    };

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const timeDiff = new Date(r.created_at).getTime() - new Date(current.endTime).getTime();
      if (r.actor_id === current.actorId && timeDiff < 180000) {
        current.endTime = r.created_at;
        current.actionCount++;
        current.actions.push(r);
      } else {
        sessions.push(current);
        current = {
          actorId: r.actor_id,
          startTime: r.created_at,
          endTime: r.created_at,
          actionCount: 1,
          actions: [r],
        };
      }
    }
    sessions.push(current);

    return sessions.map((s) => ({
      actorId: s.actorId,
      startTime: s.startTime,
      endTime: s.endTime,
      actionCount: s.actionCount,
      durationSeconds: Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000),
    }));
  }
}
