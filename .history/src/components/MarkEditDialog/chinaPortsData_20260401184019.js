// src/components/MarkEditDialog/chinaPortsData.js

/**
 * 中国港口数据（高效查询版）
 * 优化策略：
 * 1. 关键词搜索：前缀索引 + 拼音首字母索引（O(1) 定位候选集）
 * 2. 坐标搜索：经纬度网格索引（1°×1°），仅计算附近网格（减少 90%+ 距离计算）
 */

// ========== 原始港口数据 ==========
const rawPorts = [
  ['北部湾港', 108.6818406, 21.59582732],
  ['湛江港', 110.3698159, 20.82648715],
  ['洋浦港', 109.1866568, 19.72412282],
  ['八所港', 108.6235742, 19.10159044],
  ['海口港', 110.2819492, 20.03471753],
  ['茂名港', 111.0682421, 21.48070704],
  ['阳江港', 111.8140158, 21.71029788],
  ['珠海港', 113.3280893, 22.17638746],
  ['江门港', 113.038498, 22.43885369],
  ['江门（内河）', 112.9651148, 22.5072751],
  ['佛山港', 113.0040071, 22.9563333],
  ['肇庆港', 112.6164784, 23.15238883],
  ['云浮港', 112.0361703, 23.07056629],
  ['梧州港', 111.3063664, 23.46487591],
  ['贵港港', 109.760243, 23.14166132],
  ['来宾港', 109.5659921, 23.90027126],
  ['清远港', 112.9959094, 23.68912776],
  ['广州（内河）', 113.4105545, 23.09748863],
  ['广州港', 113.5762776, 22.85565304],
  ['东莞港', 113.5769289, 22.90785098],
  ['东莞（内河）', 113.6613134, 23.00718691],
  ['中山港', 113.408719, 22.63920284],
  ['惠州（内河）', 114.0939876, 23.06873105],
  ['深圳港', 113.9667102, 22.52289904],
  ['惠州港', 114.5633245, 22.69834034],
  ['汕尾港', 115.0332802, 22.74654224],
  ['汕头港', 116.756282, 23.26752714],
  ['揭阳港', 116.4889048, 23.49348478],
  ['潮州港', 116.972257, 23.6130182],
  ['漳州港', 117.6848367, 23.97573174],
  ['厦门港', 118.082403, 24.48622271],
  ['泉州港', 118.7346758, 24.82812204],
  ['福州港', 119.5718395, 25.91246825],
  ['宁德港', 119.7651576, 26.8561901],
  ['温州港', 121.0304676, 28.01718104],
  ['台州港', 121.5016149, 28.46904737],
  ['宁波-舟山港', 121.8798156, 29.97078652],
  ['嘉兴港', 121.1114519, 30.60781157],
  ['上海港', 121.6672731, 31.12969947],
  ['南通港', 121.6065286, 31.97601745],
  ['盐城港', 120.8293513, 33.27216436],
  ['连云港港', 119.383534, 34.81409255],
  ['日照港', 119.4478898, 35.22033617],
  ['青岛港', 120.1601334, 35.93992957],
  ['威海港', 122.3192624, 37.16362174],
  ['烟台港', 120.8463274, 37.61773016],
  ['潍坊港', 119.1708988, 37.23972875],
  ['东营港', 118.999248, 37.37147981],
  ['黄骅港', 117.8706591, 38.32638337],
  ['天津港', 117.7741761, 38.97163373],
  ['唐山港', 118.6112318, 39.05999849],
  ['秦皇岛港', 119.5889493, 39.90837872],
  ['葫芦岛港', 120.1212287, 40.0761688],
  ['锦州港', 121.0595334, 40.80669936],
  ['盘锦港', 122.0024732, 40.68691578],
  ['营口港', 122.102084, 40.29969686],
  ['大连港', 121.5752542, 39.26066048],
  ['丹东港', 124.145947, 39.81599028],
  ['苏州港', 120.767212, 31.85748825],
  ['南通（内河）', 120.8021711, 31.91413568],
  ['泰州港', 120.0916525, 32.09141732],
  ['江阴港', 120.1750214, 31.92412827],
  ['常州港', 119.7263253, 31.7367172],
  ['扬州港', 119.5915462, 32.29736163],
  ['镇江港', 119.6090507, 32.21755155],
  ['南京港', 118.7569735, 32.02824606],
  ['马鞍山港', 118.4536359, 31.71755986],
  ['芜湖港', 118.2100445, 31.29279073],
  ['铜陵港', 117.7380113, 30.87719312],
  ['池州港', 117.5374365, 30.73524849],
  ['九江港', 115.9290859, 29.72461959],
  ['黄州港', 114.8365222, 30.52100669],
  ['武汉港', 114.4696714, 30.59410526],
  ['岳阳港', 113.17313, 29.47278924],
  ['荆州港', 112.2986646, 30.12518953],
  ['宜昌港', 111.5308646, 30.33827493],
  ['重庆港', 106.8992359, 29.6694634],
  ['泸州港', 105.5327313, 28.88416184],
  ['安庆港', 117.0792264, 30.50420738],
  ['宜宾港', 104.7657788, 28.79111083],
  ['长沙港', 112.9291053, 28.32111879],
  ['黄石港', 115.2761199, 30.13647899],
  ['合肥港', 117.3824302, 31.80312713],
  ['南昌港', 115.9638574, 28.8214061],
  ['阜阳港', 115.9088714, 32.8433285],
  ['蚌埠港', 117.3203125, 32.94888464],
  ['济宁港', 116.5610263, 35.32042713],
  ['徐州港', 117.4074862, 34.31578137],
  ['宿迁港', 118.4803648, 33.7897473],
  ['淮安港', 118.9725389, 33.57517759],
  ['湖州港', 119.9245221, 30.97815171],
  ['杭州港', 120.0708196, 30.06541147],
  ['嘉兴（内河）', 120.8220426, 30.82944141]
];

// ========== 工具函数 ==========

/**
 * 简易拼音首字母获取（覆盖常用汉字，如需精确请用 pinyin-pro 库）
 */
function getPyInitials(str) {
  const pyMap = {
    '北':'B','部':'B','湾':'W','港':'G','湛':'Z','江':'J','洋':'Y','浦':'P',
    '八':'B','所':'S','海':'H','口':'K','茂':'M','名':'M','阳':'Y','珠':'Z',
    '佛':'F','山':'S','肇':'Z','庆':'Q','云':'Y','浮':'F','梧':'W','州':'Z',
    '贵':'G','港':'G','来':'L','宾':'B','清':'Q','远':'Y','广':'G','东':'D',
    '莞':'W','中':'Z','惠':'H','深':'S','汕':'S','尾':'W','揭':'J','阳':'Y',
    '潮':'C','漳':'Z','厦':'X','门':'M','泉':'Q','福':'F','宁':'N','德':'D',
    '温':'W','台':'T','宁':'N','波':'B','舟':'Z','嘉':'J','兴':'X','上':'S',
    '南':'N','通':'T','盐':'Y','城':'C','连':'L','云':'Y','港':'G','日':'R',
    '照':'Z','青':'Q','岛':'D','威':'W','海':'H','烟':'Y','台':'T','潍':'W',
    '坊':'F','东':'D','营':'Y','黄':'H','骅':'H','天':'T','津':'J','唐':'T',
    '秦':'Q','皇':'H','岛':'D','葫':'H','芦':'L','锦':'J','州':'Z','盘':'P',
    '营':'Y','口':'K','大':'D','连':'L','丹':'D','东':'D','苏':'S','泰':'T',
    '镇':'Z','常':'C','扬':'Y','马':'M','鞍':'A','芜':'W','湖':'H','铜':'T',
    '陵':'L','池':'C','九':'J','黄':'H','武':'W','岳':'Y','荆':'J','宜':'Y',
    '重':'C','庆':'Q','泸':'L','安':'A','宜':'Y','宾':'B','长':'C','沙':'S',
    '合':'H','肥':'F','南':'N','昌':'C','阜':'F','蚌':'B','济':'J','徐':'X',
    '宿':'S','迁':'Q','淮':'H','安':'A','湖':'H','杭':'H'
  };
  return str.split('').map(c => pyMap[c] || c.toUpperCase()).join('');
}

/**
 * 计算两点之间的距离（单位：公里，Haversine 公式）
 */
function getDistance(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + 
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * 
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * 获取坐标所在的网格 ID（1°×1° 网格）
 */
function getGridId(lon, lat) {
  const gridLon = Math.floor(lon);
  const gridLat = Math.floor(lat);
  return `${gridLon}_${gridLat}`;
}

// ========== 索引构建（模块加载时执行一次） ==========

// 标准化港口数据
const CHINA_PORTS = rawPorts.map(([name, lon, lat], idx) => {
  const py = getPyInitials(name);
  const pyLower = py.toLowerCase();
  const nameLower = name.toLowerCase();
  return {
    id: idx,
    name,
    lon,
    lat,
    code: `CN${py.slice(0,3)}${idx.toString().padStart(2,'0')}`,
    py,
    pyLower,
    nameLower,
    gridId: getGridId(lon, lat)
  };
});

// 🔑 前缀索引：2~3 字符前缀 → 港口列表
const prefixIndex = new Map();
// 🔑 拼音首字母索引：'sz' → [深圳港, 苏州港...]
const pyIndex = new Map();
// 🔑 网格索引：'113_22' → [该网格内的港口]
const gridIndex = new Map();

// 构建索引
for (const port of CHINA_PORTS) {
  // 前缀索引（2~3 字符）
  for (let len = 2; len <= 3 && len <= port.name.length; len++) {
    const prefix = port.nameLower.slice(0, len);
    if (!prefixIndex.has(prefix)) prefixIndex.set(prefix, []);
    if (!prefixIndex.get(prefix).includes(port)) {
      prefixIndex.get(prefix).push(port);
    }
  }
  
  // 拼音索引（全拼 + 首字母组合）
  const pyKeys = [port.pyLower, port.pyLower.slice(0,2), port.pyLower.slice(0,3)];
  for (const key of pyKeys) {
    if (key.length >= 2) {
      if (!pyIndex.has(key)) pyIndex.set(key, []);
      if (!pyIndex.get(key).includes(port)) {
        pyIndex.get(key).push(port);
      }
    }
  }
  
  // 网格索引
  if (!gridIndex.has(port.gridId)) gridIndex.set(port.gridId, []);
  gridIndex.get(port.gridId).push(port);
}

// ========== 导出函数 ==========

/**
 * 根据关键词搜索港口（高效版）
 * 策略：前缀索引快速定位候选集 → 模糊匹配精筛 → 按匹配度排序
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 匹配的港口列表（按相关度排序）
 */
export const searchPorts = async (keyword) => {
  if (!keyword || !keyword.trim()) return [];
  
  const kw = keyword.trim().toLowerCase();
  const kwLen = kw.length;
  
  // 1️⃣ 尝试用前缀索引快速定位（2~3 字符前缀）
  let candidates = new Set();
  const prefixLen = Math.min(3, kwLen);
  if (prefixLen >= 2) {
    const prefix = kw.slice(0, prefixLen);
    if (prefixIndex.has(prefix)) {
      prefixIndex.get(prefix).forEach(p => candidates.add(p));
    }
  }
  
  // 2️⃣ 尝试拼音索引
  if (pyIndex.has(kw)) {
    pyIndex.get(kw).forEach(p => candidates.add(p));
  }
  
  // 3️⃣ 如果候选集为空，降级为全量模糊匹配（仅当关键词较短时）
  if (candidates.size === 0 && kwLen <= 3) {
    for (const port of CHINA_PORTS) {
      if (port.nameLower.includes(kw) || port.pyLower.includes(kw)) {
        candidates.add(port);
      }
    }
  }
  
  // 4️⃣ 精筛 + 排序（按：完全匹配 > 前缀匹配 > 包含匹配）
  const results = Array.from(candidates).filter(port => 
    port.nameLower.includes(kw) || port.pyLower.includes(kw)
  ).map(port => {
    // 计算匹配分数
    let score = 0;
    if (port.nameLower === kw) score += 100;
    else if (port.nameLower.startsWith(kw)) score += 50;
    else if (port.pyLower === kw) score += 40;
    else if (port.pyLower.startsWith(kw)) score += 20;
    else if (port.nameLower.includes(kw)) score += 10;
    else if (port.pyLower.includes(kw)) score += 5;
    return { ...port, _score: score };
  })
  .sort((a, b) => b._score - a._score)
  .map(({ _score, ...port }) => port); // 移除临时分数字段
  
  return results;
};

/**
 * 根据坐标搜索附近港口（高效版）
 * 策略：网格索引定位 → 仅计算周围 3×3 网格内的港口距离
 * @param {number} lon - 经度
 * @param {number} lat - 纬度
 * @param {number} maxDistanceKm - 最大搜索半径（默认 30km）
 * @returns {Promise<Array>} 附近港口列表（按距离升序），空数组表示无结果
 */
export const searchPortsByCoord = async (lon, lat, maxDistanceKm = 30) => {
  if (lon === undefined || lat === undefined) return [];
  
  const centerGrid = getGridId(lon, lat);
  const [centerLon, centerLat] = centerGrid.split('_').map(Number);
  
  // 收集周围 3×3 网格内的候选港口
  const candidates = new Set();
  for (let dLon = -1; dLon <= 1; dLon++) {
    for (let dLat = -1; dLat <= 1; dLat++) {
      const gridId = `${centerLon + dLon}_${centerLat + dLat}`;
      if (gridIndex.has(gridId)) {
        gridIndex.get(gridId).forEach(p => candidates.add(p));
      }
    }
  }
  
  // 计算精确距离 + 过滤 + 排序
  const results = Array.from(candidates)
    .map(port => {
      const distance = getDistance(lon, lat, port.lon, port.lat);
      return { ...port, distance };
    })
    .filter(p => p.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance);
  
  if (results.length === 0) {
      return [{ name: '未知', distance: Infinity }];
    }
  
  return results;
};

/**
 * 【可选】获取所有港口列表（用于初始化下拉等）
 */
export const getAllPorts = () => CHINA_PORTS;

/**
 * 【可选】根据港口代码查找
 */
export const getPortByCode = (code) => {
  return CHINA_PORTS.find(p => p.code === code) || null;
};