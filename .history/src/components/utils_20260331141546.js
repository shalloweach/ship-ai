// src\components\utils.js
export const formatNavigationStatus = (status) => {
  const statusMap = {
    '0': '在航', '1': '锚泊', '2': '失控', '3': '操纵受限',
    '4': '吃水受限', '5': '系泊', '6': '搁浅', '7': '捕鱼',
    '8': '帆船', '9': '备用', '10': '危险品', '11': '危险品(快)',
    '12': '备用', '13': '备用', '14': 'AIS-SART', '15': '未定义'
  }
  const key = String(status)?.split('.')[0] || '15'
  return statusMap[key] || `状态(${status})`
}


const formatTime = (timestamp) => {
  if (!timestamp) return '—'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', { 
    month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  })
}

export const convertTrajectory = (points) => {
    return points.map(p => {
      const [lng, lat] = convertWGS84ToGCJ02(p.lon, p.lat)
      return {
        ...p,
        lon: lng,
        lat: lat
      }
    })
  }

/**
 * WGS84 转 GCJ-02 (高德/腾讯坐标系)
 * @param {number} lng - 经度 (WGS84)
 * @param {number} lat - 纬度 (WGS84)
 * @returns {[number, number]} - [gcjLng, gcjLat]
 */
export const convertWGS84ToGCJ02 = (lng, lat) => {
    const PI = 3.14159265358979324
    const a = 6378245.0
    const ee = 0.00669342162296594323
  
    function transformLat(x, y) {
      let ret = -100 + 2 * x + 3 * y + 0.2 * y * y
      ret += 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
      ret += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3
      return ret
    }
  
    function transformLng(x, y) {
      let ret = 300 + x + 2 * y + 0.1 * x * x
      ret += 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
      ret += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3
      return ret
    }
  
    function outOfChina(lng, lat) {
      return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
    }
  
    if (outOfChina(lng, lat)) return [lng, lat]
  
    let dLat = transformLat(lng - 105, lat - 35)
    let dLng = transformLng(lng - 105, lat - 35)
  
    const radLat = lat / 180 * PI
    let magic = Math.sin(radLat)
    magic = 1 - ee * magic * magic
    const sqrtMagic = Math.sqrt(magic)
  
    dLat = (dLat * 180) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI)
    dLng = (dLng * 180) / (a / sqrtMagic * Math.cos(radLat) * PI)
  
    return [lng + dLng, lat + dLat]
  }