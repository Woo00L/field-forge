import { convertBatch, convertLine, splitInput, formatCopy, toCsv } from './converter.js';
import { icon } from './icons.js';

const EXAMPLES = [
  '2023年营业收入 （万元）',
  '2024年营业收入 （万元）',
  '2024年度可加计扣除研发费用（万元）',
  '2023年从业人员（人）',
  '2024年研发人员（人）',
  '企业名称',
].join('\n');

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="#" aria-label="字段工坊首页"><span class="brand-icon">${icon('brackets')}</span><span>字段工坊</span></a>
      <span class="brand-caption">中文名称 → 英文字段</span>
      <button class="text-button help-button" id="help">${icon('help')}使用说明</button>
    </div>
  </header>
  <main class="main">
    <section class="page-intro">
      <div><h1>好用的字段名，从中文开始<span>。</span></h1><p>粘贴中文名称，一键生成拼音首字母字段。</p></div>
      <div class="local-note">${icon('shield')}纯本地处理，内容不上传</div>
    </section>

    <section class="settings" aria-label="转换设置">
      <div class="settings-main">
        <div class="settings-heading">${icon('sliders')}<span>转换设置</span></div>
        <div class="mode-setting">
          <div><label id="relative-label">转换为相对年份</label><p id="mode-description">关闭时保留年份，拼接到字段末尾</p></div>
          <button id="relative" class="switch" role="switch" aria-checked="false" aria-labelledby="relative-label"><span></span></button>
        </div>
        <div class="year-setting"><label for="base-year">基准年份</label><div class="year-control"><input id="base-year" type="number" min="1900" max="2199" step="1" value="2025" disabled><span>年</span></div><span class="year-hint" id="year-hint">开启相对年份后可调整</span></div>
      </div>
      <div class="rule-preview"><span class="preview-title">规则预览</span><span class="preview-source">2023年营业收入（万元）</span>${icon('arrow')}<span id="preview-label" hidden></span><code id="preview-field">nyysr2023</code><span class="preview-note" id="preview-note">年份移至末尾 · 自动去除括号内容</span></div>
    </section>

    <div class="workspace">
      <section class="panel input-panel" aria-labelledby="input-title">
        <div class="panel-heading"><div class="panel-title"><span class="step">01</span><h2 id="input-title">输入中文名称</h2></div><button id="examples" class="text-button">填入示例</button></div>
        <div class="editor-toolbar"><span>每行一个名称，支持批量粘贴</span><div><button id="paste" class="small-button">${icon('paste')}粘贴</button><span class="tool-divider"></span><button id="clear" class="text-button subtle">清空</button></div></div>
        <div class="editor"><div id="line-numbers" class="line-numbers" aria-hidden="true"></div><textarea id="source" aria-label="中文名称，每行一项" spellcheck="false" wrap="off" placeholder="在这里输入或粘贴中文名称…&#10;例如：2023年营业收入（万元）"></textarea></div>
        <div class="editor-meta"><span id="input-count">6 个名称</span><span>也支持从 Excel 直接粘贴</span></div>
        <div class="input-actions"><button id="convert" class="button primary">${icon('brackets')}开始转换${icon('arrow', 'button-arrow')}</button><span class="shortcut"><kbd id="modifier-key">⌘</kbd><kbd>Enter</kbd></span></div>
      </section>

      <section class="panel result-panel" aria-labelledby="result-title">
        <div class="panel-heading"><div class="panel-title"><span class="step">02</span><h2 id="result-title">转换结果</h2><span id="result-count" class="count-badge" hidden></span></div><span id="result-status" class="result-status">等待转换</span></div>
        <div id="result-message" class="result-message" role="status" hidden></div>
        <div class="result-content" id="result-content">
          <div id="empty" class="empty-state"><span class="empty-icon">${icon('brackets')}<span class="empty-spark">${icon('check')}</span></span><h3>下一份好字段，就在这里</h3><p>输入中文名称，点击「开始转换」<br>即可得到可直接复制的英文字段。</p></div>
          <div id="table-wrap" class="table-wrap" hidden><table><thead><tr><th class="number-column">#</th><th>中文名称</th><th>英文字段</th><th class="copy-column"><span class="sr-only">复制</span></th></tr></thead><tbody id="result-body"></tbody></table></div>
        </div>
        <div class="result-bottom"><span id="result-footnote">中文保留单位，英文字段自动去除括号内容</span></div>
        <div class="result-actions"><div class="copy-group"><div class="select-wrap"><select id="copy-format" aria-label="批量复制格式"><option value="fields">仅英文字段</option><option value="table">中文 + 字段（两列）</option><option value="labels">仅中文名称</option></select>${icon('chevron')}</div><button id="copy-all" class="button secondary" disabled>${icon('copy')}全部复制</button></div><button id="export" class="text-button export-button" disabled>${icon('download')}导出 CSV</button></div>
      </section>
    </div>

    <section class="quick-guide" aria-label="转换规则">
      <div class="guide-item"><span class="guide-number">01 /</span><div><h3>括号内容，自动略过</h3><p>兼容中文（ ）与英文 ( )，单位不计入字段。</p></div></div>
      <div class="guide-item"><span class="guide-number">02 /</span><div><h3>年份形式，由你决定</h3><p>保留具体年份，或按基准年转为上年、上上年。</p></div></div>
      <div class="guide-item"><span class="guide-number">03 /</span><div><h3>批量复制，直接使用</h3><p>复制单个字段或整列，也可导出为 CSV 表格。</p></div></div>
    </section>
    <footer class="page-footer"><span>少一点重复，多一点专注。</span><span>字段工坊 <span class="footer-dot">·</span> 离线也能用</span></footer>
  </main>
  <div id="toast" class="toast" role="status" hidden></div>
  <dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-heading"><h2 id="help-title">使用说明</h2><button class="icon-button" id="close-help" aria-label="关闭使用说明">${icon('close')}</button></div><div class="dialog-body">
    <h3>1. 粘贴名称，点击转换</h3><p>每行一个名称；从 Excel 复制多格也可以。点击「开始转换」或按 ⌘ / Ctrl + Enter。修改输入后，需要重新转换才能复制最新结果。</p>
    <h3>2. 选择年份模式</h3><p>默认保留年份：「2023年营业收入（万元）」→ <code>nyysr2023</code>。「年」本身的首字母 n 会保留。</p><p>开启「转换为相对年份」，以基准年计算：基准年 2025 时，2023 年 → 上上年，2024 年度 → 上年度，2025 年 → 本年。未来一年为下年；相差超过两年使用「前3年」「后3年」等名称。原名称中的「年 / 年度」会保留。</p>
    <h3>3. 复制或导出结果</h3><p>中文名称旁的按钮复制该名称，行末按钮复制英文字段；底部可批量复制英文字段、中文名称，或「中文 + 字段」两列，直接粘贴至 Excel。中文名称中的空格会自动去除，括号内也一样。CSV 使用 UTF-8 编码，中文可正常显示。</p>
    <h3>其他规则</h3><p>字段为小写拼音首字母，保留英文与普通数字。数字之间的横杠表示「到」，例如 1-11月 → <code>1d11y</code>，中文名称保留横杠；兼容常见长短横杠。兼容全角数字和嵌套括号；没有年份时直接转换。可识别 1900—2199 年，多个年份或未闭合括号会提示修正。拼音重名会标出；特殊多音字请在使用前核对。</p>
    <p class="privacy-note">${icon('shield')}所有转换都在当前浏览器内完成，无需账号或网络。</p>
  </div></dialog>
  <dialog id="copy-dialog" aria-labelledby="copy-title"><div class="dialog-heading"><h2 id="copy-title">手动复制</h2><button class="icon-button" id="close-copy" aria-label="关闭手动复制">${icon('close')}</button></div><div class="dialog-body"><p>浏览器限制了自动复制，内容已选中，请按 ⌘C / Ctrl+C。</p><textarea id="manual-copy" readonly aria-label="待复制内容"></textarea></div></dialog>
`;

const $ = (id) => document.getElementById(id);
const nativeBridge = window.webkit?.messageHandlers?.fieldForge;
const source = $('source');
let relative = false;
let rows = [];
let dirty = false;
let toastTimer;
source.value = EXAMPLES;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
$('modifier-key').textContent = isMac ? '⌘' : 'Ctrl';

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
}

function options() { return { relative, baseYear: $('base-year').value }; }

function updateInput() {
  const count = splitInput(source.value).length;
  $('input-count').textContent = `${count} 个名称`;
  $('line-numbers').textContent = Array.from({ length: source.value.split('\n').length }, (_, i) => i + 1).join('\n');
  $('convert').disabled = count === 0;
  $('clear').disabled = !source.value;
  $('line-numbers').scrollTop = source.scrollTop;
}

function markDirty() {
  dirty = rows.length > 0;
  if (dirty) {
    $('result-status').textContent = '输入已变更';
    $('result-status').className = 'result-status pending';
    $('result-footnote').textContent = '请点击「开始转换」，更新结果后再复制';
    $('result-body').classList.add('stale');
  }
  updateActions();
}

function updateActions() {
  const unavailable = dirty || !rows.some((row) => !row.error && row.field);
  $('copy-all').disabled = unavailable;
  $('export').disabled = unavailable;
  document.querySelectorAll('[data-copy-row]').forEach((button) => { button.disabled = dirty; });
}

function updateSettings() {
  $('relative').setAttribute('aria-checked', String(relative));
  $('base-year').disabled = !relative;
  $('mode-description').textContent = relative ? '按基准年生成上年、上上年等名称' : '关闭时保留年份，拼接到字段末尾';
  $('year-hint').textContent = relative ? '用于计算相对年份' : '开启相对年份后可调整';
  const preview = convertLine('2023年营业收入（万元）', options());
  $('preview-label').hidden = !relative;
  $('preview-label').textContent = preview.error ? '' : preview.label;
  $('preview-field').textContent = preview.error ? '请设置有效基准年' : preview.field;
  $('preview-note').textContent = relative ? `以 ${$('base-year').value || '—'} 年为基准` : '年份移至末尾 · 自动去除括号内容';
}

function createCopyButton(text, kind, index) {
  const button = document.createElement('button');
  button.className = `icon-button row-copy${kind === '中文名称' ? ' label-copy' : ''}`;
  button.dataset.copyRow = index;
  button.setAttribute('aria-label', `复制${kind} ${text}`);
  button.title = `复制${kind}`;
  button.innerHTML = icon('copy');
  button.addEventListener('click', async () => {
    if (await copyText(text)) {
      button.innerHTML = icon('check');
      setTimeout(() => { if (button.isConnected) button.innerHTML = icon('copy'); }, 1600);
      toast(`已复制${kind}：${text}`);
    }
  });
  return button;
}

function renderResults() {
  $('empty').hidden = rows.length > 0;
  $('table-wrap').hidden = rows.length === 0;
  $('result-count').hidden = rows.length === 0;
  $('result-count').textContent = rows.length;
  $('result-body').classList.remove('stale');
  $('result-body').replaceChildren();
  const valid = rows.filter((row) => !row.error).length;
  const duplicates = rows.filter((row) => row.duplicate).length;
  const errors = rows.length - valid;
  const messages = [];
  if (errors) messages.push(`${errors} 项需要修正，请查看对应行`);
  if (duplicates) messages.push(`${duplicates} 项字段重名，使用前请核对`);
  $('result-message').hidden = !messages.length;
  $('result-message').textContent = messages.join('；');
  $('result-status').textContent = rows.length ? (errors ? `${valid} 项成功` : '转换完成') : '等待转换';
  $('result-status').className = `result-status${rows.length ? ' done' : ''}`;
  $('result-footnote').textContent = errors ? '复制和导出会跳过未成功转换的行' : '中文和字段均可单独复制，名称内的空格已去除';
  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (row.error) tr.classList.add('error-row');
    const number = document.createElement('td');
    number.className = 'row-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('td');
    label.className = 'label-cell';
    label.title = row.original;
    const labelContent = document.createElement('div');
    labelContent.className = 'label-content';
    const labelText = document.createElement('span');
    labelText.className = 'label-text';
    labelText.textContent = row.label;
    labelContent.append(labelText);
    if (!row.error) labelContent.append(createCopyButton(row.label, '中文名称', index));
    label.append(labelContent);
    const fieldCell = document.createElement('td');
    fieldCell.className = 'field-cell';
    const field = document.createElement(row.error ? 'span' : 'code');
    field.className = row.error ? 'error-text' : 'field-code';
    field.textContent = row.error || row.field;
    fieldCell.append(field);
    if (row.duplicate) {
      const warning = document.createElement('span');
      warning.className = 'duplicate-note';
      warning.textContent = '重名';
      fieldCell.append(warning);
    }
    const action = document.createElement('td');
    if (!row.error) {
      action.append(createCopyButton(row.field, '字段', index));
    }
    tr.append(number, label, fieldCell, action);
    $('result-body').append(tr);
  });
  updateActions();
}

function runConversion(silent = false) {
  if (!splitInput(source.value).length) { toast('请先输入中文名称'); source.focus(); return; }
  if (relative && (!Number.isInteger(Number($('base-year').value)) || Number($('base-year').value) < 1900 || Number($('base-year').value) > 2199)) {
    toast('请将基准年设置为 1900—2199 之间的整数');
    $('base-year').focus();
    return;
  }
  rows = convertBatch(source.value, options());
  dirty = false;
  renderResults();
  if (!silent) toast(`已转换 ${rows.filter((row) => !row.error).length} 个字段`);
}

async function copyText(text) {
  try {
    if (nativeBridge) {
      await nativeBridge.postMessage({ action: 'writeClipboard', text });
      return true;
    }
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const previous = document.activeElement;
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.className = 'clipboard-fallback';
    document.body.append(fallback);
    fallback.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* 显示可手动复制的内容。 */ }
    fallback.remove();
    previous?.focus();
    if (copied) return true;
    $('manual-copy').value = text;
    $('copy-dialog').showModal();
    $('manual-copy').select();
    return false;
  }
}

source.addEventListener('input', () => { updateInput(); markDirty(); });
source.addEventListener('scroll', () => { $('line-numbers').scrollTop = source.scrollTop; });
$('convert').addEventListener('click', () => runConversion());
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !$('help-dialog').open && !$('copy-dialog').open) {
    event.preventDefault(); runConversion();
  }
});
$('relative').addEventListener('click', () => {
  relative = !relative;
  updateSettings();
  if (rows.length) { markDirty(); runConversion(true); }
});
$('base-year').addEventListener('input', () => { updateSettings(); markDirty(); });
$('clear').addEventListener('click', () => {
  source.value = ''; rows = []; dirty = false;
  updateInput(); renderResults(); source.focus();
});
$('examples').addEventListener('click', () => { source.value = EXAMPLES; updateInput(); markDirty(); source.focus(); toast('已填入 6 个示例，点击开始转换即可'); });
$('paste').addEventListener('click', async () => {
  try {
    const text = nativeBridge ? await nativeBridge.postMessage({ action: 'readClipboard' }) : await navigator.clipboard.readText();
    if (!text.trim()) { toast('剪贴板中没有文字'); return; }
    source.value = text;
    updateInput(); markDirty(); source.focus(); toast('已粘贴，点击开始转换即可');
  } catch { source.focus(); toast(`请在输入框按 ${isMac ? '⌘V' : 'Ctrl+V'} 粘贴文字`); }
});
$('copy-all').addEventListener('click', async () => {
  if (await copyText(formatCopy(rows, $('copy-format').value))) toast(`已复制 ${rows.filter((row) => !row.error).length} 项结果`);
});
$('export').addEventListener('click', async () => {
  if (nativeBridge) {
    try {
      if (await nativeBridge.postMessage({ action: 'saveCsv', text: toCsv(rows) })) toast('已保存 CSV 文件');
    } catch (error) { toast(error.message || '保存失败，请重试'); }
    return;
  }
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = '字段转换结果.csv';
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('已导出 CSV 文件');
});
$('help').addEventListener('click', () => $('help-dialog').showModal());
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('close-copy').addEventListener('click', () => $('copy-dialog').close());
for (const id of ['help-dialog', 'copy-dialog']) {
  $(id).addEventListener('click', (event) => { if (event.target === $(id)) $(id).close(); });
}

updateInput();
updateSettings();
