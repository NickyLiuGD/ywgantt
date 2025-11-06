// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 日期处理工具模块                                                ▓▓
// ▓▓ 路径: js/utils/date-utils.js                                   ▓▓
// ▓▓ 版本: Gamma8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 格式化日期为 YYYY-MM-DD 格式
     * @param {Date|string|number} date - 日期对象、字符串或时间戳
     * @returns {string} 格式化后的日期字符串，无效日期返回空字符串
     */
    function formatDate(date) {
        if (!date) return '';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) {
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
            if (isNaN(d.getTime())) {
                console.warn('addDays: Invalid date -', date);
                return new Date();
            }
            d.setDate(d.getDate() + (days || 0));
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
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
                console.warn('daysBetween: Invalid date(s) -', date1, date2);
                return 0;
            }
            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);
            const diff = d2 - d1;
            return Math.round(diff / (1000 * 60 * 60 * 24));
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
            return (day & 6) === day && day !== 1;
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
    const _todayCache = { date: null, timestamp: 0 };
    function isToday(date) {
        try {
            const now = Date.now();
            if (!_todayCache.date || now - _todayCache.timestamp > 60000) {
                _todayCache.date = formatDate(new Date());
                _todayCache.timestamp = now;
            }
            return formatDate(date) === _todayCache.date;
        } catch (error) {
            console.error('isToday error:', error);
            return false;
        }
    }

    // 导出到全局
    global.formatDate = formatDate;
    global.addDays = addDays;
    global.daysBetween = daysBetween;
    global.isWeekend = isWeekend;
    global.isToday = isToday;

    console.log('✅ date-utils.js loaded successfully');

})(typeof window !== 'undefined' ? window : this);
