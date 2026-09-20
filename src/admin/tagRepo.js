import { validateTag } from './validate.js';

export async function listTags(pool, announcementId) {
  const res = await pool.query(
    `SELECT id, announcement_id, tag_key, tag_value, operator, created_at
     FROM announcement_tags WHERE announcement_id=$1
     ORDER BY created_at, id`,
    [announcementId]
  );
  return res.rows;
}

export async function addTag(pool, announcementId, input, operator) {
  const v = validateTag(input);
  if (v.error) return { error: v.error, status: 400 };
  const exists = await pool.query(`SELECT id FROM announcements WHERE id=$1`, [announcementId]);
  if (!exists.rowCount) return { error: '公告不存在', status: 404 };
  try {
    const res = await pool.query(
      `INSERT INTO announcement_tags (announcement_id, tag_key, tag_value, operator)
       VALUES ($1,$2,$3,$4)
       RETURNING id, announcement_id, tag_key, tag_value, operator, created_at`,
      [announcementId, v.tag.tag_key, v.tag.tag_value, operator || null]
    );
    return { row: res.rows[0] };
  } catch (e) {
    if (e.code === '23505') return { error: '标签已存在', status: 409 };
    throw e;
  }
}

export async function removeTag(pool, announcementId, tagId) {
  const res = await pool.query(
    `DELETE FROM announcement_tags WHERE id=$1 AND announcement_id=$2 RETURNING id`,
    [tagId, announcementId]
  );
  if (!res.rowCount) return { error: '标签不存在', status: 404 };
  return { ok: true };
}
