import { getPool } from '../db/pool.js';
import {
  buildDistrictTypeQuery,
  buildSearchQuery,
  buildSummaryQuery,
  buildUnassignedQuery,
} from './sql.js';

async function run(builder, filters) {
  const { sql, params } = builder(filters);
  const res = await getPool().query(sql, params);
  return res.rows;
}

export function searchAnnouncements(filters) {
  return run(buildSearchQuery, filters);
}

export function dailySummary(filters) {
  return run(buildSummaryQuery, filters);
}

export function unassignedAnnouncements(filters) {
  return run(buildUnassignedQuery, filters);
}

export function districtTypeSummary() {
  return run(buildDistrictTypeQuery, {});
}
