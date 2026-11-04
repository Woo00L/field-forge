import test from 'node:test';
import assert from 'node:assert/strict';
import { convertLine, convertBatch, formatCopy, toCsv } from '../src/converter.js';

test('按用户示例保留年字首字母，并将年份移到末尾', () => {
  assert.equal(convertLine('2023年营业收入 （万元）').field, 'nyysr2023');
  assert.equal(convertLine('2024年度可加计扣除研发费用（万元）').field, 'ndkjjkcyffy2024');
});

test('相对年份严格匹配用户的两条示例，中文保留单位', () => {
  const options = { relative: true, baseYear: 2025 };
  const first = convertLine('2023年营业收入 （万元）', options);
  assert.equal(first.label, '上上年营业收入（万元）');
  assert.equal(first.field, 'ssnyysr');
  const second = convertLine('2024年度可加计扣除研发费用（万元）', options);
  assert.equal(second.label, '上年度可加计扣除研发费用（万元）');
  assert.equal(second.field, 'sndkjjkcyffy');
});

test('去除中英文括号、嵌套括号及括号内年份', () => {
  assert.equal(convertLine('营业收入（单位：万元(含税)，2023年）').field, 'yysr');
  assert.equal(convertLine('2023年营业收入 (万元)').field, 'nyysr2023');
  assert.equal(convertLine('２０２３年营业收入（万元）').field, 'nyysr2023');
});

test('保留英文与普通数字，并确保字段以字母或下划线开始', () => {
  assert.equal(convertLine('企业R&D费用（元）').field, 'qyrdfy');
  assert.equal(convertLine('第2季度收入').field, 'd2jdsr');
  assert.equal(convertLine('123指标').field, '_123zb');
  assert.equal(convertLine('安全生产').field, 'aqsc');
});

test('基准年可调整，支持本年、未来年和超过两年的情况', () => {
  assert.equal(convertLine('2023年收入', { relative: true, baseYear: 2024 }).field, 'snsr');
  assert.equal(convertLine('2025年度收入', { relative: true, baseYear: 2025 }).label, '本年度收入');
  assert.equal(convertLine('2026年收入', { relative: true, baseYear: 2025 }).label, '下年收入');
  assert.equal(convertLine('2022年收入', { relative: true, baseYear: 2025 }).label, '前3年收入');
});

test('相对年份只替换独立年份，保留长编号与括号内的年份', () => {
  const row = convertLine('2023年12023批次收入（2023年口径）', { relative: true, baseYear: 2025 });
  assert.equal(row.label, '上上年12023批次收入（2023年口径）');
  assert.equal(row.field, 'ssn12023pcsr');
});

test('拒绝未闭合括号、多个年份、纯符号及无效基准年', () => {
  assert.ok(convertLine('2023年收入（万元').error);
  assert.ok(convertLine('2023—2024年收入').error);
  assert.ok(convertLine('（万元）').error);
  assert.ok(convertLine('!!!').error);
  assert.ok(convertLine('2023年收入', { relative: true, baseYear: '' }).error);
});

test('批量粘贴兼容换行和表格单元格，跳过空白，标记冲突而不擅自改名', () => {
  const rows = convertBatch('2023年收入（万元）\r\n\n2024年收入\t企业名称\n2023年收入（元）');
  assert.equal(rows.length, 4);
  assert.equal(rows[0].field, 'nsr2023');
  assert.equal(rows[2].field, 'qymc');
  assert.equal(rows[0].duplicate, true);
  assert.equal(rows[3].duplicate, true);
});

test('复制文本可直接粘贴进表格，错误行不会混入输出', () => {
  const rows = convertBatch('2023年收入（万元）\n企业名称\n（元）');
  assert.equal(formatCopy(rows, 'fields'), 'nsr2023\nqymc');
  assert.equal(formatCopy(rows, 'labels'), '2023年收入（万元）\n企业名称');
  assert.equal(formatCopy(rows, 'table'), '2023年收入（万元）\tnsr2023\n企业名称\tqymc');
});

test('中文结果去除正文和括号内的各类空格，两种年份模式一致', () => {
  const input = ' 2024 年 度 研发\u00a0费用\u3000（ 年末数， 社保\u200b ） ';
  const absolute = convertLine(input);
  assert.equal(absolute.label, '2024年度研发费用（年末数，社保）');
  assert.equal(absolute.field, 'ndyffy2024');
  const relative = convertLine(input, { relative: true, baseYear: 2025 });
  assert.equal(relative.label, '上年度研发费用（年末数，社保）');
  assert.equal(relative.field, 'sndyffy');
  assert.equal(convertLine('企 业 名 称').label, '企业名称');
});

test('去空格结果用于中文批量复制、两列复制和 CSV，保留行列分隔', () => {
  const rows = convertBatch('2024年营业 收入 （ 万元 ）\n2025年 从业人员（年末数， 社保）', { relative: true, baseYear: 2025 });
  assert.equal(formatCopy(rows, 'labels'), '上年营业收入（万元）\n本年从业人员（年末数，社保）');
  assert.equal(formatCopy(rows, 'table'), '上年营业收入（万元）\tsnyysr\n本年从业人员（年末数，社保）\tbncyry');
  assert.equal(toCsv(rows), '\ufeff中文名称,英文字段\r\n"上年营业收入（万元）","snyysr"\r\n"本年从业人员（年末数，社保）","bncyry"');
});

test('CSV 正确转义且保护表格公式', () => {
  const csv = toCsv([{ label: '=SUM(1,2)', field: 'sum12' }]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
});

test('月份范围的横杠按到生成 d，中文名称保留横杠', () => {
  const input = '2023年1-11月游戏发行营收（万元）';
  const relative = convertLine(input, { relative: true, baseYear: 2024 });
  assert.equal(relative.label, '上年1-11月游戏发行营收（万元）');
  assert.equal(relative.field, 'sn1d11yyxfxys');
  assert.equal(convertLine(input).field, 'n1d11yyxfxys2023');
  assert.equal(convertLine('2024年1-11月游戏发行营收（万元）', { relative: true, baseYear: 2024 }).field, 'bn1d11yyxfxys');
});

test('兼容数字范围的常见横杠和全角数字，去掉空格后仍可识别', () => {
  for (const dash of ['-', '－', '–', '—', '‐', '‑', '−']) {
    const row = convertLine(`2023年１ ${dash} １１月游戏发行营收（万元）`, { relative: true, baseYear: 2024 });
    assert.equal(row.field, 'sn1d11yyxfxys', dash);
    assert.equal(row.label, `上年１${dash}１１月游戏发行营收（万元）`, dash);
  }
  assert.equal(convertLine('第1-3季度收入（1-11月口径）').field, 'd1d3jdsr');
  assert.equal(convertLine('A-B型设备').field, 'abxsb');
});

test('带范围的复制和导出使用 d，避免与直接拼接数字的字段重名', () => {
  const rows = convertBatch('2023年1-11月游戏发行营收（万元）\n2023年111月游戏发行营收（万元）', { relative: true, baseYear: 2024 });
  assert.equal(formatCopy(rows, 'fields'), 'sn1d11yyxfxys\nsn111yyxfxys');
  assert.equal(rows[0].duplicate, false);
  assert.equal(formatCopy(rows, 'labels').split('\n')[0], '上年1-11月游戏发行营收（万元）');
  assert.ok(toCsv(rows).includes('"上年1-11月游戏发行营收（万元）","sn1d11yyxfxys"'));
});
