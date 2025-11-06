// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 日志记录工具模块                                                ▓▓
// ▓▓ 路径: js/utils/log-utils.js                                    ▓▓
// ▓▓ 版本: Gamma8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    const _logQueue = [];
    let _logTimer = null;

    /**
     * 批量写入日志到DOM（内部函数）
     */
    function flushLogs() {
        const logArea = document.getElementById('logArea');
        if (!logArea || _logQueue.length === 0) return;
        
        const fragment = document.createDocumentFragment();
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        
        _logQueue.forEach(message => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
            fragment.appendChild(entry);
        });
        
        logArea.appendChild(fragment);
        logArea.scrollTop = logArea.scrollHeight;
        _logQueue.length = 0;
    }

    /**
     * 添加日志条目（防抖优化版）
     * @param {string} message - 日志消息（支持HTML）
     */
    function addLog(message) {
        if (!message) return;
        _logQueue.push(String(message));
        clearTimeout(_logTimer);
        _logTimer = setTimeout(flushLogs, 50);
    }

    // 导出到全局
    global.addLog = addLog;

    console.log('✅ log-utils.js loaded successfully');

})(typeof window !== 'undefined' ? window : this);
