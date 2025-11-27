// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 数据处理工具模块                                                ▓▓
// ▓▓ 路径: js/utils/data-utils.js                                   ▓▓
// ▓▓ 版本: Epsilon11-InternalKey                                    ▓▓
// ▓▓ 新增: 内部存储键生成器                                          ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 生成任务唯一ID
     */
    function generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        const extra = performance.now().toString(36).substring(2, 6);
        return `task-${timestamp}-${random}${extra}`;
    }

    /**
     * ⭐ 新增：生成项目内部存储文件名 (KV Key)
     * 格式: proj_时间戳_随机码.json
     * 纯 ASCII，确保后端兼容性，且天然按时间排序
     */
    function generateProjectInternalFilename() {
        const timestamp = Date.now();
        // 随机码防止同一毫秒并发冲突
        const random = Math.random().toString(36).substring(2, 6);
        return `proj_${timestamp}_${random}.json`;
    }

    /**
     * 深拷贝对象
     */
    function deepClone(obj, seen = new WeakMap()) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (seen.has(obj)) return obj;
        try {
            if (obj instanceof Date) return new Date(obj.getTime());
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
            return JSON.parse(JSON.stringify(obj));
        }
    }

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
        }
    }

    function createRoundedPath(coords, radius, close = false) {
        if (!coords || coords.length < 2) return '';
        try {
            let path = "";
            const length = coords.length + (close ? 1 : -1);
            for (let i = 0; i < length; i++) {
                const a = coords[i % coords.length];
                const b = coords[(i + 1) % coords.length];
                const distance = Math.hypot(b.x - a.x, b.y - a.y);
                const t = Math.min(radius / distance, 0.5);
                if (i > 0) path += `Q${a.x},${a.y} ${a.x * (1 - t) + b.x * t},${a.y * (1 - t) + b.y * t}`;
                if (!close && i === 0) path += `M${a.x},${a.y}`;
                else if (i === 0) path += `M${a.x * (1 - t) + b.x * t},${a.y * (1 - t) + b.y * t}`;
                if (!close && i === length - 1) path += `L${b.x},${b.y}`;
                else if (i < length - 1) path += `L${a.x * t + b.x * (1 - t)},${a.y * t + b.y * (1 - t)}`;
            }
            if (close) path += "Z";
            return path;
        } catch (e) { return ''; }
    }

    global.generateId = generateId;
    global.generateProjectInternalFilename = generateProjectInternalFilename;
    global.deepClone = deepClone;
    global.downloadJSON = downloadJSON;
    global.createRoundedPath = createRoundedPath;

    console.log('✅ data-utils.js loaded (With Key Generator)');

})(typeof window !== 'undefined' ? window : this);