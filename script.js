// 定窑瓷器数字档案 —— 遗址视图 / 卡片视图 / 数据整理视图
const siteView = document.getElementById('site-view');
const homeSearchInput = document.getElementById('home-search-input');
const listViewBtn = document.getElementById('list-view-btn');
const cardViewBtn = document.getElementById('card-view-btn');
const listView = document.getElementById('list-view');
const cardsView = document.getElementById('cards-view');
const tableBody = document.getElementById('table-body');
const homeCardsContainer = document.getElementById('home-cards-container');
const dataView = document.getElementById('data-view');
const toggleBtn = document.getElementById('toggle-data-btn');
const backBtn = document.getElementById('back-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalMdText = document.getElementById('modal-md-text');
const modalImage = document.getElementById('modal-image');
const modalSections = document.getElementById('modal-sections');
const loadingOverlay = document.getElementById('loading-overlay');
const homePagination = document.getElementById('home-pagination');
const homePrev = document.getElementById('home-prev');
const homeNext = document.getElementById('home-next');
const homePageInfo = document.getElementById('home-page-info');
const pageJumpInput = document.getElementById('page-jump-input');
const pageJumpBtn = document.getElementById('page-jump-btn');
const mapWorldBtn = document.getElementById('map-world-btn');
const mapChinaBtn = document.getElementById('map-china-btn');
const periodTh = document.getElementById('period-th');
const periodSortArrow = document.getElementById('period-sort-arrow');
const filterDim = document.getElementById('filter-dimension');
const filterValueSel = document.getElementById('filter-value');

let allData = [];           // 保存从 data.json 加载的全部数据
let filteredData = [];      // 搜索过滤后的数据
let categoryChart = null;   // 器类柱状图实例
let locationChart = null;   // 出土位置散点图实例
let yearChart = null;       // 年代甘特图实例
let glazeChart = null;      // 釉色分布饼图实例
let bodyColorChart = null;  // 胎色分布饼图实例
let techniqueChart = null;  // 纹饰技法饼图实例
let topSitesChart = null;   // 器物来源 Top10 条形图实例
let chartsRendered = false; // 图表是否已初始化
let currentPage = 1;        // 当前页码
let viewMode = 'list';      // 首页视图模式：list | card
const PAGE_SIZE = 20;       // 每页条数
let periodSortDir = null;          // 列表年代排序：null | 'asc' | 'desc'
let searchKeyword = '';            // 当前搜索关键词
let filterDimension = 'category';  // 卡片筛选维度
let filterValue = '';              // 卡片筛选值（空 = 全部）

// 简单的 HTML 转义，防止数据中的特殊字符破坏结构
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// 根据单条瓷器数据生成一张 3D 翻转卡片
function createCard(item, index) {
  // 背面：image 有值则显示图片，否则显示占位符
  const backContent = item.image
    ? `<img class="card-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />`
    : '<p class="placeholder">图片占位</p>';

  return `
    <div class="card" tabindex="0" role="button" aria-pressed="false"
         aria-label="${escapeHtml(item.name)}，点击翻转" data-id="${escapeHtml(item.id)}">
      <div class="card-inner">
        <div class="card-face card-front">
          <h2 class="card-name">${escapeHtml(item.name)}</h2>
          <button class="card-detail-btn" type="button" data-index="${index}">详情</button>
        </div>
        <div class="card-face card-back">
          ${backContent}
        </div>
      </div>
    </div>
  `;
}

// ============ 首页：列表 / 卡片双视图 + 分页 ============
function getTotalPages() {
  return Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
}

// 渲染首页（当前视图 + 当前页，每次只渲染 20 条，绝不一次性渲染全部）
function renderHomepage() {
  const totalPages = getTotalPages();
  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredData.slice(start, start + PAGE_SIZE);

  if (viewMode === 'list') {
    renderListView(pageItems);
  } else {
    renderCardView(pageItems);
  }
  updateHomePagination();
}

// 渲染列表视图
function renderListView(items) {
  tableBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.country || '')}</td>
          <td>${escapeHtml(item.province || '')}</td>
          <td>${escapeHtml(item.city || '')}</td>
          <td>${escapeHtml(item.location)}</td>
          <td>${escapeHtml(item.nature || '')}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.period)}</td>
          <td><button class="btn-detail" type="button" data-index="${allData.indexOf(item)}">详情</button></td>
        </tr>
      `
    )
    .join('');
}

// 渲染卡片视图
function renderCardView(items) {
  homeCardsContainer.innerHTML = items.map((item) => createCard(item, allData.indexOf(item))).join('');
}

// 更新分页控件状态
function updateHomePagination() {
  const totalPages = getTotalPages();
  homePageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;
  pageJumpInput.max = totalPages;
  homePrev.disabled = currentPage <= 1;
  homeNext.disabled = currentPage >= totalPages;
  homePagination.hidden = false;
}

// 切换视图（列表 / 卡片）
function switchView(mode) {
  viewMode = mode;
  listView.hidden = mode !== 'list';
  cardsView.hidden = mode !== 'card';
  listViewBtn.classList.toggle('active', mode === 'list');
  cardViewBtn.classList.toggle('active', mode === 'card');
  recomputeFilteredData();
  renderHomepage();
}

// 跳转到指定页
function goToPage(page) {
  const totalPages = getTotalPages();
  const p = Number(page);
  if (!Number.isInteger(p) || p < 1) {
    currentPage = 1;
  } else if (p > totalPages) {
    currentPage = totalPages;
  } else {
    currentPage = p;
  }
  renderHomepage();
}

// 关键词匹配（命中任意字段）
function matches(item, keyword) {
  const kw = keyword.toLowerCase();
  const fields = [
    'name', 'category', 'location', 'province', 'city', 'country',
    'period', 'glaze_color', 'decorating_technique', 'bibliography',
  ];
  return fields.some((field) => {
    const val = item[field];
    return val != null && String(val).toLowerCase().includes(kw);
  });
}

// ============ 列表按年代排序 ============
// 判断某条数据的年代是否"有效"（非空、非不明/未知、且能在 periodMap 中匹配）
function isKnownPeriod(item) {
  const key = cleanPeriod(item.period);
  return !!key && key !== '不明' && key !== '未知' && !!periodMap[key];
}

// 获取某条数据的年代起始年份（仅用于有效年代）
function getPeriodStartYear(item) {
  const range = periodMap[cleanPeriod(item.period)];
  return range ? range[0] : 9999;
}

function updatePeriodSortLabel() {
  if (!periodSortArrow) return;
  periodSortArrow.textContent = periodSortDir === 'asc' ? '↑' : periodSortDir === 'desc' ? '↓' : '↕';
}

function togglePeriodSort() {
  periodSortDir = periodSortDir === 'asc' ? 'desc' : 'asc';
  const dir = periodSortDir === 'asc' ? 1 : -1;
  filteredData = [...filteredData].sort((a, b) => {
    const aKnown = isKnownPeriod(a);
    const bKnown = isKnownPeriod(b);
    // 未知/不明/未映射的条目始终固定在最后（无论正序倒序）
    if (aKnown !== bKnown) return aKnown ? -1 : 1;
    if (!aKnown) return 0;
    return (getPeriodStartYear(a) - getPeriodStartYear(b)) * dir;
  });
  currentPage = 1;
  renderHomepage();
  updatePeriodSortLabel();
}

// ============ 卡片视图二级联动筛选 ============
// 器类分布图剔除的类别
const CATEGORY_EXCLUDED = ['未知', '瓷片', '残片', '白瓷（多组合）', '出土器物组合', '白瓷（多器形）'];

// 获取某维度筛选项（复用图表统计逻辑）
function getFilterOptions(dim) {
  switch (dim) {
    case 'category': {
      const all = getCategoryCounts(allData);
      const normal = all.filter((d) => !CATEGORY_EXCLUDED.includes(d.name)).sort((a, b) => b.value - a.value);
      const names = normal.slice(0, 25).map((d) => d.name);
      const restSum = normal.slice(25).reduce((s, d) => s + d.value, 0)
        + all.filter((d) => CATEGORY_EXCLUDED.includes(d.name)).reduce((s, d) => s + d.value, 0);
      if (restSum > 0) names.push('其他器类');
      return names;
    }
    case 'body_color':
      return getBodyColorDistribution(allData).map((d) => d.name);
    case 'glaze_color':
      return getGlazeDistribution(allData).map((d) => d.name);
    case 'period':
      return getPeriodGanttData(allData).map((d) => d.name);
    case 'nature': {
      const set = new Set();
      allData.forEach((item) => {
        const v = item.nature != null ? String(item.nature).trim() : '';
        if (v) set.add(v);
      });
      return Array.from(set);
    }
    default:
      return [];
  }
}

// 获取某维度的"真实大类"集合（不含"其他"）
function getDimensionTopSet(dim) {
  switch (dim) {
    case 'category': {
      const all = getCategoryCounts(allData);
      return new Set(all.filter((d) => !CATEGORY_EXCLUDED.includes(d.name)).sort((a, b) => b.value - a.value).slice(0, 25).map((d) => d.name));
    }
    case 'body_color':
      return new Set(getBodyColorDistribution(allData).map((d) => d.name).filter((n) => n !== '其他胎色'));
    case 'glaze_color':
      return new Set(getGlazeDistribution(allData).map((d) => d.name).filter((n) => n !== '其他釉色'));
    case 'period':
      return new Set(getPeriodGanttData(allData).map((d) => d.name));
    case 'nature': {
      const set = new Set();
      allData.forEach((item) => {
        const v = item.nature != null ? String(item.nature).trim() : '';
        if (v) set.add(v);
      });
      return set;
    }
    default:
      return new Set();
  }
}

// 将某条数据映射到某维度的大分类（与图表一致）
function categoryOfDim(item, dim, topSet) {
  switch (dim) {
    case 'category':
      if (CATEGORY_EXCLUDED.includes(item.category) || !topSet.has(item.category)) return '其他器类';
      return item.category;
    case 'body_color':
      if (!item.body_color || item.body_color === '不明') return '';
      return topSet.has(item.body_color) ? item.body_color : '其他胎色';
    case 'glaze_color':
      if (!item.glaze_color || item.glaze_color === '不明') return '';
      return topSet.has(item.glaze_color) ? item.glaze_color : '其他釉色';
    case 'period':
      return cleanPeriod(item.period);
    case 'nature':
      return item.nature != null ? String(item.nature).trim() : '';
    default:
      return '';
  }
}

// 重新计算 filteredData（搜索 + 卡片筛选）
function recomputeFilteredData() {
  let result = allData;
  if (searchKeyword) {
    result = result.filter((item) => matches(item, searchKeyword));
  }
  if (viewMode === 'card' && filterValue) {
    const topSet = getDimensionTopSet(filterDimension);
    result = result.filter((item) => categoryOfDim(item, filterDimension, topSet) === filterValue);
  }
  filteredData = result;
}

// 应用搜索 + 卡片筛选，重置到第一页并渲染
function applyAllFilters() {
  recomputeFilteredData();
  currentPage = 1;
  renderHomepage();
}

// 更新第二个下拉框选项
function updateFilterValueOptions() {
  const options = getFilterOptions(filterDimension);
  filterValueSel.innerHTML = '<option value="">全部</option>'
    + options.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  filterValueSel.value = filterValue;
}

// 执行搜索（过滤 + 分页重置到第 1 页）
function handleSearch(keyword) {
  searchKeyword = keyword.trim();
  periodSortDir = null;
  updatePeriodSortLabel();
  applyAllFilters();
}

// 线上与本地双击统一使用预构建数据；保留 data.json 作为开发回退。
async function loadCards() {
  loadingOverlay.hidden = false;
  try {
    if (Array.isArray(window.__DINGYAO_DATA__)) {
      allData = window.__DINGYAO_DATA__;
    } else {
      const response = await fetch('data.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      allData = await response.json();
    }
    filteredData = allData;
    currentPage = 1;
    updateFilterValueOptions();
    renderHomepage();
    showSiteView();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="8" class="error">数据加载失败：${escapeHtml(error.message)}</td></tr>`;
  } finally {
    loadingOverlay.hidden = true;
  }
}

// ============ 数据统计 ============
// 统计每种「器类（category）」的数量，reduce 成键值对数组
function getCategoryCounts(data) {
  const counts = {};
  data.forEach((item) => {
    const key = item.category || '未知';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).map((name) => ({ name, value: counts[name] }));
}

// 兜底坐标字典：常用国家首都、中国省会及主要城市经纬度
const COORD_FALLBACK = {
  // 国家 / 地区
  '中国': [104.2, 35.8], '伊朗': [51.3, 35.6], '埃及': [31.2, 30.0],
  '日本': [139.6, 35.6], '韩国': [127.0, 37.5], '朝鲜': [125.7, 39.0],
  '俄罗斯': [37.6, 55.7], '蒙古': [106.9, 47.9],
  '越南': [105.8, 21.0], '泰国': [100.5, 13.7], '印度': [77.2, 28.6],
  '巴基斯坦': [73.0, 33.7], '阿富汗': [69.2, 34.5],
  '伊拉克': [44.4, 33.3], '叙利亚': [36.3, 33.5], '土耳其': [32.8, 39.9],
  '沙特阿拉伯': [46.7, 24.6], '以色列': [35.2, 31.8], '约旦': [35.9, 31.9],
  '阿联酋': [54.4, 24.5], '卡塔尔': [51.5, 25.3], '科威特': [47.9, 29.4],
  '希腊': [23.7, 37.9], '意大利': [12.5, 41.9], '法国': [2.3, 48.9],
  '德国': [13.4, 52.5], '英国': [-0.1, 51.5], '美国': [-77.0, 38.9],
  '加拿大': [-75.7, 45.4], '墨西哥': [-99.1, 19.4], '巴西': [-47.9, -15.8],
  '澳大利亚': [149.1, -35.3], '印度尼西亚': [106.8, -6.2],
  '马来西亚': [101.7, 3.1], '新加坡': [103.8, 1.3],
  '缅甸': [96.1, 16.8], '老挝': [102.6, 17.9], '柬埔寨': [104.9, 11.5],
  '菲律宾': [121.0, 14.6], '尼泊尔': [85.3, 27.7],
  '哈萨克斯坦': [71.4, 51.1], '乌兹别克斯坦': [69.2, 41.3],
  '荷兰': [4.9, 52.4], '比利时': [4.3, 50.8], '瑞士': [7.5, 46.9],
  '奥地利': [16.4, 48.2], '西班牙': [-3.7, 40.4], '葡萄牙': [-9.1, 38.7],
  '瑞典': [18.1, 59.3], '挪威': [10.7, 59.9], '丹麦': [12.6, 55.7],
  '波兰': [21.0, 52.2], '乌克兰': [30.5, 50.4],
  '摩洛哥': [-6.8, 34.0], '阿尔及利亚': [3.0, 36.7], '突尼斯': [10.2, 36.8],
  '埃塞俄比亚': [38.7, 9.0], '肯尼亚': [36.8, -1.3], '尼日利亚': [7.5, 9.1],
  '南非': [28.2, -25.7],
  // 中国省份（省会）
  '北京市': [116.4, 39.9], '天津市': [117.2, 39.1], '上海市': [121.5, 31.2],
  '重庆市': [106.5, 29.6], '河北省': [114.5, 38.0], '山西省': [112.5, 37.9],
  '内蒙古自治区': [111.7, 40.8], '辽宁省': [123.4, 41.8],
  '吉林省': [125.3, 43.9], '黑龙江省': [126.6, 45.8],
  '江苏省': [118.8, 32.0], '浙江省': [120.2, 30.3], '安徽省': [117.3, 31.9],
  '福建省': [119.3, 26.1], '江西省': [115.9, 28.7], '山东省': [117.0, 36.7],
  '河南省': [113.6, 34.8], '湖北省': [114.3, 30.6], '湖南省': [113.0, 28.2],
  '广东省': [113.3, 23.1], '广西壮族自治区': [108.3, 22.8],
  '海南省': [110.3, 20.0], '四川省': [104.1, 30.7], '贵州省': [106.6, 26.6],
  '云南省': [102.7, 25.0], '西藏自治区': [91.1, 29.7],
  '陕西省': [108.9, 34.3], '甘肃省': [103.8, 36.1], '青海省': [101.8, 36.6],
  '宁夏回族自治区': [106.2, 38.5], '新疆维吾尔自治区': [87.6, 43.8],
  '香港特别行政区': [114.2, 22.3], '澳门特别行政区': [113.5, 22.2],
  '台湾省': [121.5, 25.0],
  // 中国主要城市
  '保定市': [115.4, 38.8], '石家庄市': [114.5, 38.0], '曲阳县': [114.7, 38.6],
};

// 解析坐标：优先原始经纬度；缺失/为0时按 city -> province -> country 兜底（加随机抖动防重叠）
function resolveCoordinate(item) {
  const lng = Number(item.lng);
  const lat = Number(item.lat);
  if (Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0) {
    return [lng, lat];
  }
  for (const field of ['city', 'province', 'country']) {
    const val = item[field];
    if (val && COORD_FALLBACK[val]) {
      const [flng, flat] = COORD_FALLBACK[val];
      return [flng + (Math.random() - 0.5) * 0.5, flat + (Math.random() - 0.5) * 0.5];
    }
  }
  return null;
}

// 按出土位置聚合：统计每个遗址的瓷器数量，并解析经纬度（缺失时兜底补全）
function getLocationStats(data) {
  const map = {};
  data.forEach((item) => {
    const key = item.location || '未知';
    if (!map[key]) {
      map[key] = {
        name: key, lng: null, lat: null, real: false, count: 0,
        country: item.country || '',
        nature: item.nature || '',
        period: getPeriodLabel(cleanPeriod(item.period)),
      };
    }
    map[key].count += 1;
    if (map[key].real) return; // 已锁定真实坐标

    const coord = resolveCoordinate(item);
    if (!coord) return;

    const lng = Number(item.lng);
    const lat = Number(item.lat);
    const isReal = Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0;

    if (isReal || map[key].lng == null) {
      map[key].lng = coord[0];
      map[key].lat = coord[1];
      map[key].real = isReal;
    }
  });

  return Object.values(map)
    .filter((s) => s.lng != null)
    .map((s) => ({ name: s.name, lng: s.lng, lat: s.lat, count: s.count, country: s.country, nature: s.nature, period: s.period }));
}

// 历史区间映射字典（完整 62 项，绝不遗漏）
const periodMap = {
  "隋晚期": [581, 618], "唐": [618, 907], "唐中期": [700, 850], "唐中期至晚期": [700, 907],
  "唐晚期": [800, 907], "唐晚期至五代": [800, 960], "唐晚期至五代早期": [800, 923],
  "唐至五代": [618, 960], "唐至五代至北宋早期": [618, 1020], "唐晚期至五代、北宋早期": [800, 1020],
  "唐晚期至五代、北宋": [800, 1127], "五代": [907, 960], "五代早期": [907, 930],
  "五代晚期": [930, 960], "五代晚期至北宋早期": [930, 1020], "五代至北宋": [907, 1127],
  "五代至北宋早期": [907, 1020], "五代至宋早期": [907, 1020], "五代至金": [907, 1234],
  "南唐": [937, 975], "南唐晚期": [950, 975], "十国·楚": [907, 951], "北朝至五代": [386, 960],
  "北宋": [960, 1127], "北宋早期": [960, 1020], "北宋中期": [1020, 1080],
  "北宋中期至晚期": [1020, 1127], "北宋晚期": [1080, 1127], "宋": [960, 1279],
  "宋金": [1115, 1279], "宋晚期至金早期": [1100, 1153], "南宋": [1127, 1279],
  "南宋早期": [1127, 1189], "南宋早期至中期": [1127, 1207], "南宋中期": [1189, 1224],
  "南宋中期至晚期": [1189, 1279], "南宋晚期": [1207, 1279], "南宋晚期至元": [1207, 1368],
  "辽": [916, 1125], "辽早期": [916, 982], "辽早期至中期": [916, 1055], "辽中期": [982, 1055],
  "辽中期偏早": [982, 1020], "辽中期至晚期": [982, 1125], "辽晚期": [1055, 1125],
  "辽晚期至金早期": [1055, 1153], "辽至金": [916, 1234], "金": [1115, 1234],
  "金早期": [1115, 1153], "金中期": [1153, 1209], "金中期至晚期": [1153, 1234],
  "金晚期": [1209, 1234], "金晚期至元早期": [1209, 1300], "金、南宋早期": [1115, 1189],
  "金、南宋晚期": [1115, 1279], "金至元": [1115, 1368], "北宋至金": [960, 1234],
  "北宋中期至晚期至金": [1020, 1234], "北宋晚期至金": [1080, 1234], "元": [1271, 1368],
  "元早期": [1271, 1300], "元中期": [1300, 1330]
};

// 清洗 period：去掉中英文括号及其内部文字，并去除首尾空白
function cleanPeriod(raw) {
  if (raw == null) return '';
  return String(raw).replace(/[（(][^）)]*[）)]/g, '').trim();
}

// 统计每个「年代（period）」的瓷器数量，映射到历史区间并按起始年份从小到大排序
function getPeriodGanttData(data) {
  const EXCLUDE = new Set(['', '未知', '不明']);
  const counts = {};
  data.forEach((item) => {
    const key = cleanPeriod(item.period);
    if (EXCLUDE.has(key)) return; // 过滤空值、未知、不明
    if (!periodMap[key]) return;  // 字典中不存在的年代标签忽略
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts)
    .map((name) => ({
      name,
      start: periodMap[name][0],
      end: periodMap[name][1],
      count: counts[name],
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

// 通用字段计数，reduce 成键值对数组（供饼图/柱状图直接使用，不塞原始数据）
function countBy(data, field) {
  const counts = {};
  data.forEach((item) => {
    const key = item[field] != null && item[field] !== '' ? String(item[field]) : '未知';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).map((name) => ({ name, value: counts[name] }));
}

// 按遗址分组计数（清洗括号、过滤空/含「不明」「未知」字眼的项），降序取前 n 名
function getTopLocations(data, n = 5) {
  // 删除中英文括号及其内部文字（如「定窑遗址（曲阳）」→「定窑遗址」）
  const stripParens = (text) => text.replace(/[（(][^）)]*[）)]/g, '').trim();

  const counts = {};
  data.forEach((item) => {
    const raw = item.location != null ? String(item.location).trim() : '';
    const key = stripParens(raw);
    // 过滤空值，以及包含「不明」「未知」字眼的数据项（如「详细地点不明」）
    if (!key || key.includes('不明') || key.includes('未知')) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts)
    .map((name) => ({ name, value: counts[name] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

// 装饰分布：读取 decoration，去括号、按顿号拆分，再按关键词字典模糊归类
function getDecorationDistribution(data) {
  // 模糊归类字典（按顺序匹配，任一关键词命中即归入该类）
  const CATEGORY_RULES = [
    ['素面', ['素面', '无纹', '未装饰']],
    ['刻划类', ['刻', '划']],
    ['印花/模制类', ['印', '模', '压']],
    ['剔花类', ['剔']],
    ['彩绘/书写类', ['彩', '绘', '画', '墨', '书', '字', '点']],
    ['贴塑/浮雕类', ['贴', '塑', '堆', '雕', '镂']],
    ['描金/金银彩类', ['金', '银']],
    ['刮釉填白类', ['刮釉', '填白']],
    ['线纹/凸棱类', ['线', '弦', '棱', '凸']],
    ['锥刺/跳刀类', ['锥刺', '跳刀', '窑变']],
  ];
  const FALLBACK = '其他工艺';

  function classify(text) {
    for (const [category, keywords] of CATEGORY_RULES) {
      for (const kw of keywords) {
        if (text.includes(kw)) return category;
      }
    }
    return FALLBACK;
  }

  const counts = {};
  // 删除中英文括号及其内部文字
  const stripParens = (text) => text.replace(/[（(][^）)]*[）)]/g, '').trim();

  data.forEach((item) => {
    const raw = item.decoration != null ? String(item.decoration).trim() : '';
    if (!raw || raw === '不明') return; // 过滤空值、不明

    const cleaned = stripParens(raw);
    cleaned.split('、').forEach((part) => {
      const key = part.trim();
      if (!key || key === '不明') return;
      const category = classify(key); // 关键词模糊归类
      counts[category] = (counts[category] || 0) + 1;
    });
  });

  return Object.keys(counts)
    .map((name) => ({ name, value: counts[name] }))
    .sort((a, b) => b.value - a.value);
}

// ============ ECharts 图表 ============
function renderCharts() {
  if (typeof echarts === 'undefined') {
    dataView.querySelector('.charts-grid').innerHTML =
      '<p class="error">ECharts 库未加载，请检查网络后重试。</p>';
    chartsRendered = true;
    return;
  }
  renderCategoryChart();
  renderYearChart();
  renderLocationChart(); // 内部异步加载地图
  renderGlazeChart();
  renderBodyColorChart();
  renderTechniqueChart();
  renderTopSitesChart();
  chartsRendered = true;
}

// 非地图图表统一使用低饱和釉色；地图散点保留原有的红蓝分类编码。
const CHART_COLORS = {
  text: '#6f746c',
  main: '#2d302c',
  border: '#d8ddd4',
  grid: '#edf0eb',
  accent: '#73857a',
  area: 'rgba(115, 133, 122, 0.24)',
  porcelain: '#fbfaf6',
};

// 柱状图：器类数量统计
function renderCategoryChart() {
  const EXCLUDED = ['未知', '瓷片', '残片', '白瓷（多组合）', '出土器物组合', '白瓷（多器形）'];
  const all = getCategoryCounts(allData);

  // 提前剔除特定项，直接计入"其他器类"
  let excludedSum = 0;
  const normal = [];
  all.forEach((d) => {
    if (EXCLUDED.includes(d.name)) {
      excludedSum += d.value;
    } else {
      normal.push(d);
    }
  });

  // 剩余正常器类按数量降序
  normal.sort((a, b) => b.value - a.value);

  // 取前 25 名
  const top = normal.slice(0, 25);
  const rest = normal.slice(25);

  // 第 26 名之后 + 剔除项合并为"其他器类"
  const restSum = rest.reduce((sum, d) => sum + d.value, 0) + excludedSum;
  if (restSum > 0) {
    top.push({ name: '其他器类', value: restSum });
  }

  const categories = top.map((d) => d.name);
  const values = top.map((d) => d.value);

  categoryChart = echarts.init(document.getElementById('category-chart'));
  categoryChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 40, right: 24, top: 30, bottom: 120 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: CHART_COLORS.text, interval: 0, rotate: 0, fontSize: 10 },
      axisLine: { lineStyle: { color: CHART_COLORS.border } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: CHART_COLORS.text },
      splitLine: { lineStyle: { color: CHART_COLORS.grid } },
    },
    series: [
      {
        name: '数量',
        type: 'bar',
        data: values,
        barWidth: '40%',
        itemStyle: { color: CHART_COLORS.accent, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: CHART_COLORS.main },
      },
    ],
  });
}

// 加载世界地图 GeoJSON（带备用源）
let worldGeoJson = null;
async function loadWorldMap() {
  if (worldGeoJson) return worldGeoJson;

  const urls = [
    'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json',
    'https://fastly.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      worldGeoJson = await res.json();
      return worldGeoJson;
    } catch (e) {
      // 尝试下一个源
    }
  }
  throw new Error('无法加载世界地图数据，请检查网络');
}

// 加载中国地图 GeoJSON（带备用源，用于叠加省份边界）
let chinaGeoJson = null;
async function loadChinaMap() {
  if (chinaGeoJson) return chinaGeoJson;

  const urls = [
    'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/china.json',
    'https://fastly.jsdelivr.net/npm/echarts@4.9.0/map/json/china.json',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      chinaGeoJson = await res.json();
      return chinaGeoJson;
    } catch (e) {
      // 尝试下一个源
    }
  }
  throw new Error('无法加载中国地图数据，请检查网络');
}

// 地图状态
let mapView = 'world';        // world | china
let mapChinaStats = [];       // 中国数据（用于边界叠加判断）
let currentNature = '';       // 当前性质筛选（空 = 全部；选项动态提取）
let currentPeriod = '全部';    // 全部 | 唐五代 | 北宋 | 南宋 | 金 | 元

// 核心年代（时间轴节点）
const PERIOD_LIST = ['唐五代', '北宋', '南宋', '金', '元'];

// 颜色：生产（窑址）=红色系，消费（流通地）=蓝色系，按年代深浅（早→晚由浅到深）
const PRODUCTION_COLORS = {
  '唐五代': '#f2c4c4', '北宋': '#e09090', '南宋': '#cc5b5b', '金': '#a83232', '元': '#6b1515',
};
const CONSUMPTION_COLORS = {
  '唐五代': '#c4d9e6', '北宋': '#90b8d9', '南宋': '#5b8cc4', '金': '#38639e', '元': '#1a3a6b',
};
const OTHER_COLORS = {
  '唐五代': '#b8c4c4', '北宋': '#9aacac', '南宋': '#7d9494', '金': '#5e7a7a', '元': '#48605f',
};

function getScatterColor(nature, period) {
  const n = nature || '';
  if (n.includes('生产')) return PRODUCTION_COLORS[period] || '#b85c5c';
  if (n.includes('消费')) return CONSUMPTION_COLORS[period] || '#4a6b8c';
  return OTHER_COLORS[period] || '#6f9eaf';
}

// 根据清洗后的年代标签判定所属年代（复用 periodMap 的 key，前缀匹配起始朝代）
function getPeriodLabel(key) {
  if (!key || key === '不明' || key === '未知') return '未分类';
  if (key.startsWith('元')) return '元';
  if (key.startsWith('辽')) return '北宋';  // 辽并入北宋
  if (key.startsWith('金') || key.startsWith('宋金')) return '金';
  if (key.startsWith('南宋')) return '南宋';
  if (key.startsWith('北宋') || key.startsWith('宋')) return '北宋';
  if (key.startsWith('唐') || key.startsWith('五代') || key.startsWith('隋') || key.startsWith('南唐') || key.startsWith('十国') || key.startsWith('北朝')) return '唐五代';
  return '未分类';
}

// 根据视图 + 性质 + 年代过滤数据，聚合成散点
function getMapScatterData(view) {
  let items = allData;
  if (view === 'china') items = items.filter((item) => item.country === '中国');
  if (currentNature) items = items.filter((item) => item.nature === currentNature);
  if (currentPeriod !== '全部') items = items.filter((item) => getPeriodLabel(cleanPeriod(item.period)) === currentPeriod);
  return getLocationStats(items);
}

// 统一更新地图（世界/中国 + 性质 + 年代）
function updateMap(view) {
  if (view != null) mapView = view;
  if (!locationChart) return;

  const isChina = mapView === 'china';
  const stats = getMapScatterData(mapView);

  // 世界视图叠加中国省份边界；中国视图直接用 china 地图本身展示省份边界
  const series = [];
  if (!isChina && mapChinaStats.length) {
    series.push({
      name: '中国省份边界',
      type: 'map',
      map: 'china',
      geoIndex: 0,
      silent: true,
      itemStyle: {
        areaColor: 'transparent',
        borderColor: '#6f9eaf',
        borderType: 'dashed',
        borderWidth: 1,
      },
      emphasis: { disabled: true },
      select: { disabled: true },
      label: { show: false },
      zlevel: 1,
    });
  }
  series.push({
    name: '出土位置',
    type: 'scatter',
    coordinateSystem: 'geo',
    geoIndex: 0,
    data: stats.map((s) => ({
      name: s.name,
      value: [s.lng, s.lat, s.count],
      nature: s.nature,
      period: s.period,
    })),
    symbolSize: (value) => Math.min(12, 8 + value[2] * 0.5),
    itemStyle: {
      color: (params) => getScatterColor(params.data.nature, params.data.period),
    },
    emphasis: { scale: true, itemStyle: { color: '#d97736' } },
    label: { show: false },
    zlevel: 2,
  });

  locationChart.setOption(
    {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
            const nature = (params.data && params.data.nature) || '未分类';
            const period = (params.data && params.data.period) || '未分类';
            return `遗址：${params.name}<br/>性质：${nature}<br/>所属年代：${period}`;
          }
          return params.name;
        },
      },
      geo: {
        map: isChina ? 'china' : 'world',
        roam: true,
        center: isChina ? [104, 35] : [70, 30],
        zoom: isChina ? 1.5 : 1.2,
        scaleLimit: { min: 1, max: 8 },
        itemStyle: {
          areaColor: '#dce8e8',
          borderColor: '#6f9eaf',
        },
        emphasis: {
          itemStyle: { areaColor: '#b3d4d4' },
          label: { show: false },
        },
      },
      series,
    },
    true
  );
}

// 动态生成性质下拉选项（遍历 allData 提取真实值，前面保留「全部」）
function populateNatureSelect() {
  if (!natureSelect) return;
  const set = new Set();
  allData.forEach((item) => {
    const v = item.nature != null ? String(item.nature).trim() : '';
    if (v) set.add(v);
  });
  natureSelect.innerHTML = '<option value="">全部</option>'
    + Array.from(set).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

// 地图散点图：出土位置分布（世界 / 中国视图切换）
async function renderLocationChart() {
  const el = document.getElementById('location-chart');

  try {
    const geoJson = await loadWorldMap();
    echarts.registerMap('world', geoJson);

    // 中国省份地图（可选，加载失败仅影响中国视图与世界视图的边界叠加层）
    try {
      const chinaJson = await loadChinaMap();
      echarts.registerMap('china', chinaJson);
    } catch (e) {
      // 忽略，中国视图将不可用
    }

    mapChinaStats = getLocationStats(allData).filter((s) => s.country === '中国');

    locationChart = echarts.init(el);
    populateNatureSelect();
    updateMap(mapView);
  } catch (error) {
    el.innerHTML = `<p class="error">地图加载失败：${escapeHtml(error.message)}</p>`;
  }
}

// 世界 / 中国视图切换按钮
if (mapWorldBtn && mapChinaBtn) {
  mapWorldBtn.addEventListener('click', () => {
    mapWorldBtn.classList.add('active');
    mapChinaBtn.classList.remove('active');
    updateMap('world');
  });
  mapChinaBtn.addEventListener('click', () => {
    mapChinaBtn.classList.add('active');
    mapWorldBtn.classList.remove('active');
    updateMap('china');
  });
}

// 性质筛选（左上角下拉框）
const natureSelect = document.getElementById('map-nature-select');
if (natureSelect) {
  natureSelect.addEventListener('change', () => {
    currentNature = natureSelect.value;
    updateMap();
  });
}

// 底部时间轴（年代）
const timeline = document.getElementById('map-timeline');
if (timeline) {
  timeline.addEventListener('click', (event) => {
    const btn = event.target.closest('.map-timeline-node');
    if (!btn) return;
    timeline.querySelectorAll('.map-timeline-node').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    updateMap();
  });
}

// 计算每个历史年份的重叠器物总数（公元 500 - 1400，步长 1）
function getYearOverlapData(periods) {
  const result = [];
  for (let year = 500; year <= 1400; year++) {
    let total = 0;
    for (const p of periods) {
      if (year >= p.start && year <= p.end) {
        total += p.count;
      }
    }
    result.push({ year, total });
  }
  return result;
}

// 年代甘特图（上）+ 流线面积图（下）：X 轴时间刻度对齐，容器高度自适应 + 200px
function renderYearChart() {
  const periods = getPeriodGanttData(allData);
  const yearToTs = (year) => Date.UTC(year, 0, 1);

  // 最大数量，用于条形粗细占比
  const maxCount = periods.length ? Math.max(...periods.map((d) => d.count)) : 1;

  // 重叠器物总数（面积图数据）
  const overlap = getYearOverlapData(periods);
  const areaData = overlap.map((d) => [yearToTs(d.year), d.total]);

  // 高度：甘特图（条目数*25px + 100px）+ 下方面积图（200px）
  const chartEl = document.getElementById('year-chart');
  const ganttHeight = periods.length * 25;
  const chartHeight = ganttHeight + 100 + 200;
  chartEl.style.height = `${chartHeight}px`;

  yearChart = echarts.init(chartEl);
  yearChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.seriesType === 'custom') {
          const v = params.value;
          return `${v[4]}<br/>年代区间：${new Date(v[1]).getFullYear()} - ${new Date(v[2]).getFullYear()}<br/>数量：${v[3]}`;
        }
        if (params.seriesType === 'line') {
          const year = new Date(params.value[0]).getFullYear();
          return `当前年份：${year}年<br/>重叠器物总数：${params.value[1]}件`;
        }
        return params.name;
      },
    },
    grid: [
      { left: 180, right: 60, top: 50, height: ganttHeight },
      { left: 180, right: 60, top: 50 + ganttHeight + 40, height: 160 },
    ],
    xAxis: [
      {
        type: 'time',
        gridIndex: 0,
        position: 'top',
        min: yearToTs(500),
        max: yearToTs(1400),
        axisLabel: {
          color: CHART_COLORS.text,
          formatter: (value) => `${new Date(value).getFullYear()}`,
        },
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        splitLine: { show: true, lineStyle: { color: CHART_COLORS.grid } },
      },
      {
        type: 'time',
        gridIndex: 1,
        position: 'bottom',
        min: yearToTs(500),
        max: yearToTs(1400),
        axisLabel: {
          color: CHART_COLORS.text,
          formatter: (value) => `${new Date(value).getFullYear()}`,
        },
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        splitLine: { show: true, lineStyle: { color: CHART_COLORS.grid } },
      },
    ],
    yAxis: [
      {
        type: 'category',
        gridIndex: 0,
        inverse: true,
        data: periods.map((d) => d.name),
        axisLabel: { color: CHART_COLORS.text },
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
      },
      {
        type: 'value',
        gridIndex: 1,
        axisLabel: { color: CHART_COLORS.text },
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        splitLine: { lineStyle: { color: CHART_COLORS.grid } },
      },
    ],
    series: [
      {
        name: '年代',
        type: 'custom',
        xAxisIndex: 0,
        yAxisIndex: 0,
        renderItem: (params, api) => {
          const catIndex = api.value(0);
          const count = api.value(3);
          const start = api.coord([api.value(1), catIndex]);
          const end = api.coord([api.value(2), catIndex]);
          const bandHeight = api.size([0, 1])[1];
          const rowHeight = bandHeight * 0.8;
          // 条形粗细体现数量：数量越多越粗，最少不低于 3px
          const actualHeight = Math.max(3, rowHeight * (count / maxCount));
          // 手动裁剪到网格范围内，防止「北朝至五代」等超出 X 轴范围的条形越界
          const gridLeft = params.coordSys.x;
          const gridRight = params.coordSys.x + params.coordSys.width;
          const x = Math.max(start[0], gridLeft);
          const x2 = Math.min(end[0], gridRight);
          if (x2 - x <= 0) return null;
          return {
            type: 'rect',
            shape: {
              x,
              y: start[1] - actualHeight / 2,
              width: x2 - x,
              height: actualHeight,
            },
            style: { fill: CHART_COLORS.accent },
          };
        },
        encode: { x: [1, 2], y: 0 },
        data: periods.map((d, i) => [
          i,
          yearToTs(d.start),
          yearToTs(d.end),
          d.count,
          d.name,
        ]),
      },
      {
        name: '重叠器物总数',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        lineStyle: { color: CHART_COLORS.accent, width: 2 },
        areaStyle: { color: CHART_COLORS.area },
        itemStyle: { color: CHART_COLORS.accent },
        data: areaData,
      },
    ],
  });
}

// 白釉、青白釉、青釉、黑釉、酱釉与茶叶末釉的低饱和色阶。
const PIE_COLORS = ['#d8d1bb', '#aab9b3', '#879b90', '#566159', '#7b6b5d', '#7d8068', '#c5cbc2', '#e1e3dc'];

// 釉色分布：直接读取 glaze_color 原始文本统计，前 15 名 + 合并「其他釉色」
function getGlazeDistribution(data) {
  const counts = {};
  data.forEach((item) => {
    const key = item.glaze_color != null ? String(item.glaze_color).trim() : '';
    if (!key || key === '不明') return; // 过滤空值、不明
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.keys(counts)
    .map((name) => ({ name, value: counts[name] }))
    .sort((a, b) => b.value - a.value);

  const top = sorted.slice(0, 15);
  const rest = sorted.slice(15);
  const restSum = rest.reduce((sum, d) => sum + d.value, 0);
  if (restSum > 0) {
    top.push({ name: '其他釉色', value: restSum });
  }
  return top;
}

// 胎色分布：直接读取 body_color 原始文本统计，前 15 名 + 合并「其他胎色」
function getBodyColorDistribution(data) {
  const counts = {};
  data.forEach((item) => {
    const key = item.body_color != null ? String(item.body_color).trim() : '';
    if (!key || key === '不明') return; // 过滤空值、不明
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.keys(counts)
    .map((name) => ({ name, value: counts[name] }))
    .sort((a, b) => b.value - a.value);

  const top = sorted.slice(0, 15);
  const rest = sorted.slice(15);
  const restSum = rest.reduce((sum, d) => sum + d.value, 0);
  if (restSum > 0) {
    top.push({ name: '其他胎色', value: restSum });
  }
  return top;
}

// 釉色分布饼图
function renderGlazeChart() {
  const data = getGlazeDistribution(allData);
  glazeChart = echarts.init(document.getElementById('glaze-chart'));
  glazeChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}（{d}%）' },
    legend: { bottom: 0, textStyle: { color: CHART_COLORS.text } },
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '44%'],
        data,
        itemStyle: { borderColor: CHART_COLORS.porcelain, borderWidth: 1 },
        label: { color: CHART_COLORS.main, formatter: '{b} {d}%' },
      },
    ],
    color: PIE_COLORS,
  });
}

// 胎色分布饼图
function renderBodyColorChart() {
  const data = getBodyColorDistribution(allData);
  bodyColorChart = echarts.init(document.getElementById('body-color-chart'));
  bodyColorChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}（{d}%）' },
    legend: { bottom: 0, textStyle: { color: CHART_COLORS.text } },
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '44%'],
        data,
        itemStyle: { borderColor: CHART_COLORS.porcelain, borderWidth: 1 },
        label: { color: CHART_COLORS.main, formatter: '{b} {d}%' },
      },
    ],
    color: PIE_COLORS,
  });
}

// 装饰分布饼图
function renderTechniqueChart() {
  const data = getDecorationDistribution(allData);
  techniqueChart = echarts.init(document.getElementById('technique-chart'));
  techniqueChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}（{d}%）' },
    legend: {
      type: 'scroll',
      bottom: 0,
      textStyle: { color: CHART_COLORS.text },
    },
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '44%'],
        data,
        minShowLabelAngle: 5,
        itemStyle: { borderColor: CHART_COLORS.porcelain, borderWidth: 1 },
        label: { color: CHART_COLORS.main, formatter: '{b} {d}%' },
      },
    ],
    color: PIE_COLORS,
  });
}

// 出土遗址 Top 5 横向条形图
function renderTopSitesChart() {
  const data = getTopLocations(allData, 5);
  topSitesChart = echarts.init(document.getElementById('top-sites-chart'));
  topSitesChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 140, right: 50, top: 20, bottom: 30 },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: CHART_COLORS.text },
      splitLine: { lineStyle: { color: CHART_COLORS.grid } },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      inverse: true,
      axisLabel: { color: CHART_COLORS.text },
      axisLine: { lineStyle: { color: CHART_COLORS.border } },
    },
    series: [
      {
        name: '数量',
        type: 'bar',
        data: data.map((d) => d.value),
        barWidth: '60%',
        itemStyle: { color: CHART_COLORS.accent, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: CHART_COLORS.main },
      },
    ],
  });
}

// ============ 视图切换 ============
function setVisible(view) {
  siteView.hidden = view !== 'site';
  dataView.hidden = view !== 'data';
  toggleBtn.textContent = view === 'data' ? '返回首页' : '查看数据整理';
}

function showSiteView() {
  setVisible('site');
}

function showDataView() {
  setVisible('data');
  if (!chartsRendered) {
    renderCharts();
  } else {
    resizeCharts();
  }
}

function resizeCharts() {
  if (categoryChart) categoryChart.resize();
  if (locationChart) locationChart.resize();
  if (yearChart) yearChart.resize();
  if (glazeChart) glazeChart.resize();
  if (bodyColorChart) bodyColorChart.resize();
  if (techniqueChart) techniqueChart.resize();
  if (topSitesChart) topSitesChart.resize();
}

// 视图切换按钮
listViewBtn.addEventListener('click', () => switchView('list'));
cardViewBtn.addEventListener('click', () => switchView('card'));

// 全局搜索框（300ms 防抖，避免高频重渲染）
let searchTimer = null;
homeSearchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => handleSearch(homeSearchInput.value), 300);
});

// 列表视图「详情」按钮（事件委托）
tableBody.addEventListener('click', (event) => {
  const btn = event.target.closest('.btn-detail');
  if (!btn) return;
  event.stopPropagation();
  openCardModal(btn.dataset.index);
});

// 顶部按钮：数据整理 ↔ 首页
toggleBtn.addEventListener('click', () => {
  if (!dataView.hidden) {
    showSiteView();
  } else {
    showDataView();
  }
});

// 返回首页按钮（数据整理页）
backBtn.addEventListener('click', showSiteView);

// 分页按钮 + 页码跳转
homePrev.addEventListener('click', () => goToPage(currentPage - 1));
homeNext.addEventListener('click', () => goToPage(currentPage + 1));
pageJumpBtn.addEventListener('click', () => goToPage(pageJumpInput.value));
pageJumpInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') goToPage(pageJumpInput.value);
});

// 窗口尺寸变化时自适应图表（防抖，避免高频重绘）
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!dataView.hidden) {
      resizeCharts();
    }
  }, 200);
});

// ============ Markdown 渲染（优先 marked.js，降级到极简渲染）============
function renderMarkdown(text) {
  // 过滤 Markdown 图片语法，避免加载报告中缺失的插图（保证纯文字阅读）
  const src = (text || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  // 优先使用 marked.js 渲染
  if (typeof marked !== 'undefined') {
    return marked.parse(src);
  }
  // 降级方案：极简 Markdown 渲染
  const escaped = escapeHtml(src);
  const lines = escaped.split('\n');
  let html = '';
  let para = [];

  const flush = () => {
    if (para.length) {
      html += '<p>' + para.join('<br>') + '</p>';
      para = [];
    }
  };

  lines.forEach((line) => {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1].length;
      html += `<h${level + 2}>${h[2]}</h${level + 2}>`;
    } else if (line.trim() === '') {
      flush();
    } else {
      para.push(line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));
    }
  });
  flush();
  return html;
}

const offlineReferenceLoads = new Map();

function loadOfflineReference(item) {
  const key = item.offline_reference_key;
  const bundlePath = item.offline_reference_bundle;
  if (!key || !bundlePath) {
    return Promise.reject(new Error('该器物未配置离线文献包'));
  }
  const store = window.__DINGYAO_REFERENCE_STORE__ || {};
  if (typeof store[key] === 'string') return Promise.resolve(store[key]);
  if (offlineReferenceLoads.has(key)) return offlineReferenceLoads.get(key);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = bundlePath;
    script.onload = () => {
      script.remove();
      const text = window.__DINGYAO_REFERENCE_STORE__?.[key];
      if (typeof text === 'string') resolve(text);
      else reject(new Error('离线文献包内容无效'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`离线文献包加载失败：${bundlePath}`));
    };
    document.head.appendChild(script);
  });
  offlineReferenceLoads.set(key, promise);
  promise.catch(() => offlineReferenceLoads.delete(key));
  return promise;
}

// 线上与本地双击均按需加载去重文献包；保留原始 Markdown 作为开发回退。
async function loadMarkdown(item) {
  if (item.offline_reference_key && item.offline_reference_bundle) {
    try {
      return await loadOfflineReference(item);
    } catch (offlineError) {
      if (window.location.protocol === 'file:') throw offlineError;
    }
  }
  if (item.md_path) {
    const res = await fetch(item.md_path);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  }
  if (item.md_text) {
    return item.md_text;
  }
  throw new Error('未配置 md_path 或 md_text');
}

// 将 dimensions 嵌套对象格式化为易读字符串：高 5.2 cm，口径 14.8 cm，足径 5.6 cm
function formatDimensions(dim) {
  if (!dim || typeof dim !== 'object') return '';
  const unit = dim.unit || 'cm';
  const parts = [];
  const addPart = (label, value) => {
    const text = String(value ?? '').trim();
    if (!text || /^(?:不明|未知|未详|无资料|[-—])$/.test(text)) return;
    const suffix = /(?:厘米|cm)$/i.test(text) ? '' : ` ${unit}`;
    parts.push(`${label} ${text}${suffix}`);
  };
  addPart('高', dim.height);
  addPart('口径', dim.mouth_diameter);
  addPart('足径', dim.foot_diameter);
  return parts.join('，');
}

// 渲染详情弹窗右侧的四个板块
function renderDetailSections(item) {
  const sections = [
    {
      title: '造型与尺寸',
      searchable: true,
      fields: [
        ['period', '时代', item.period],
        ['mouth', '口沿', item.mouth],
        ['belly', '腹部', item.belly],
        ['foot', '足部', item.foot],
        ['overall_shape', '整体造型', item.overall_shape],
        ['dimensions', '尺寸', formatDimensions(item.dimensions)],
      ],
    },
    {
      title: '胎釉特征',
      searchable: true,
      fields: [
        ['body_texture', '胎质', item.body_texture],
        ['body_color', '胎色', item.body_color],
        ['glaze_color', '釉色', item.glaze_color],
        ['glaze_extent', '施釉范围', item.glaze_extent],
        ['glaze_features', '釉面特征', item.glaze_features],
        ['decoration', '装饰', item.decoration],
      ],
    },
    {
      title: '工艺与装烧',
      searchable: true,
      fields: [
        ['forming', '成型工艺', item.forming],
        ['decorating_technique', '装饰技法', item.decorating_technique],
        ['glazing_technique', '施釉工艺', item.glazing_technique],
        ['firing_technique', '装烧工艺', item.firing_technique],
      ],
    },
    {
      title: '出土与保存',
      searchable: true,
      fields: [
        ['location', '出土位置', item.location],
        ['year', '出土年份', item.year],
        ['context', '出土背景', item.context],
        ['condition', '保存状况', item.condition],
      ],
    },
    {
      title: '参考文献',
      searchable: false,
      fields: [
        ['bibliography', '参考文献', item.bibliography],
      ],
    },
  ];

  return sections
    .map((section) => {
      const rows = section.fields
        .filter(([, , value]) => value != null && String(value).trim() !== '')
        .map(([key, label, value]) => {
          const text = String(value).trim();
          const canSearch = section.searchable && !/^(?:不明|未知|未详|无资料|[-—])$/.test(text);
          const field = canSearch
            ? `<button class="searchable-field" type="button" data-field-key="${escapeHtml(key)}" data-search-value="${escapeHtml(text)}" title="在文献原文中定位">${escapeHtml(text)}</button>`
            : `<span class="detail-value">${escapeHtml(text)}</span>`;
          return `<li><span class="detail-label">${label}：</span>${field}</li>`;
        })
        .join('');
      if (!rows) return '';
      return `<div class="detail-section">
        <h4 class="detail-section-title">${section.title}</h4>
        <ul class="detail-list">${rows}</ul>
      </div>`;
    })
    .join('');
}

// ============ 卡片详情弹窗 ============
let modalRequestId = 0; // 请求序号，避免快速切换卡片时旧请求覆盖新内容
let activeModalItem = null;
let activeSourceMatcher = null;

async function openCardModal(index) {
  const item = allData[Number(index)];
  if (!item) return;

  const requestId = ++modalRequestId;
  activeModalItem = item;
  activeSourceMatcher = null;

  modalTitle.textContent = item.name;

  // 先展示弹窗与器物详情，文献原文在左栏异步加载。
  modalMdText.innerHTML = '<p class="placeholder">正在加载文献…</p>';
  if (item.image) {
    modalImage.innerHTML = `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />`;
  } else {
    modalImage.innerHTML = '<p class="placeholder">暂无图片</p>';
  }

  modalSections.innerHTML = renderDetailSections(item);

  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  modalMdText.parentElement.scrollTop = 0;
  modalSections.parentElement.scrollTop = 0;

  try {
    const md = await loadMarkdown(item);
    if (requestId !== modalRequestId) return; // 过期请求，忽略
    modalMdText.innerHTML = renderMarkdown(md);
    activeSourceMatcher = createSourceMatcherContext(item);
    updateSearchableFieldAvailability();
    modalMdText.parentElement.scrollTop = 0;
  } catch (error) {
    if (requestId !== modalRequestId) return; // 过期请求，忽略
    modalMdText.innerHTML = `<p class="error">文献加载失败：${escapeHtml(error.message)}</p>`;
  }
}

function closeCardModal() {
  modalRequestId += 1;
  activeModalItem = null;
  activeSourceMatcher = null;
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeCardModal);

// 点击遮罩空白处关闭
modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) closeCardModal();
});

// 按 Esc 关闭
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalOverlay.hidden) closeCardModal();
});

// 图片加载失败时回退为占位（error 事件需在捕获阶段监听）
document.addEventListener('error', (event) => {
  const img = event.target;
  if (img.tagName !== 'IMG') return;
  const container = img.closest('.card-back') || img.closest('.modal-image');
  if (container) {
    container.innerHTML = '<p class="placeholder">图片占位</p>';
  }
}, true);

// ============ 字段点击 → 文献相关段落定位 ============
const FIELD_ALIASES = {
  period: ['时代', '时期', '年代'],
  mouth: ['口沿', '口部', '器口', '唇口'],
  belly: ['腹部', '器腹', '腹'],
  foot: ['足部', '底足', '圈足', '器底'],
  overall_shape: ['造型', '形制', '器形'],
  dimensions: ['高', '口径', '足径', '底径', '腹径'],
  body_texture: ['胎质', '胎体'],
  body_color: ['胎色'],
  glaze_color: ['釉色', '施釉'],
  glaze_extent: ['施釉', '满釉', '无釉', '刮釉'],
  glaze_features: ['釉面', '开片', '积釉', '流釉'],
  decoration: ['纹饰', '装饰', '图案'],
  forming: ['成型', '拉坯', '模制'],
  decorating_technique: ['装饰', '刻花', '划花', '印花'],
  glazing_technique: ['施釉', '浸釉', '淋釉'],
  firing_technique: ['装烧', '覆烧', '支烧', '垫烧'],
  location: ['出土', '遗址', '墓', '窑址'],
  year: ['出土', '年', '年代'],
  context: ['出土', '地层', '墓葬', '窖藏'],
  condition: ['完整', '残', '保存', '修复'],
};

function normalizeSourceText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/靑/g, '青')
    .replace(/厘米|cm/gi, 'cm')
    .replace(/[—–−]/g, '-')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function getSearchTerms(value, fieldKey) {
  const text = String(value || '').trim();
  const periodTerms = fieldKey === 'period'
    ? {
      唐: ['唐代'], 五代: ['五代'], 辽: ['辽代'], 宋: ['宋代'], 北宋: ['北宋'],
      南宋: ['南宋'], 金: ['金代'], 元: ['元代'], 明: ['明代'], 清: ['清代'],
    }[text] || []
    : [];
  const spouseTombIndex = text.indexOf('夫妇合葬墓');
  const domainTerms = [
    ...(text.match(/[白青黑酱黄褐绿灰红紫]{1,4}釉/g) || []),
    ...(text.match(/泛[白青黑黄褐绿灰红紫]{1,4}/g) || []),
    ...(text.match(/[白青黑黄褐绿灰红紫]{1,4}胎/g) || []),
  ];
  const locationTerms = fieldKey === 'location'
    ? [
      ...text.split(/(?<=[省市区县镇乡村])/),
      ...(spouseTombIndex >= 0 ? [text.slice(Math.max(0, spouseTombIndex - 3), spouseTombIndex + 5)] : []),
      ...(text.match(/[一-鿿]{2,8}(?:夫妇合葬墓|合葬墓|塔基|遗址|窑址|墓)$/g) || []),
    ]
    : [];
  const dimensionTerms = fieldKey === 'dimensions'
    ? [...text.matchAll(/(高|口径|足径)\s*([^，,]+)/g)].flatMap((match) => {
      const number = match[2].match(/\d+(?:\.\d+)?(?:\s*[~～-]\s*\d+(?:\.\d+)?)?/);
      if (!number) return [];
      const labels = match[1] === '足径' ? ['足径', '底径'] : [match[1]];
      return labels.flatMap((label) => [
        `${label}${number[0]}`,
        `${label} ${number[0]}`,
        `${label}${number[0]}厘米`,
        `${label} ${number[0]}厘米`,
      ]);
    })
    : [];
  const terms = [
    text,
    ...periodTerms,
    ...dimensionTerms,
    ...text.split(/[，,、；;。（）()]+/),
    ...domainTerms,
    ...locationTerms,
  ]
    .map((term) => term.trim())
    .filter((term) => {
      const normalized = normalizeSourceText(term);
      return normalized.length >= 2 && !/^(?:不明|未知|未详|无资料)$/.test(normalized);
    });
  return [...new Map(terms.map((term) => [normalizeSourceText(term), term])).values()]
    .sort((a, b) => normalizeSourceText(b).length - normalizeSourceText(a).length);
}

function getStrongCodeTerms(item) {
  if (!item) return [];
  const source = [item.context, item.name, item.research].filter(Boolean).join(' ');
  const codeTerms = extractCodeTermsFromText(source)
    .map((term) => term.replace(/[:：∶.\-－]+$/g, ''))
    .filter((term) => /[A-Za-z]/.test(term) && /\d/.test(term));
  return [...new Map(codeTerms.map((term) => [normalizeSourceText(term), term])).values()]
    .sort((a, b) => normalizeSourceText(b).length - normalizeSourceText(a).length);
}

function extractCodeTermsFromText(value) {
  return String(value || '').match(/[A-Za-z0-9]+[A-Za-z0-9①-⑳⒈-⒛扩东西南北:：∶.\-－]{1,39}/g) || [];
}

function getItemFingerprintTerms(item) {
  if (!item) return [];
  const terms = [];
  const source = [item.name, item.research].filter(Boolean).join(' ');
  for (const match of source.matchAll(/[（(]([^）)]+)[）)]/g)) {
    terms.push(...match[1].split(/[，,、；;]+/));
  }
  if (item.name) terms.push(item.name.replace(/[（(][^）)]+[）)]/g, '').trim());
  [
    item.mouth,
    item.belly,
    item.foot,
    item.overall_shape,
    formatDimensions(item.dimensions),
    item.body_texture,
    item.body_color,
    item.glaze_color,
    item.glaze_extent,
    item.glaze_features,
    item.decoration,
    item.forming,
    item.decorating_technique,
    item.glazing_technique,
    item.firing_technique,
    item.condition,
  ].forEach((value) => {
    if (value && normalizeSourceText(value).length >= 4) terms.push(value);
  });
  return [...new Map(terms
    .map((term) => [normalizeSourceText(term), String(term).trim()])
    .filter(([normalized]) => normalized.length >= 4)).values()]
    .sort((a, b) => normalizeSourceText(b).length - normalizeSourceText(a).length);
}

function getItemFingerprintFields(item) {
  if (!item) return [];
  const name = item.name ? item.name.replace(/[（(][^）)]+[）)]/g, '').trim() : '';
  const values = {
    name,
    mouth: item.mouth,
    belly: item.belly,
    foot: item.foot,
    overall_shape: item.overall_shape,
    dimensions: formatDimensions(item.dimensions),
    body_texture: item.body_texture,
    body_color: item.body_color,
    glaze_color: item.glaze_color,
    glaze_extent: item.glaze_extent,
    glaze_features: item.glaze_features,
    decoration: item.decoration,
    forming: item.forming,
    decorating_technique: item.decorating_technique,
    glazing_technique: item.glazing_technique,
    firing_technique: item.firing_technique,
    condition: item.condition,
  };
  const weights = {
    name: 6,
    decoration: 5,
    dimensions: 4,
    overall_shape: 4,
    mouth: 3,
    belly: 3,
    foot: 3,
    body_texture: 2,
    glaze_features: 2,
    forming: 2,
    condition: 1,
  };
  return Object.entries(values)
    .filter(([, value]) => value && !/^(?:不明|未知|未详|无资料|[-—])$/.test(String(value).trim()))
    .map(([key, value]) => ({
      key,
      weight: weights[key] || 1,
      terms: getSearchTerms(value, key)
        .map((term) => ({ term, normalized: normalizeSourceText(term) }))
        .filter(({ normalized }) => normalized.length >= 2),
    }))
    .filter((field) => field.terms.length > 0);
}

const GENERIC_FINGERPRINT_TERMS = new Set([
  '白釉', '白胎', '灰白胎', '素面', '刻花', '划花', '印花', '覆烧', '圈足',
  '敞口', '侈口', '弧腹', '残', '完整', '不明', '未知',
].map(normalizeSourceText));

function sourceBlocks() {
  return [...modalMdText.querySelectorAll('p, li, tr, h1, h2, h3, h4, h5, h6')]
    .filter((element) => normalizeSourceText(element.textContent).length >= 2);
}

function createSourceMatcherContext(item) {
  const blocks = sourceBlocks();
  const normalizedBlocks = blocks.map((block) => normalizeSourceText(block.textContent));
  const codeTerms = getStrongCodeTerms(item);
  const codeAnchors = [];

  codeTerms.forEach((term) => {
    const normalized = normalizeSourceText(term);
    if (normalized.length < 3) return;
    const indexes = normalizedBlocks
      .map((text, index) => (text.includes(normalized) ? index : -1))
      .filter((index) => index >= 0);
    // A short prefix repeated throughout a report is not an object identifier.
    if (indexes.length > 0 && indexes.length <= 12) {
      indexes.forEach((index) => codeAnchors.push({ index, term, normalized }));
    }
  });

  if (codeAnchors.length > 0) {
    const scopeIndexes = new Set();
    codeAnchors.forEach(({ index }) => {
      for (let offset = -14; offset <= 14; offset += 1) {
        const scopeIndex = index + offset;
        if (scopeIndex >= 0 && scopeIndex < blocks.length) scopeIndexes.add(scopeIndex);
      }
    });
    return {
      blocks,
      normalizedBlocks,
      mode: 'code',
      codeAnchors,
      codeNormals: new Set(codeTerms.map(normalizeSourceText)),
      scopeIndexes,
    };
  }

  const fingerprintFields = getItemFingerprintFields(item);
  const ranked = normalizedBlocks
    .map((text, index) => {
      const matchedFields = fingerprintFields
        .map((field) => ({
          key: field.key,
          weight: field.weight,
          matches: field.terms.filter(({ normalized }) => text.includes(normalized)),
        }))
        .filter((field) => field.matches.length > 0);
      const matches = matchedFields.flatMap((field) => field.matches);
      const hasDistinctiveMatch = matches.some(({ normalized }) => normalized.length >= 6
        && !GENERIC_FINGERPRINT_TERMS.has(normalized));
      const score = matches.reduce((sum, { normalized }) => {
        const weight = GENERIC_FINGERPRINT_TERMS.has(normalized) ? 0.25 : 1;
        return sum + Math.min(normalized.length, 40) ** 2 * weight;
      }, 0);
      const identityScore = matchedFields.reduce((sum, field) => sum + field.weight, 0);
      return { index, matchedFields, matches, hasDistinctiveMatch, identityScore, score };
    })
    .filter((candidate) => candidate.matchedFields.length >= 2
      && candidate.identityScore >= 7
      && (candidate.matchedFields.length >= 3 || candidate.hasDistinctiveMatch))
    .sort((a, b) => b.identityScore - a.identityScore
      || b.matchedFields.length - a.matchedFields.length
      || b.score - a.score);

  const best = ranked[0];
  if (!best) return { blocks, normalizedBlocks, mode: 'none', codeAnchors: [], scopeIndexes: new Set() };
  const competing = ranked.find((candidate) => Math.abs(candidate.index - best.index) > 4);
  if (competing && competing.identityScore === best.identityScore
    && competing.matchedFields.length === best.matchedFields.length
    && competing.score >= best.score * 0.92) {
    return { blocks, normalizedBlocks, mode: 'none', codeAnchors: [], scopeIndexes: new Set() };
  }

  const scopeIndexes = new Set();
  scopeIndexes.add(best.index);
  return {
    blocks,
    normalizedBlocks,
    mode: 'fingerprint',
    fingerprintAnchor: best,
    codeAnchors: [],
    scopeIndexes,
  };
}

// 清除上一次的段落与词语高亮。
function clearHighlights() {
  modalMdText.querySelectorAll('mark.highlight').forEach((mark) => {
    mark.parentNode.replaceChild(document.createTextNode(mark.textContent), mark);
  });
  modalMdText.querySelectorAll('.source-match').forEach((element) => element.classList.remove('source-match'));
  modalSections.querySelectorAll('.searchable-field.active').forEach((element) => element.classList.remove('active'));
  modalMdText.normalize();
}

// 在单个文本节点内高亮所有匹配的关键词（不破坏 HTML 标签结构）
function highlightInTextNode(textNode, keyword, className = 'highlight') {
  const text = textNode.nodeValue;
  if (!text) return;

  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerKeyword, lastIndex);

  if (idx === -1) return;

  while (idx !== -1) {
    if (idx > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
    }
    const mark = document.createElement('mark');
    mark.className = className;
    mark.textContent = text.slice(idx, idx + keyword.length);
    fragment.appendChild(mark);

    lastIndex = idx + keyword.length;
    idx = lowerText.indexOf(lowerKeyword, lastIndex);
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode.replaceChild(fragment, textNode);
}

function scoreSourceBlock(block, index, matcher, fieldTerms, aliases) {
  const blockText = normalizeSourceText(block.textContent);
  if (!blockText) return null;
  const fieldMatches = fieldTerms.filter((term) => blockText.includes(normalizeSourceText(term)));
  if (fieldMatches.length === 0) return null;
  const exactValue = fieldTerms[0] && blockText.includes(normalizeSourceText(fieldTerms[0]));
  const aliasMatches = aliases.filter((term) => blockText.includes(normalizeSourceText(term)));
  const fieldScore = fieldMatches.reduce((sum, term) => sum + normalizeSourceText(term).length ** 2, 0);
  const aliasScore = aliasMatches.length * 12;
  const anchorDistance = matcher.mode === 'code'
    ? Math.min(...matcher.codeAnchors.map((anchor) => Math.abs(anchor.index - index)))
    : Math.abs(matcher.fingerprintAnchor.index - index);
  const longestFieldMatch = Math.max(...fieldMatches.map((term) => normalizeSourceText(term).length));
  if (matcher.mode === 'code' && longestFieldMatch <= 3 && anchorDistance > 3) return null;
  if (matcher.mode === 'code' && anchorDistance > 1) {
    const blockCodes = extractCodeTermsFromText(block.textContent).map(normalizeSourceText);
    const hasCurrentCode = blockCodes.some((code) => [...matcher.codeNormals]
      .some((currentCode) => code.includes(currentCode) || currentCode.includes(code)));
    const hasForeignCode = blockCodes.some((code) => ![...matcher.codeNormals]
      .some((currentCode) => code.includes(currentCode) || currentCode.includes(code)));
    if (hasForeignCode && !hasCurrentCode) return null;
  }
  const anchorMatches = matcher.mode === 'code'
    ? matcher.codeAnchors
      .filter((anchor) => Math.abs(anchor.index - index) <= 2)
      .map((anchor) => anchor.term)
    : matcher.fingerprintAnchor.matches.map((match) => match.term);

  return {
    block,
    index,
    fieldMatches,
    anchorMatches,
    score: (exactValue ? 100000 : 0) + fieldScore * 100 + aliasScore
      - anchorDistance * 800 - Math.min(blockText.length, 1200) / 30,
  };
}

function findBestSourceBlock(fieldKey, value) {
  const matcher = activeSourceMatcher || createSourceMatcherContext(activeModalItem);
  activeSourceMatcher = matcher;
  if (matcher.mode === 'none' || matcher.scopeIndexes.size === 0) return null;
  const fieldTerms = getSearchTerms(value, fieldKey);
  const aliases = FIELD_ALIASES[fieldKey] || [];
  const ranked = [...matcher.scopeIndexes]
    .map((index) => scoreSourceBlock(matcher.blocks[index], index, matcher, fieldTerms, aliases))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return ranked[0] || null;
}

function updateSearchableFieldAvailability() {
  modalSections.querySelectorAll('.searchable-field').forEach((field) => {
    const fieldKey = field.dataset.fieldKey;
    const value = field.dataset.searchValue || field.textContent.trim();
    if (findBestSourceBlock(fieldKey, value)) return;
    const text = document.createElement('span');
    text.className = 'detail-value';
    text.textContent = field.textContent;
    text.title = '原文中未找到足够可靠的当前器物对应段落';
    field.replaceWith(text);
  });
}

function highlightSourceMatch(field, fieldKey, value) {
  clearHighlights();
  if (!value) return;

  const match = findBestSourceBlock(fieldKey, value);
  if (!match) {
    field.classList.add('match-missing');
    window.setTimeout(() => field.classList.remove('match-missing'), 900);
    return;
  }

  field.classList.add('active');
  match.block.classList.add('source-match');
  const walker = document.createTreeWalker(
    match.block,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'MARK' || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue) textNodes.push(node);
  }
  for (const term of match.fieldMatches.slice(0, 4)) {
    textNodes
      .filter((textNode) => textNode.isConnected && textNode.nodeValue.toLowerCase().includes(term.toLowerCase()))
      .forEach((textNode) => highlightInTextNode(textNode, term, 'highlight field-highlight'));
  }
  for (const term of match.anchorMatches.slice(0, 2)) {
    textNodes
      .filter((textNode) => textNode.isConnected && textNode.nodeValue.toLowerCase().includes(term.toLowerCase()))
      .forEach((textNode) => highlightInTextNode(textNode, term));
  }

  const fieldMarks = [...match.block.querySelectorAll('mark.field-highlight')]
    .sort((a, b) => normalizeSourceText(b.textContent).length - normalizeSourceText(a.textContent).length);
  const scrollTarget = fieldMarks[0] || match.block.querySelector('mark.highlight') || match.block;
  const scrollContainer = modalMdText.parentElement;
  const containerRect = scrollContainer.getBoundingClientRect();
  const targetRect = scrollTarget.getBoundingClientRect();
  const targetTop = targetRect.top - containerRect.top + scrollContainer.scrollTop;
  scrollContainer.scrollTop = Math.max(0, targetTop - (scrollContainer.clientHeight - targetRect.height) / 2);
}

// 点击右侧可搜索字段值 → 高亮定位
modalSections.addEventListener('click', (event) => {
  const field = event.target.closest('.searchable-field');
  if (!field) return;
  highlightSourceMatch(field, field.dataset.fieldKey, field.dataset.searchValue || field.textContent.trim());
});

// ============ 卡片交互（事件委托）============
homeCardsContainer.addEventListener('click', (event) => {
  // 点击「详情」按钮：打开弹窗，不翻转
  const detailBtn = event.target.closest('.card-detail-btn');
  if (detailBtn) {
    event.stopPropagation();
    openCardModal(detailBtn.dataset.index);
    return;
  }
  // 点击卡片：翻转
  const card = event.target.closest('.card');
  if (!card) return;
  card.classList.toggle('flipped');
  card.setAttribute('aria-pressed', String(card.classList.contains('flipped')));
});

// 键盘支持（Enter / 空格）
homeCardsContainer.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.target.closest('.card-detail-btn')) return; // 按钮交给原生行为
  const card = event.target.closest('.card');
  if (!card) return;
  event.preventDefault();
  card.classList.toggle('flipped');
  card.setAttribute('aria-pressed', String(card.classList.contains('flipped')));
});

// 列表年代列点击排序
if (periodTh) {
  periodTh.addEventListener('click', togglePeriodSort);
}

// 卡片视图二级联动筛选
if (filterDim && filterValueSel) {
  filterDim.addEventListener('change', () => {
    filterDimension = filterDim.value;
    filterValue = '';
    updateFilterValueOptions();
    applyAllFilters();
  });
  filterValueSel.addEventListener('change', () => {
    filterValue = filterValueSel.value;
    applyAllFilters();
  });
}

// 启动加载
loadCards();
