// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图核心类定义                                                ▓▓
// ▓▓ 路径: js/gantt/gantt-core.js                                   ▓▓
// ▓▓ 版本: Delta8 - 支持项目全貌视图                                ▓▓
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
            timeScale: 'day', // day/week/month/overview
            isOverviewMode: false // ⭐ 新增：是否为全貌视图模式
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
     * ⭐ 切换到项目全貌视图
     * 自动调整时间轴宽度以适应浏览器窗口
     */
    GanttChart.prototype.switchToOverviewMode = function() {
        if (this.tasks.length === 0) {
            addLog('❌ 无任务数据，无法切换到全貌视图');
            return;
        }

        // 1. 计算项目的实际日期范围
        let minDate = new Date(this.tasks[0].start);
        let maxDate = new Date(this.tasks[0].end);
        
        this.tasks.forEach(task => {
            const start = new Date(task.start);
            const end = new Date(task.end);
            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;
        });
        
        // 2. 计算项目总天数
        const projectDays = daysBetween(minDate, maxDate) + 1;
        
        // 3. 获取可用宽度
        const container = this.container.querySelector('.gantt-rows-container');
        if (!container) {
            addLog('❌ 无法获取容器宽度');
            return;
        }
        
        // 获取容器宽度
        const containerWidth = container.clientWidth;
        
        // 4. 预留左右标签空间
        const leftLabelSpace = 120;  // 左侧时间标签预留空间
        const rightLabelSpace = 150; // 右侧任务名称标签预留空间
        const scrollbarSpace = 20;   // 滚动条空间
        
        const availableWidth = containerWidth - leftLabelSpace - rightLabelSpace - scrollbarSpace;
        
        // 5. 计算最优的 cellWidth（每天的像素宽度）
        let optimalCellWidth = Math.floor(availableWidth / projectDays);
        
        // 6. 限制 cellWidth 的范围
        const minCellWidth = 2;   // 最小 2px/天
        const maxCellWidth = 50;  // 最大 50px/天
        
        optimalCellWidth = Math.max(minCellWidth, Math.min(optimalCellWidth, maxCellWidth));
        
        // 7. 根据 cellWidth 选择合适的时间刻度
        let scale = 'week';
        if (optimalCellWidth >= 30) {
            scale = 'day';
        } else if (optimalCellWidth <= 3) {
            scale = 'month';
        }
        
        // 8. 应用设置
        this.options.timeScale = scale;
        this.options.cellWidth = optimalCellWidth;
        this.options.isOverviewMode = true;
        
        // 9. 重新计算日期范围（不添加额外的前后空白）
        this.startDate = new Date(minDate);
        this.endDate = new Date(maxDate);
        
        // 10. 重新渲染
        this.render();
        
        // 11. 记录日志
        const scaleNames = { 'day': '日', 'week': '周', 'month': '月' };
        addLog(`✅ 已切换到全貌视图`);
        addLog(`   📊 项目周期: ${projectDays} 天`);
        addLog(`   📅 日期范围: ${formatDate(minDate)} - ${formatDate(maxDate)}`);
        addLog(`   📏 时间刻度: ${scaleNames[scale]}视图 (${optimalCellWidth}px/天)`);
        addLog(`   📐 可用宽度: ${availableWidth}px`);
        addLog(`   🖥️ 容器宽度: ${containerWidth}px`);
    };

    /**
     * ⭐ 退出全貌视图，恢复正常视图
     */
    GanttChart.prototype.exitOverviewMode = function() {
        this.options.isOverviewMode = false;
        this.calculateDateRange();
        this.options.timeScale = 'day';
        this.options.cellWidth = getRecommendedCellWidth('day');
        this.render();
        addLog('✅ 已退出全貌视图');
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

    console.log('✅ gantt-core.js loaded successfully (Delta8 - 支持全貌视图)');

})(typeof window !== 'undefined' ? window : this);
