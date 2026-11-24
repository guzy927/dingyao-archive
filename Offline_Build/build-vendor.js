const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const extractRoot = path.join(__dirname, 'vendor-extract');
const vendorRoot = path.join(projectRoot, 'vendor');

const sources = {
  echarts: path.join(extractRoot, 'echarts5', 'package'),
  maps: path.join(extractRoot, 'echarts4', 'package'),
  marked: path.join(extractRoot, 'marked', 'package'),
};

for (const source of Object.values(sources)) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing extracted package directory: ${source}`);
  }
}

fs.mkdirSync(vendorRoot, { recursive: true });
fs.copyFileSync(
  path.join(sources.echarts, 'dist', 'echarts.min.js'),
  path.join(vendorRoot, 'echarts.min.js')
);
fs.copyFileSync(
  path.join(sources.marked, 'marked.min.js'),
  path.join(vendorRoot, 'marked.min.js')
);
fs.copyFileSync(
  path.join(sources.echarts, 'LICENSE'),
  path.join(vendorRoot, 'ECHARTS-LICENSE.txt')
);
fs.copyFileSync(
  path.join(sources.marked, 'LICENSE.md'),
  path.join(vendorRoot, 'MARKED-LICENSE.md')
);

const world = JSON.parse(fs.readFileSync(path.join(sources.maps, 'map', 'json', 'world.json'), 'utf8'));
const china = JSON.parse(fs.readFileSync(path.join(sources.maps, 'map', 'json', 'china.json'), 'utf8'));
const mapsSource = [
  '// GeoJSON from Apache ECharts 4.9.0 (Apache-2.0).',
  `window.__DINGYAO_WORLD_MAP__=${JSON.stringify(world)};`,
  `window.__DINGYAO_CHINA_MAP__=${JSON.stringify(china)};`,
  '',
].join('\n');
fs.writeFileSync(path.join(vendorRoot, 'maps.js'), mapsSource, 'utf8');

console.log(`Built browser dependencies in ${vendorRoot}`);
