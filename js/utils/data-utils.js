// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 数据处理工具模块                                                ▓▓
// ▓▓ 路径: js/utils/data-utils.js                                   ▓▓
// ▓▓ 版本: Gamma8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 生成唯一ID（增强版）
     * @returns {string} 格式：task-时间戳-随机字符串
     */
    function generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        const extra = performance.now().toString(36).substring(2, 6);
        return `task-${timestamp}-${random}${extra}`;
    }

    /**
     * 深拷贝对象（安全版：防止循环引用）
     * @param {*} obj - 要拷贝的对象
     * @param {WeakMap} [seen] - 内部使用的循环引用检测器
     * @returns {*} 拷贝后的对象
     */
    function deepClone(obj, seen = new WeakMap()) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (seen.has(obj)) {
            console.warn('deepClone: Circular reference detected');
            return obj;
        }
        try {
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            if (Array.isArray(obj)) {
                seen.set(obj, true);
                return obj.map(item => deepClone(item, seen));
            }
            seen.set(obj, true);
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = deepClone(obj[key], seen);
                }
            }
            return cloned;
        } catch (error) {
            console.error('deepClone error:', error);
            return JSON.parse(JSON.stringify(obj));
        }
    }

    /**
     * 下载JSON文件（优化版：自动清理）
     * @param {Object|Array} data - 要下载的数据
     * @param {string} filename - 文件名（建议包含.json后缀）
     */
    function downloadJSON(data, filename) {
        try {
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'data.json';
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('downloadJSON error:', error);
            alert('文件下载失败：' + error.message);
        }
    }

    /**
     * 创建带圆角的SVG路径字符串（优化版）
     * @param {Array<{x: number, y: number}>} coords - 路径坐标点数组
     * @param {number} radius - 圆角半径
     * @param {boolean} [close=false] - 是否闭合路径
     * @returns {string} SVG路径字符串
     */
    function createRoundedPath(coords, radius, close = false) {
        if (!coords || coords.length < 2) {
            console.warn('createRoundedPath: Invalid coords');
            return '';
        }
        try {
            let path = "";
            const length = coords.length + (close ? 1 : -1);
            
            for (let i = 0; i < length; i++) {
                const a = coords[i % coords.length];
                const b = coords[(i + 1) % coords.length];
                
                const distance = Math.hypot(b.x - a.x, b.y - a.y);
                const t = Math.min(radius / distance, 0.5);
                
                if (i > 0) {
                    path += `Q${a.x},${a.y} ${a.x * (1 - t) + b.x * t},${a.y * (1 - t) + b.y * t}`;
                }
                
                if (!close && i === 0) {
                    path += `M${a.x},${a.y}`;
                } else if (i === 0) {
                    path += `M${a.x * (1 - t) + b.x * t},${a.y * (1 - t) + b.y * t}`;
                }
                
                if (!close && i === length - 1) {
                    path += `L${b.x},${b.y}`;
                } else if (i < length - 1) {
                    path += `L${a.x * t + b.x * (1 - t)},${a.y * t + b.y * (1 - t)}`;
                }
            }
            
            if (close) path += "Z";
            return path;
        } catch (error) {
            console.error('createRoundedPath error:', error);
            return '';
        }
    }

    // 导出到全局
    global.generateId = generateId;
    global.deepClone = deepClone;
    global.downloadJSON = downloadJSON;
    global.createRoundedPath = createRoundedPath;

    console.log('✅ data-utils.js loaded successfully');

})(typeof window !== 'undefined' ? window : this);
