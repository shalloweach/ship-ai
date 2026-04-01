/**
 * 地图初始化 & 脚本加载
 */

/**
 * 确保高德地图脚本已加载
 */
export const ensureAMapLoaded = () => {
    return new Promise((resolve, reject) => {
      if (window.AMap && window.AMap.Map) {
        resolve()
        return
      }
      
      // 已注入脚本，等待就绪
      if (document.querySelector('script[src*="webapi.amap.com/maps"]')) {
        const check = setInterval(() => {
          if (window.AMap?.Map) {
            clearInterval(check)
            resolve()
          }
        }, 50)
        setTimeout(() => {
          clearInterval(check)
          reject(new Error('高德地图加载超时'))
        }, 10000)
        return
      }
      
      // 动态注入脚本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = `https://webapi.amap.com/maps?v=2.0&key=60eb1e3f81883411db470e05d9314712&plugin=AMap.Scale,AMap.ToolBar`
      script.async = true
      script.onload = () => {
        const check = setInterval(() => {
          if (window.AMap?.Map) {
            clearInterval(check)
            resolve()
          }
        }, 20)
      }
      script.onerror = () => reject(new Error('高德地图脚本加载失败'))
      document.head.appendChild(script)
    })
  }
  
  /**
   * 初始化地图实例
   */
  export const initMap = async (containerRef, mapState, options = {}) => {
    const { center = [31.2, 122], zoom = 8 } = options
    
    await ensureAMapLoaded()
    const [lng, lat] = center
    const mapCenter = new AMap.LngLat(lng, lat)
    
    const mapInstance = new AMap.Map(containerRef.value, {
      zoom,
      center: mapCenter,
      viewMode: '2D',
      resizeEnable: true,
      features: ['bg', 'point', 'road', 'building'],
      zooms: [3, 20],
      pitch: 0,
      rotation: 0
    })
    
    // 添加基础控件
    if (AMap.ToolBar) {
      mapInstance.addControl(new AMap.ToolBar({
        position: 'RB',
        offset: new AMap.Pixel(10, 10)
      }))
    }
    
    // 等待渲染完成
    await new Promise((resolve) => {
      mapInstance.on('complete', resolve)
    })
    
    return { mapInstance }
  }