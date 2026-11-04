import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const result = await build({
  entryPoints: ['src/app.js'], bundle: true, minify: true,
  write: false, format: 'iife', target: ['es2020'], legalComments: 'eof',
});
const template = await readFile('index.html', 'utf8');
const css = await readFile('src/styles.css', 'utf8');
const pinyinLicense = await readFile('node_modules/pinyin-pro/LICENSE', 'utf8');
const js = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const html = template.replace('<!-- APP_STYLE -->', () => `<style>${css}</style>`)
  .replace('<!-- APP_SCRIPT -->', () => `<script>/*! pinyin-pro\n${pinyinLicense}\n*/\n${js}</script>`);
await writeFile('字段转换器.html', html);
console.log(`已生成离线工具：字段转换器.html（${(Buffer.byteLength(html) / 1024).toFixed(0)} KB）`);
