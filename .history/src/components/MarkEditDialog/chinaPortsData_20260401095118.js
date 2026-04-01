// src/components/MarkEditDialog/chinaPortsData.js
// 精简版示例，实际可接入完整港口数据库或API

export const chinaPorts = [
    { code: 'CNHKG', name: '香港港', pinyin: 'xianggang' },
    { code: 'CNSHA', name: '上海港', pinyin: 'shanghai' },
    { code: 'CNNGB', name: '宁波舟山港', pinyin: 'ningbo' },
    { code: 'CNSZX', name: '深圳港', pinyin: 'shenzhen' },
    { code: 'CNQIN', name: '青岛港', pinyin: 'qingdao' },
    { code: 'CNTAO', name: '天津港', pinyin: 'tianjin' },
    { code: 'CNDLC', name: '大连港', pinyin: 'dalian' },
    { code: 'CNXMN', name: '厦门港', pinyin: 'xiamen' },
    { code: 'CNGZH', name: '广州港', pinyin: 'guangzhou' },
    { code: 'CNZHA', name: '湛江港', pinyin: 'zhanjiang' },
    { code: 'CNLYG', name: '连云港港', pinyin: 'lianyungang' },
    { code: 'CNYTN', name: '烟台港', pinyin: 'yantai' },
    { code: 'CNWEI', name: '威海港', pinyin: 'weihai' },
    { code: 'CNFUG', name: '福州港', pinyin: 'fuzhou' },
    { code: 'CNQUZ', name: '泉州港', pinyin: 'quanzhou' },
    { code: 'CNZOS', name: '舟山港', pinyin: 'zhoushan' },
    { code: 'CNJZH', name: '锦州港', pinyin: 'jinzhou' },
    { code: 'CNRYZ', name: '日照港', pinyin: 'rizhao' },
    // ... 可扩展至500+中国港口
  ]
  
  // 搜索工具函数（可选）
  export const searchPorts = (keyword, limit = 10) => {
    const kw = keyword.toLowerCase()
    return chinaPorts.filter(p => 
      p.name.toLowerCase().includes(kw) || 
      p.code.toLowerCase().includes(kw) ||
      p.pinyin?.toLowerCase().includes(kw)
    ).slice(0, limit)
  }