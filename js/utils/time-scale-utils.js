// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 时间轴缩放工具模块                                              ▓▓
// ▓▓ 路径: js/utils/time-scale-utils.js                             ▓▓
// ▓▓ 版本: Delta6                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 时间刻度类型
     */
    const TimeScale = {
        DAY: 'day',
        WEEK: 'week',
        MONTH: 'month'
    };

    /**
     * 获取周的开始日期（周一）
     * @param {Date} date - 日期
     * @returns {Date} 该周的周一
     */
    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day; // 周日算上周
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * 获取周的结束日期（周日）
     * @param {Date} date - 日期
     * @returns {Date} 该周的周日
     */
    function getWeekEnd(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? 0 : 7 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    /**
     * 获取月的开始日期
     * @param {Date} date - 日期
     * @returns {Date} 该月的第一天
     */
    function getMonthStart(date) {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * 获取月的结束日期
     * @param {Date} date - 日期
     * @returns {Date} 该月的最后一天
     */
    function getMonthEnd(date) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    /**
     * 获取周数（ISO 8601标准）
     * @param {Date} date - 日期
     * @returns {number} 周数
     */
    function getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }

    /**
     * 格式化周标签
     * @param {Date} date - 日期
     * @returns {string} 格式化的周标签 "第N周 (M/D-M/D)"
     */
    function formatWeekLabel(date) {
        const weekStart = getWeekStart(date);
        const weekEnd = getWeekEnd(date);
        const weekNum = getWeekNumber(date);
        
        const startMonth = weekStart.getMonth() + 1;
        const startDay = weekStart.getDate();
        const endMonth = weekEnd.getMonth() + 1;
        const endDay = weekEnd.getDate();
        
        return `第${weekNum}周\n${startMonth}/${startDay}-${endMonth}/${endDay}`;
    }

    /**
     * 格式化月标签
     * @param {Date} date - 日期
     * @returns {string} 格式化的月标签 "YYYY年M月"
     */
    function formatMonthLabel(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return `${year}年\n${month}月`;
    }

    /**
     * 根据时间刻度生成日期数组
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @param {string} scale - 时间刻度 (day/week/month)
     * @returns {Array<Object>} 日期对象数组
     */
    function generateDatesByScale(startDate, endDate, scale) {
        const dates = [];
        let current = new Date(startDate);
        
        switch (scale) {
            case TimeScale.DAY:
                while (current <= endDate) {
                    dates.push({
                        date: new Date(current),
                        label: formatDate(current),
                        type: 'day',
                        span: 1
                    });
                    current = addDays(current, 1);
                }
                break;
                
            case TimeScale.WEEK:
                current = getWeekStart(current);
                while (current <= endDate) {
                    const weekEnd = getWeekEnd(current);
                    const actualEnd = weekEnd > endDate ? endDate : weekEnd;
                    const span = daysBetween(current, actualEnd) + 1;
                    
                    dates.push({
                        date: new Date(current),
                        label: formatWeekLabel(current),
                        type: 'week',
                        span: span,
                        weekStart: new Date(current),
                        weekEnd: new Date(weekEnd)
                    });
                    
                    current = addDays(weekEnd, 1);
                }
                break;
                
            case TimeScale.MONTH:
                current = getMonthStart(current);
                while (current <= endDate) {
                    const monthEnd = getMonthEnd(current);
                    const actualEnd = monthEnd > endDate ? endDate : monthEnd;
                    const span = daysBetween(current, actualEnd) + 1;
                    
                    dates.push({
                        date: new Date(current),
                        label: formatMonthLabel(current),
                        type: 'month',
                        span: span,
                        monthStart: new Date(current),
                        monthEnd: new Date(monthEnd)
                    });
                    
                    current.setMonth(current.getMonth() + 1);
                    current = getMonthStart(current);
                }
                break;
        }
        
        return dates;
    }

    /**
     * 根据时间刻度获取推荐的单元格宽度
     * @param {string} scale - 时间刻度
     * @returns {number} 推荐的单元格宽度（像素）
     */
    function getRecommendedCellWidth(scale) {
        switch (scale) {
            case TimeScale.DAY:
                return 50;
            case TimeScale.WEEK:
                return 80;
            case TimeScale.MONTH:
                return 100;
            default:
                return 50;
        }
    }

    /**
     * 计算任务在指定刻度下的位置和宽度
     * @param {Object} task - 任务对象
     * @param {Date} timelineStart - 时间轴开始日期
     * @param {string} scale - 时间刻度
     * @param {number} cellWidth - 单元格宽度
     * @returns {Object} {left, width} 位置和宽度（像素）
     */
    function calculateTaskPosition(task, timelineStart, scale, cellWidth) {
        const taskStart = new Date(task.start);
        const taskEnd = new Date(task.end);
        
        let startOffset, endOffset;
        
        switch (scale) {
            case TimeScale.DAY:
                startOffset = daysBetween(timelineStart, taskStart);
                endOffset = daysBetween(timelineStart, taskEnd) + 1;
                break;
                
            case TimeScale.WEEK:
                const weekStart = getWeekStart(timelineStart);
                startOffset = Math.floor(daysBetween(weekStart, taskStart) / 7);
                endOffset = Math.ceil(daysBetween(weekStart, taskEnd) / 7);
                break;
                
            case TimeScale.MONTH:
                const monthStart = getMonthStart(timelineStart);
                startOffset = (taskStart.getFullYear() - monthStart.getFullYear()) * 12 
                            + (taskStart.getMonth() - monthStart.getMonth());
                endOffset = (taskEnd.getFullYear() - monthStart.getFullYear()) * 12 
                          + (taskEnd.getMonth() - monthStart.getMonth()) + 1;
                break;
                
            default:
                startOffset = daysBetween(timelineStart, taskStart);
                endOffset = daysBetween(timelineStart, taskEnd) + 1;
        }
        
        const left = startOffset * cellWidth;
        const width = Math.max((endOffset - startOffset) * cellWidth, 60);
        
        return { left, width };
    }

    // 导出到全局
    global.TimeScale = TimeScale;
    global.getWeekStart = getWeekStart;
    global.getWeekEnd = getWeekEnd;
    global.getMonthStart = getMonthStart;
    global.getMonthEnd = getMonthEnd;
    global.getWeekNumber = getWeekNumber;
    global.formatWeekLabel = formatWeekLabel;
    global.formatMonthLabel = formatMonthLabel;
    global.generateDatesByScale = generateDatesByScale;
    global.getRecommendedCellWidth = getRecommendedCellWidth;
    global.calculateTaskPosition = calculateTaskPosition;

    console.log('✅ time-scale-utils.js loaded successfully');

})(typeof window !== 'undefined' ? window : this);
