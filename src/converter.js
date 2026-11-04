import { pinyin } from 'pinyin-pro';

const YEAR = /(?<!\d)(?:19|20|21)\d{2}(?!\d)/g;
const normalizeDigits = (text) => text.replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10));

// 支持全角、半角及嵌套括号；不完整的括号交给用户修正。
function removeParentheses(text) {
  let depth = 0;
  let clean = '';
  for (const char of text) {
    if (char === '(' || char === '（') depth++;
    else if (char === ')' || char === '）') {
      if (!depth) throw new Error('括号不完整，请检查后重新转换');
      depth--;
    } else if (!depth) clean += char;
  }
  if (depth) throw new Error('括号未闭合，请补全后重新转换');
  return clean;
}

function replaceYearOutsideParentheses(text, year, replacement) {
  let depth = 0;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(' || char === '（') depth++;
    if (char === ')' || char === '）') depth--;
    const independent = !/[0-9０-９]/.test(text[i - 1] ?? '') && !/[0-9０-９]/.test(text[i + 4] ?? '');
    if (!depth && independent && normalizeDigits(text.slice(i, i + 4)) === year) {
      result += replacement;
      i += 3;
    } else result += char;
  }
  return result;
}

function relativePrefix(delta) {
  const names = { 0: '本', 1: '上', 2: '上上', '-1': '下', '-2': '下下' };
  return names[delta] ?? (delta > 0 ? `前${delta}` : `后${-delta}`);
}

export function convertLine(input, { relative = false, baseYear = 2025 } = {}) {
  const original = String(input).trim();
  // 统一清理正文、单位中的空白，兼容从表格或网页复制的全角及零宽空格。
  const compact = original.replace(/[\s\u200B-\u200D\u2060\uFEFF]/gu, '');
  try {
    let clean = normalizeDigits(removeParentheses(compact)).normalize('NFKC');
    const years = [...clean.matchAll(YEAR)].map((match) => match[0]);
    if (years.length > 1) throw new Error('检测到多个年份，请每行仅保留一个年份');
    let label = compact;
    let suffix = '';
    if (relative) {
      const base = Number(baseYear);
      if (!Number.isInteger(base) || base < 1900 || base > 2199) {
        throw new Error('基准年需为 1900—2199 之间的整数');
      }
      if (years.length) {
        const year = years[0];
        const hasYearWord = new RegExp(`${year}\\s*年`).test(clean);
        const replacement = relativePrefix(base - Number(year)) + (hasYearWord ? '' : '年');
        // 只替换正文年份，括号内的单位、说明与年份保留，空格已统一去除。
        label = replaceYearOutsideParentheses(compact, year, replacement);
        clean = normalizeDigits(removeParentheses(label)).normalize('NFKC');
      }
    } else if (years.length) {
      suffix = years[0];
      clean = clean.replace(YEAR, '');
    }
    // 数字之间的横杠表示“到”，仅在英文字段转换时处理，中文名称保留原横杠。
    const fieldText = clean.replace(/(?<=\d)[\-‐‑‒–—−﹣](?=\d)/gu, '到');
    let field = pinyin(fieldText, { pattern: 'first', toneType: 'none', type: 'array', nonZh: 'consecutive' })
      .join('').toLowerCase().replace(/[^a-z0-9_]/g, '') + suffix;
    if (!field) throw new Error('没有可转换的文字，请输入中文或英文名称');
    if (/^\d/.test(field)) field = `_${field}`;
    return { original, label, field, error: null };
  } catch (error) {
    return { original, label: compact, field: '', error: error.message };
  }
}

export function splitInput(text) {
  return String(text).split(/[\r\n\t]+/).map((line) => line.trim()).filter(Boolean);
}

export function convertBatch(text, options = {}) {
  const rows = splitInput(text).map((line) => convertLine(line, options));
  const counts = new Map();
  for (const row of rows) if (row.field) counts.set(row.field, (counts.get(row.field) ?? 0) + 1);
  return rows.map((row) => ({ ...row, duplicate: !!row.field && counts.get(row.field) > 1 }));
}

export function formatCopy(rows, format = 'fields') {
  return rows.filter((row) => !row.error && row.field).map((row) => {
    if (format === 'labels') return row.label;
    if (format === 'table') return `${row.label}\t${row.field}`;
    return row.field;
  }).join('\n');
}

export function toCsv(rows) {
  const quote = (value) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return '\ufeff' + ['中文名称,英文字段', ...rows.filter((row) => !row.error && row.field)
    .map((row) => [row.label, row.field].map(quote).join(','))].join('\r\n');
}
