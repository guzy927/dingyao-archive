// 生成可由资源管理器直接双击打开的离线版资源。
// 运行：node Offline_Build/build-offline.js
// 文献按内容 SHA-1 去重：3961 个器物文件实际只有 76 份不同正文。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const BUNDLE_DIR = path.join(ROOT, 'offline_references');
const OFFLINE_DATA_PATH = path.join(ROOT, 'offline-data.js');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const contentGroups = new Map();

for (const item of data) {
  if (!item.md_path) continue;
  const sourcePath = path.join(ROOT, item.md_path);
  const text = fs.readFileSync(sourcePath, 'utf8');
  const hash = crypto.createHash('sha1').update(text, 'utf8').digest('hex');
  if (!contentGroups.has(hash)) contentGroups.set(hash, text);
  item.offline_reference_key = hash;
  item.offline_reference_bundle = `offline_references/ref-${hash}.js`;
}

fs.mkdirSync(BUNDLE_DIR, { recursive: true });
for (const [hash, text] of contentGroups) {
  const payload = JSON.stringify({ [hash]: text }).replace(/<\//g, '<\\/');
  fs.writeFileSync(
    path.join(BUNDLE_DIR, `ref-${hash}.js`),
    `window.__DINGYAO_REFERENCE_STORE__ = Object.assign(window.__DINGYAO_REFERENCE_STORE__ || {}, ${payload});\n`,
    'utf8',
  );
}

fs.writeFileSync(
  OFFLINE_DATA_PATH,
  `window.__DINGYAO_DATA__ = ${JSON.stringify(data)};\n`,
  'utf8',
);

console.log(JSON.stringify({
  offlineData: OFFLINE_DATA_PATH,
  referenceDirectory: BUNDLE_DIR,
  items: data.length,
  uniqueReferenceBundles: contentGroups.size,
  uniqueReferenceBytes: [...contentGroups.values()].reduce((sum, text) => sum + Buffer.byteLength(text, 'utf8'), 0),
}));
