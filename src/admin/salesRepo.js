import { parseSalesCsvDetailed, salesToCsv } from '../digest/csv.js';
import { validateSalesRow } from './validate.js';

export async function listSales(pool, { activeOnly = false } = {}) {
  const res = await pool.query(
    `SELECT id, sales_name, sales_email, region, region_code, note, is_active, updated_at
     FROM sales_regions
     ${activeOnly ? 'WHERE is_active = TRUE' : ''}
     ORDER BY sales_name, region, id`
  );
  return res.rows;
}

export async function createSales(pool, input) {
  const v = validateSalesRow(input);
  if (v.error) return { error: v.error, status: 400 };
  try {
    const res = await pool.query(
      `INSERT INTO sales_regions (sales_name, sales_email, region, region_code, note, is_active)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, sales_name, sales_email, region, region_code, note, is_active, updated_at`,
      [v.row.sales_name, v.row.sales_email, v.row.region, v.row.region_code, v.row.note, v.row.is_active]
    );
    return { row: res.rows[0] };
  } catch (e) {
    if (e.code === '23505') return { error: '该邮箱已负责该区域', status: 409 };
    throw e;
  }
}

export async function updateSales(pool, id, input) {
  const v = validateSalesRow(input);
  if (v.error) return { error: v.error, status: 400 };
  try {
    const res = await pool.query(
      `UPDATE sales_regions SET
         sales_name=$2, sales_email=$3, region=$4, region_code=$5, note=$6, is_active=$7
       WHERE id=$1
       RETURNING id, sales_name, sales_email, region, region_code, note, is_active, updated_at`,
      [id, v.row.sales_name, v.row.sales_email, v.row.region, v.row.region_code, v.row.note, v.row.is_active]
    );
    if (!res.rowCount) return { error: '记录不存在', status: 404 };
    return { row: res.rows[0] };
  } catch (e) {
    if (e.code === '23505') return { error: '该邮箱已负责该区域', status: 409 };
    throw e;
  }
}

export async function deleteSales(pool, id) {
  const res = await pool.query(`DELETE FROM sales_regions WHERE id=$1 RETURNING id`, [id]);
  if (!res.rowCount) return { error: '记录不存在', status: 404 };
  return { ok: true };
}

export async function importSalesCsv(pool, text) {
  const parsed = parseSalesCsvDetailed(text);
  const failed = [...(parsed.errors || [])];
  let success = 0;
  for (const raw of parsed.rows) {
    const v = validateSalesRow(raw);
    if (v.error) {
      failed.push({ line: raw.line, reason: v.error });
      continue;
    }
    await pool.query(
      `INSERT INTO sales_regions (sales_name, sales_email, region, region_code, note, is_active)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (sales_email, region) DO UPDATE SET
         sales_name = EXCLUDED.sales_name,
         region_code = COALESCE(EXCLUDED.region_code, sales_regions.region_code),
         note = EXCLUDED.note,
         is_active = EXCLUDED.is_active`,
      [v.row.sales_name, v.row.sales_email, v.row.region, v.row.region_code, v.row.note, v.row.is_active]
    );
    success += 1;
  }
  return { success, failed };
}

export async function exportSalesCsv(pool) {
  const rows = await listSales(pool);
  return salesToCsv(rows);
}
