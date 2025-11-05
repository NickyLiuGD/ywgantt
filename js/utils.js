// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 工具函数模块 - 日期处理、日志记录、数据操作                      ▓▓
// ▓▓ 路径: js/utils.js                                                ▓▓
// ▓▓ 版本: Gamma8 - 性能优化版                                        ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ## ==================== 日期处理函数 ====================
    
    /**
     * 格式化日期为 YYYY-MM-DD 格式
     * @param {Date|string|number} date - 日期对象、字符串或时间戳
     * @returns {string} 格式化后的日期字符串，无效日期返回空字符串
     */
    function formatDate(date) {
        if (!date) return ''; // ⚠️ 空值保护
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) { // ⚠️ 验证日期有效性
                console.warn('formatDate: Invalid date -', date);
                return '';
            }
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('formatDate error:', error);
            return '';
        }
    }

    /**
     * 在指定日期上增加天数
     * @param {Date|string} date - 起始日期
     * @param {number} days - 要增加的天数（可为负数）
     * @returns {Date} 新的日期对象
     */
    function addDays(date, days) {
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) { // ⚠️ 验证日期有效性
                console.warn('addDays: Invalid date -', date);
                return new Date(); // 🔑 返回当前日期作为后备
            }
            d.setDate(d.getDate() + (days || 0)); // ▌ 支持负数天数
            return d;
        } catch (error) {
            console.error('addDays error:', error);
            return new Date();
        }
    }

    /**
     * 计算两个日期之间的天数差
     * @param {Date|string} date1 - 起始日期
     * @param {Date|string} date2 - 结束日期
     * @returns {number} 天数差（date2 - date1）
     */
    function daysBetween(date1, date2) {
        try {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) { // ⚠️ 双重验证
                console.warn('daysBetween: Invalid date(s) -', date1, date2);
                return 0;
            }
            d1.setHours(0, 0, 0, 0); // ▌ 归零时间部分，确保精确计算
            d2.setHours(0, 0, 0, 0);
            const diff = d2 - d1;
            return Math.round(diff / (1000 * 60 * 60 * 24)); // ⭐ 毫秒转天数
        } catch (error) {
            console.error('daysBetween error:', error);
            return 0;
        }
    }

    /**
     * 判断是否为周末（优化版：使用位运算）
     * @param {Date|string} date - 日期
     * @returns {boolean} 是否为周末（周六或周日）
     */
    function isWeekend(date) {
        try {
            const day = new Date(date).getDay();
            return (day & 6) === day && day !== 1; // ⚡ 位运算优化：0或6返回true
        } catch (error) {
            console.error('isWeekend error:', error);
            return false;
        }
    }

    /**
     * 判断是否为今天（优化版：使用缓存）
     * @param {Date|string} date - 日期
     * @returns {boolean} 是否为今天
     */
    const _todayCache = { date: null, timestamp: 0 }; // ◦ 缓存今日日期字符串
    function isToday(date) {
        try {
            const now = Date.now();
            if (!_todayCache.date || now - _todayCache.timestamp > 60000) { // ⚡ 缓存1分钟
                _todayCache.date = formatDate(new Date());
                _todayCache.timestamp = now;
            }
            return formatDate(date) === _todayCache.date;
        } catch (error) {
            console.error('isToday error:', error);
            return false;
        }
    }

    // ## ==================== 日志记录函数（防抖优化）====================
    
    const _logQueue = []; // ◦ 日志队列
    let _logTimer = null; // ◦ 防抖定时器

    /**
     * 批量写入日志到DOM（内部函数）
     */
    function flushLogs() {
        const logArea = document.getElementById('logArea');
        if (!logArea || _logQueue.length === 0) return;
        
        const fragment = document.createDocumentFragment(); // ⚡ 使用Fragment减少重排
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        
        _logQueue.forEach(message => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
            fragment.appendChild(entry);
        });
        
        logArea.appendChild(fragment);
        logArea.scrollTop = logArea.scrollHeight; // → 自动滚动到底部
        _logQueue.length = 0; // ▌ 清空队列
    }

    /**
     * 添加日志条目（防抖优化版）
     * @param {string} message - 日志消息（支持HTML）
     */
    function addLog(message) {
        if (!message) return;
        _logQueue.push(String(message));
        clearTimeout(_logTimer);
        _logTimer = setTimeout(flushLogs, 50); // ⚡ 50ms内的日志合并写入
    }

    // ## ==================== 数据处理函数 ====================
    
    /**
     * 生成唯一ID（增强版）
     * @returns {string} 格式：task-时间戳-随机字符串
     */
    function generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11); // ⭐ 9位随机字符
        const extra = performance.now().toString(36).substring(2, 6); // 🔑 额外随机性
        return `task-${timestamp}-${random}${extra}`;
    }

    /**
     * 深拷贝对象（安全版：防止循环引用）
     * @param {*} obj - 要拷贝的对象
     * @param {WeakMap} [seen] - 内部使用的循环引用检测器
     * @returns {*} 拷贝后的对象
     */
    function deepClone(obj, seen = new WeakMap()) {
        // ▌ 基础类型直接返回
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        // ⚠️ 循环引用检测
        if (seen.has(obj)) {
            console.warn('deepClone: Circular reference detected');
            return obj; // 🚨 返回原对象避免死循环
        }
        try {
            // ▌ 处理日期对象
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            // ▌ 处理数组
            if (Array.isArray(obj)) {
                seen.set(obj, true);
                return obj.map(item => deepClone(item, seen));
            }
            // ▌ 处理普通对象
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
            return JSON.parse(JSON.stringify(obj)); // ↘ 降级到JSON方法
        }
    }

    /**
     * 下载JSON文件（优化版：自动清理）
     * @param {Object|Array} data - 要下载的数据
     * @param {string} filename - 文件名（建议包含.json后缀）
     */
    function downloadJSON(data, filename) {
        try {
            const jsonStr = JSON.stringify(data, null, 2); // → 格式化输出
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'data.json';
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            // ⚡ 延迟清理，确保下载完成
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // 🔑 释放内存
            }, 100);
        } catch (error) {
            console.error('downloadJSON error:', error);
            alert('文件下载失败：' + error.message);
        }
    }

    // ## ==================== SVG 路径工具 ====================
    
    /**
     * 创建带圆角的SVG路径字符串（优化版）
     * @param {Array<{x: number, y: number}>} coords - 路径坐标点数组
     * @param {number} radius - 圆角半径
     * @param {boolean} [close=false] - 是否闭合路径
     * @returns {string} SVG路径字符串
     */
    function createRoundedPath(coords, radius, close = false) {
        if (!coords || coords.length < 2) { // ⚠️ 参数验证
            console.warn('createRoundedPath: Invalid coords');
            return '';
        }
        try {
            let path = "";
            const length = coords.length + (close ? 1 : -1);
            
            for (let i = 0; i < length; i++) {
                const a = coords[i % coords.length];
                const b = coords[(i + 1) % coords.length];
                
                // ⭐ 计算圆角切线长度
                const distance = Math.hypot(b.x - a.x, b.y - a.y);
                const t = Math.min(radius / distance, 0.5); // ▌ 限制最大50%
                
                if (i > 0) {
                    // → 贝塞尔曲线圆角
                    path += `Q${a.x},${a.y} ${a.x * (1 - t) + b.x * t},${a.y * (1 - t) + b.y * t}`;
                }
                
                if (!close && i === 0) {
                    path += `M${a.x},${a.y}`; // ▌ 起点
                } else if (i === 0) {
                    path += `M${a.x * (1 - t) + b.x * t},${a.y * (1 - t) + b.y * t}`;
                }
                
                if (!close && i === length - 1) {
                    path += `L${b.x},${b.y}`; // ▌ 终点
                } else if (i < length - 1) {
                    path += `L${a.x * t + b.x * (1 - t)},${a.y * t + b.y * (1 - t)}`;
                }
            }
            
            if (close) path += "Z"; // ⛓️ 闭合路径
            return path;
        } catch (error) {
            console.error('createRoundedPath error:', error);
            return '';
        }
    }

    // ## ==================== 导出到全局 ====================
    
    global.formatDate = formatDate;
    global.addDays = addDays;
    global.daysBetween = daysBetween;
    global.isWeekend = isWeekend;
    global.isToday = isToday;
    global.addLog = addLog;
    global.generateId = generateId;
    global.deepClone = deepClone;
    global.downloadJSON = downloadJSON;
    global.createRoundedPath = createRoundedPath;

    // ✅ 模块加载完成标记
    console.log('✅ utils.js loaded successfully');

})(typeof window !== 'undefined' ? window : this);
