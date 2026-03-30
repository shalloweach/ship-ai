/**
 * WGS84 转 GCJ-02 (高德/腾讯坐标系)
 * @param {number} lng - 经度 (WGS84)
 * @param {number} lat - 纬度 (WGS84)
 * @returns {[number, number]} - [gcjLng, gcjLat]
 */
const convertWGS84ToGCJ02 = (lng, lat) => {
    // 常量定义（基于中国国测局算法）
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    const pi = Math.PI;
  
    const transformLat = (x, y) => {
      let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
      ret += (160.0 * Math.sin(y / 12.0 * pi) + 320 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
      return ret;
    };
  
    const transformLng = (x, y) => {
      let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
      ret += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0;
      return ret;
    };
  
    // 判断是否在中国境外（不转换）
    const outOfChina = (lng, lat) => {
      return (lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271);
    };
  
    if (outOfChina(lng, lat)) {
      return [lng, lat]; // 境外直接返回原值
    }
  
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * pi;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi);
    const mgLat = lat + dLat;
    const mgLng = lng + dLng;
    return [mgLng, mgLat];
  };