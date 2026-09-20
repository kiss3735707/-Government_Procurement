import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession } from '../src/admin/auth.js';
import { validateSalesRow, validateTag } from '../src/admin/validate.js';
import { parseSalesCsvDetailed, salesToCsv } from '../src/digest/csv.js';

describe('admin session', () => {
  it('accepts a fresh token and rejects a tampered one', () => {
    const token = signSession('admin', 'secret', 1_000_000);
    assert.equal(verifySession(token, 'secret', 1_000_000), 'admin');
    assert.equal(verifySession(token.slice(0, -1) + 'x', 'secret', 1_000_000), null);
    assert.equal(verifySession(token, 'secret', 1_000_000 + 9 * 3600 * 1000), null);
  });
});

describe('validateSalesRow', () => {
  it('rejects invalid email and unknown district', () => {
    assert.equal(validateSalesRow({ sales_name: '张三', sales_email: 'bad', region: '浦东新区' }).error, '邮箱格式无效');
    assert.equal(validateSalesRow({ sales_name: '张三', sales_email: 'a@b.com', region: '火星区' }).error, '区域须为标准区名（16区+本级）或全市');
    assert.equal(validateSalesRow({ sales_name: '张三', sales_email: 'A@B.com', region: '上海市浦东新区' }).row.region, '浦东新区');
    assert.equal(validateSalesRow({ sales_name: '张三', sales_email: 'a@b.com', region: '全市' }).row.region, '全市');
  });
});

describe('validateTag', () => {
  it('only allows known keys and 高中低 priority', () => {
    assert.ok(validateTag({ tag_key: 'nope', tag_value: 'x' }).error);
    assert.equal(validateTag({ tag_key: 'priority', tag_value: '紧急' }).error, '优先级须为 高/中/低');
    assert.equal(validateTag({ tag_key: 'product_line', tag_value: '实验室设备' }).tag.tag_value, '实验室设备');
  });
});

describe('sales csv report', () => {
  it('keeps valid rows and reports empty email', () => {
    const { rows, errors } = parseSalesCsvDetailed(
      'sales_name,sales_email,region\n赵,a@qq.com,嘉定区\n李,,长宁区\n'
    );
    assert.equal(rows.length, 1);
    assert.equal(errors[0].reason, '邮箱或区域为空');
  });

  it('exports required headers', () => {
    const csv = salesToCsv([{ sales_name: '张三', sales_email: 'a@b.com', region: '浦东新区', region_code: '310115', is_active: true }]);
    assert.match(csv, /^sales_name,sales_email,region/);
  });
});
