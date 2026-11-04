import { execFileSync } from 'node:child_process';
import { mkdir, copyFile, writeFile, mkdtemp, symlink, stat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit' });
run('npm', ['run', 'build']);
const output = path.join(root, 'dist');
const temporaryRoot = path.join(root, '.macos-build');
await mkdir(output, { recursive: true });
await mkdir(temporaryRoot, { recursive: true });
const staging = await mkdtemp(path.join(temporaryRoot, 'package-'));
const app = path.join(staging, '字段工坊.app');
const contents = path.join(app, 'Contents');
await mkdir(path.join(contents, 'MacOS'), { recursive: true });
await mkdir(path.join(contents, 'Resources'), { recursive: true });
console.log('编译 Apple 芯片和 Intel 通用应用…');
for (const arch of ['arm64', 'x86_64']) {
  run('xcrun', ['swiftc', '-O', '-parse-as-library', '-swift-version', '5', '-target', `${arch}-apple-macos13.3`,
    '-framework', 'AppKit', '-framework', 'WebKit', '-framework', 'UniformTypeIdentifiers',
    'macos/FieldForge.swift', '-o', path.join(staging, `FieldForge-${arch}`)]);
}
run('xcrun', ['lipo', '-create', path.join(staging, 'FieldForge-arm64'), path.join(staging, 'FieldForge-x86_64'),
  '-output', path.join(contents, 'MacOS', 'FieldForge')]);
await copyFile(path.join(root, '字段转换器.html'), path.join(contents, 'Resources', 'index.html'));
await copyFile(path.join(root, 'macos', 'Info.plist'), path.join(contents, 'Info.plist'));
const iconset = path.join(staging, 'AppIcon.iconset');
run('xcrun', ['swift', 'macos/MakeIcon.swift', iconset]);
run('iconutil', ['-c', 'icns', iconset, '-o', path.join(contents, 'Resources', 'AppIcon.icns')]);
run('codesign', ['--force', '--sign', '-', '--options', 'runtime', '--timestamp=none', app]);
run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app]);
run('plutil', ['-lint', path.join(contents, 'Info.plist')]);
const installedApp = path.join(output, '字段工坊.app');
run('ditto', [app, installedApp]);
const diskRoot = path.join(staging, 'disk');
await mkdir(diskRoot);
run('ditto', [app, path.join(diskRoot, '字段工坊.app')]);
await symlink('/Applications', path.join(diskRoot, 'Applications'));
await writeFile(path.join(diskRoot, '安装说明.txt'), `字段工坊 ${version}\n\n安装：将「字段工坊.app」拖到 Applications 文件夹，再从应用程序打开。\n系统：macOS 13.3 或更新版本，支持 Apple 芯片和 Intel。\n\n全部功能离线可用，无需本地服务。支持批量转换、相对年份、系统剪贴板和 CSV 导出。\n中文名称与英文字段均可单独复制；名称内空格会自动去除。\n相对年份的基准年默认为 2025，可自行修改。\n\n本版本使用本地临时签名，未经过 Apple 开发者证书签名及公证。\n跨电脑传输或下载后，macOS 可能要求用户在「系统设置 → 隐私与安全性」中确认打开。\n\n界面内「使用说明」可查看完整转换规则。\n`, 'utf8');
const dmg = path.join(output, `字段工坊-${version}-universal.dmg`);
run('hdiutil', ['create', '-volname', '字段工坊', '-srcfolder', diskRoot, '-format', 'UDZO',
  '-imagekey', 'zlib-level=9', '-ov', dmg]);
run('hdiutil', ['verify', dmg]);
console.log(`DMG 已生成：${dmg}（${((await stat(dmg)).size / 1024 / 1024).toFixed(1)} MB）`);
