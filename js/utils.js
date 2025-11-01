/**
 * 工具函数模块
 * 包含日期处理、日志记录等通用功能
 */

// ==================== 日期处理函数 ====================

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date|string} date - 日期对象或字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 在指定日期上增加天数
 * @param {Date|string} date - 起始日期
 * @param {number} days - 要增加的天数
 * @returns {Date} 新的日期对象
 */
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * 计算两个日期之间的天数差
 * @param {Date|string} date1 - 起始日期
 * @param {Date|string} date2 - 结束日期
 * @returns {number} 天数差
 */
function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diff = d2 - d1;
    return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * 判断是否为周末
 * @param {Date|string} date - 日期
 * @returns {boolean} 是否为周末
 */
function isWeekend(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
}

/**
 * 判断是否为今天
 * @param {Date|string} date - 日期
 * @returns {boolean} 是否为今天
 */
function isToday(date) {
    const d1 = formatDate(date);
    const d2 = formatDate(new Date());
    return d1 === d2;
}

// ==================== 日志记录函数 ====================

/**
 * 添加日志条目
 * @param {string} message - 日志消息
 */
function addLog(message) {
    const logArea = document.getElementById('logArea');
    if (!logArea) return;
    
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}

// ==================== 数据处理函数 ====================

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 拷贝后的对象
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 下载JSON文件
 * @param {Object} data - 要下载的数据
 * @param {string} filename - 文件名
 */
function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 创建带圆角的SVG路径字符串
 * @param {Array<{x: number, y: number}>} coords - 路径坐标点数组
 * @param {number} radius - 圆角半径
 * @param {boolean} close - 是否闭合路径 (默认 false)
 * @returns {string} SVG路径字符串
 */
function createRoundedPath(coords, radius, close = false) {
    let path = "";
    const length = coords.length + (close ? 1 : -1);
    for (let i = 0; i < length; i++) {
        const a = coords[i % coords.length];
        const b = coords[(i + 1) % coords.length];
        const t = Math.min(radius / Math.hypot(b.x - a.x, b.y - a.y), 0.5);

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
}