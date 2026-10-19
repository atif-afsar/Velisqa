import { C, getDb } from '../config/db.js'
import { uuid } from '../lib/crypto.js'
import { logger } from '../lib/logger.js'

/** Append-only admin/security trail. Never throws into the caller's flow. */
export async function audit({ actorId, action, targetType, targetId, summary, req, session }) {
  try {
    await getDb().collection(C.adminAuditLogs).insertOne(
      {
        _id: uuid(),
        actor_id: actorId || null,
        action,
        target_type: targetType || null,
        target_id: targetId || null,
        summary: summary || null,
        request_id: req?.id || null,
        ip: req?.ip || null,
        created_at: new Date(),
      },
      session ? { session } : undefined,
    )
  } catch (error) {
    logger.error('Audit log write failed', { action, error })
  }
}

/** Order timeline entry (mirrors public.order_status_history). */
export async function recordOrderHistory({ orderId, oldStatus, newStatus, source, reason, changedBy, metadata }, session) {
  await getDb().collection(C.orderStatusHistory).insertOne(
    {
      _id: uuid(),
      order_id: orderId,
      old_status: oldStatus ?? null,
      new_status: newStatus,
      changed_by: changedBy || null,
      source,
      reason: reason || null,
      metadata: metadata || null,
      created_at: new Date(),
    },
    session ? { session } : undefined,
  )
}
