import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminGroupService {
  private readonly logger = new Logger(AdminGroupService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await this.dataSource.query(
      `SELECT
         tg.id, tg.name, tg.moderation_status, tg.ban_reason, tg.created_at,
         tg.lead_user_id,
         COUNT(gm.id) AS member_count,
         (SELECT COUNT(*) FROM group_members WHERE group_id = tg.id AND status = 'reported') AS report_count
       FROM trek_groups tg
       LEFT JOIN group_members gm ON gm.group_id = tg.id AND gm.status = 'active'
       GROUP BY tg.id, tg.name, tg.moderation_status, tg.ban_reason, tg.created_at, tg.lead_user_id
       ORDER BY report_count DESC, tg.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM trek_groups`,
    );
    return {
      data: rows,
      total: Number(countResult[0]?.total ?? 0),
      page,
      limit,
    };
  }

  async updateStatus(id: string, status: string) {
    const result = await this.dataSource.query(
      `UPDATE trek_groups SET moderation_status = $1 WHERE id = $2 RETURNING id`,
      [status, id],
    );
    if (result.length === 0) throw new NotFoundException('Group not found');
    this.logger.log(`Group ${id} moderation_status → ${status}`);
    return { success: true, id, status };
  }

  async listMembers(groupId: string) {
    return this.dataSource.query(
      `SELECT id, user_id, email, full_name, status, joined_at
       FROM group_members
       WHERE group_id = $1
       ORDER BY joined_at DESC`,
      [groupId],
    );
  }

  async removeMember(groupId: string, memberId: string) {
    const result = await this.dataSource.query(
      `DELETE FROM group_members WHERE id = $1 AND group_id = $2 RETURNING id`,
      [memberId, groupId],
    );
    if (result.length === 0) throw new NotFoundException('Member not found');
    this.logger.log(`Removed member ${memberId} from group ${groupId}`);
    return { success: true };
  }

  async transferOwnership(groupId: string, newOwnerUserId: string) {
    const group = await this.dataSource.query(
      `SELECT id FROM trek_groups WHERE id = $1`,
      [groupId],
    );
    if (group.length === 0) throw new NotFoundException('Group not found');
    await this.dataSource.query(
      `UPDATE trek_groups SET lead_user_id = $1 WHERE id = $2`,
      [newOwnerUserId, groupId],
    );
    this.logger.log(
      `Transferred group ${groupId} ownership to user ${newOwnerUserId}`,
    );
    return { success: true, groupId, newOwnerUserId };
  }
}
