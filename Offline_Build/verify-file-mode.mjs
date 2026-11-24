import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profileDirectory = path.join(root, `.edge-file-verify-${port}`);
const pageUrl = process.argv[2] || `file:///${path.join(root, 'index.html').replaceAll('\\', '/')}`;

const edgeProcess = spawn(edge, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDirectory}`,
  pageUrl,
], { stdio: 'ignore', windowsHide: true });

async function waitForJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function evaluate(webSocketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('CDP evaluation timed out'));
    }, 15000);
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== 1) return;
      clearTimeout(timeout);
      socket.close();
      if (message.error || message.result?.exceptionDetails) {
        reject(new Error(JSON.stringify(message.error || message.result.exceptionDetails)));
      } else {
        resolve(message.result.result.value);
      }
    });
    socket.addEventListener('error', reject);
  });
}

try {
  const pages = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  const page = pages.find((entry) => entry.type === 'page' && !entry.url.startsWith('edge:'));
  if (!page) throw new Error('Target page was not opened');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const homepage = await evaluate(page.webSocketDebuggerUrl, `(() => ({
    protocol: location.protocol,
    readyState: document.readyState,
    dataCount: Array.isArray(window.__DINGYAO_DATA__) ? window.__DINGYAO_DATA__.length : -1,
    renderedRows: document.querySelectorAll('#table-body tr').length,
    overlayHidden: document.querySelector('#loading-overlay')?.hidden,
    pageInfo: document.querySelector('#home-page-info')?.textContent,
    visibleError: document.querySelector('#table-body .error')?.textContent || '',
    firstItem: document.querySelector('#table-body tr')?.innerText || ''
  }))()`);
  await evaluate(page.webSocketDebuggerUrl, `(() => {
    document.querySelector('#table-body .btn-detail')?.click();
    return true;
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const detail = await evaluate(page.webSocketDebuggerUrl, `(() => ({
    title: document.querySelector('#modal-title')?.textContent || '',
    sourceChars: document.querySelector('#modal-md-text')?.innerText.length || 0,
    sourceError: document.querySelector('#modal-md-text .error')?.textContent || '',
    loadingSource: document.querySelector('#modal-md-text')?.innerText.includes('正在加载文献'),
    searchableFields: document.querySelectorAll('#modal-sections .searchable-field').length
  }))()`);
  await evaluate(page.webSocketDebuggerUrl, `(() => {
    [...document.querySelectorAll('#modal-sections .searchable-field')]
      .find((button) => button.dataset.fieldKey === 'dimensions')?.click();
    return true;
  })()`);
  const highlight = await evaluate(page.webSocketDebuggerUrl, `(() => ({
    matchedText: document.querySelector('#modal-md-text .source-match')?.innerText.slice(0, 500) || '',
    marks: [...document.querySelectorAll('#modal-md-text mark')].map((mark) => mark.textContent)
  }))()`);
  await evaluate(page.webSocketDebuggerUrl, `(() => {
    document.querySelector('#modal-close')?.click();
    document.querySelector('#toggle-data-btn')?.click();
    return true;
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const charts = await evaluate(page.webSocketDebuggerUrl, `(() => ({
    dataViewVisible: !document.querySelector('#data-view')?.hidden,
    dependencyVersion: window.echarts?.version || '',
    mapsReady: Boolean(window.__DINGYAO_WORLD_MAP__ && window.__DINGYAO_CHINA_MAP__),
    chartCanvases: document.querySelectorAll('#data-view canvas').length,
    chartSvgs: document.querySelectorAll('#data-view svg').length,
    visibleErrors: [...document.querySelectorAll('#data-view .error')].map((node) => node.textContent),
    populatedCharts: [...document.querySelectorAll('#data-view .chart')]
      .filter((node) => node.childElementCount > 0).length
  }))()`);
  console.log(JSON.stringify({ homepage, detail, highlight, charts }));
} finally {
  try {
    const version = await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ id: 2, method: 'Browser.close' })));
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch {
    // The browser may already have exited.
  }
  if (!edgeProcess.killed) edgeProcess.kill();
}
