// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图核心类定义                                                ▓▓
// ▓▓ 路径: js/gantt/gantt-core.js                                   ▓▓
// ▓▓ 版本: Delta6 - 支持时间刻度缩放                                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    const ROW_HEIGHT = 40;
    const HEADER_HEIGHT = 50;
    const DEFAULT_CELL_WIDTH = 50;

    /**
     * GanttChart 构造函数
     * @param {string} selector - 容器选择器
     * @param {Array} tasks - 任务数组
     * @param {Object} options - 配置选项
     */
    function GanttChart(selector, tasks, options) {
        if (!selector) {
            throw new Error('GanttChart: selector is required');
        }

        this.selector = selector;
        this.tasks = Array.isArray(tasks) ? tasks : [];
        this.options = Object.assign({
            cellWidth: DEFAULT_CELL_WIDTH,
            showWeekends: true,
            enableEdit: true,
            enableResize: true,
            showDependencies: true,
            showTaskNames: true,
            timeScale: 'day' // ⭐ 新增：时间刻度 (day/week/month)
        }, options || {});

        this.selectedTask = null;
        this.dragState = null;
        this._cachedElements = {};
        
        this.init();
    }

    /**
     * 初始化甘特图
     */
    GanttChart.prototype.init = function() {
        this.container = document.querySelector(this.selector);
        
        if (!this.container) {
            console.error(`GanttChart: Container "${this.selector}" not found`);
            return;
        }

        this.calculateDateRange();
        this.render();
    };

    /**
     * 计算日期范围
     */
    GanttChart.prototype.calculateDateRange = function() {
        if (this.tasks.length === 0) {
            this.startDate = new Date();
            this.endDate = addDays(this.startDate, 30);
            return;
        }

        const dateRange = this.tasks.reduce((acc, task) => {
            const start = new Date(task.start);
            const end = new Date(task.end || task.start);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.warn(`Invalid date for task: ${task.name}`);
                return acc;
            }
            
            if (!acc.minDate || start < acc.minDate) acc.minDate = start;
            if (!acc.maxDate || end > acc.maxDate) acc.maxDate = end;
            
            return acc;
        }, { minDate: null, maxDate: null });

        this.startDate = addDays(dateRange.minDate, -3);
        this.endDate = addDays(dateRange.maxDate, 10);
    };

    /**
     * 生成日期数组（支持不同时间刻度）
     * @returns {Array<Object>} 日期对象数组
     */
    GanttChart.prototype.generateDates = function() {
        const scale = this.options.timeScale || 'day';
        const cacheKey = `${this.startDate.getTime()}_${this.endDate.getTime()}_${scale}`;
        
        if (this._dateCache && this._dateCache.key === cacheKey) {
            return this._dateCache.dates;
        }

        const dates = generateDatesByScale(this.startDate, this.endDate, scale);
        this._dateCache = { key: cacheKey, dates: dates };
        
        return dates;
    };

    /**
     * HTML 转义工具函数
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    GanttChart.prototype.escapeHtml = function(text) {
        if (typeof text !== 'string') return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, m => map[m]);
    };

    /**
     * 销毁实例
     */
    GanttChart.prototype.destroy = function() {
        if (this._mouseMoveHandler) {
            document.removeEventListener('mousemove', this._mouseMoveHandler);
        }
        if (this._mouseUpHandler) {
            document.removeEventListener('mouseup', this._mouseUpHandler);
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.tasks = null;
        this.container = null;
        this._cachedElements = null;
        this._dateCache = null;
        
        console.log('GanttChart instance destroyed');
    };

    global.GanttChart = GanttChart;
    global.ROW_HEIGHT = ROW_HEIGHT;
    global.HEADER_HEIGHT = HEADER_HEIGHT;

    console.log('✅ gantt-core.js loaded successfully (Delta6 - 支持时间刻度)');

})(typeof window !== 'undefined' ? window : this);
