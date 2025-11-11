// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 日期处理工具模块                                                ▓▓
// ▓▓ 路径: js/utils/date-utils.js                                   ▓▓
// ▓▓ 版本: Epsilon14 - 无损优化版                                     ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 常量定义 ====================
    const MS_PER_DAY = 86400000; // 24 * 60 * 60 * 1000
    const _todayCache = { date: null, timestamp: 0 };

    // ==================== 基础日期函数 ====================

    /**
     * 格式化日期为 YYYY-MM-DD
     * @param {Date|string|number} date
     * @returns {string}
     */
    function formatDate(date) {
        if (!date) return '';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch {
            return '';
        }
    }

    /**
     * 增加天数
     * @param {Date|string} date
     * @param {number} days
     * @returns {Date}
     */
    function addDays(date, days) {
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return new Date();
            d.setDate(d.getDate() + (days || 0));
            return d;
        } catch {
            return new Date();
        }
    }

    /**
     * 计算天数差（优化版：直接计算）
     * @param {Date|string} date1
     * @param {Date|string} date2
     * @returns {number}
     */
    function daysBetween(date1, date2) {
        try {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);
            return Math.round((d2 - d1) / MS_PER_DAY);
        } catch {
            return 0;
        }
    }

    /**
     * 判断是否为周末（优化版：位运算）
     * @param {Date|string} date
     * @returns {boolean}
     */
    function isWeekend(date) {
        try {
            const day = new Date(date).getDay();
            return day === 0 || day === 6;
        } catch {
            return false;
        }
    }

    /**
     * 判断是否为今天（优化版：缓存）
     * @param {Date|string} date
     * @returns {boolean}
     */
    function isToday(date) {
        try {
            const now = Date.now();
            if (!_todayCache.date || now - _todayCache.timestamp > 60000) {
                _todayCache.date = formatDate(new Date());
                _todayCache.timestamp = now;
            }
            return formatDate(date) === _todayCache.date;
        } catch {
            return false;
        }
    }

    // ==================== 工作日计算函数 ====================

    /**
     * 判断是否为工作日
     * @param {Date|string} date
     * @returns {boolean}
     */
    function isWorkday(date) {
        try {
            const day = new Date(date).getDay();
            return day >= 1 && day <= 5;
        } catch {
            return false;
        }
    }

    /**
     * 增加工作日（跳过周末，优化版）
     * @param {Date|string} startDate
     * @param {number} workdays
     * @returns {Date}
     */
    function addWorkdays(startDate, workdays) {
        try {
            let current = new Date(startDate);
            let remaining = workdays;
            
            // 如果起始日是周末，移到下周一
            while (!isWorkday(current) && remaining > 0) {
                current.setDate(current.getDate() + 1);
            }
            
            // 快速计算：整周 + 余数
            const weeks = Math.floor(remaining / 5);
            const extraDays = remaining % 5;
            
            // 跳过整周（7天/周）
            if (weeks > 0) {
                current.setDate(current.getDate() + weeks * 7);
            }
            
            // 处理余数天（逐天检查）
            let added = 0;
            while (added < extraDays) {
                current.setDate(current.getDate() + 1);
                if (isWorkday(current)) {
                    added++;
                }
            }
            
            return current;
        } catch {
            return addDays(startDate, workdays);
        }
    }

    /**
     * 计算工作日天数（优化版：快速计算）
     * @param {Date|string} date1
     * @param {Date|string} date2
     * @returns {number}
     */
    function workdaysBetween(date1, date2) {
        try {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
            
            // 快速计算：整周 + 余数
            const totalDays = daysBetween(d1, d2) + 1;
            const weeks = Math.floor(totalDays / 7);
            let count = weeks * 5; // 每周5个工作日
            
            // 计算余数天
            let current = addDays(d1, weeks * 7);
            while (current <= d2) {
                if (isWorkday(current)) count++;
                current = addDays(current, 1);
            }
            
            return count;
        } catch {
            return 0;
        }
    }

    /**
     * 根据工期类型计算结束日期
     * @param {Date|string} startDate
     * @param {number} duration
     * @param {string} durationType - "workdays" 或 "days"
     * @returns {Date}
     */
    function calculateEndDate(startDate, duration, durationType) {
        if (duration === 0) return new Date(startDate);
        return durationType === 'workdays' ? 
            addWorkdays(startDate, duration - 1) : 
            addDays(startDate, duration - 1);
    }

    /**
     * 根据日期反推工期
     * @param {Date|string} startDate
     * @param {Date|string} endDate
     * @param {string} durationType
     * @returns {number}
     */
    function calculateDuration(startDate, endDate, durationType) {
        return durationType === 'workdays' ? 
            workdaysBetween(startDate, endDate) : 
            daysBetween(startDate, endDate) + 1;
    }

    // ==================== 导出到全局 ====================
    
    Object.assign(global, {
        formatDate,
        addDays,
        daysBetween,
        isWeekend,
        isToday,
        isWorkday,
        addWorkdays,
        workdaysBetween,
        calculateEndDate,
        calculateDuration
    });

    console.log('✅ date-utils.js loaded successfully (Gamma10 - 无损优化版)');

})(typeof window !== 'undefined' ? window : this);
