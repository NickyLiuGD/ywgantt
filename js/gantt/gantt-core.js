// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图核心类定义                                                ▓▓
// ▓▓ 路径: js/gantt/gantt-core.js                                   ▓▓
// ▓▓ 版本: Epsilon32-SymmetricZoom - 逻辑对称版                     ▓▓
// ▓▓ 修复: 最大/最小缩放边界逻辑统一 + 完美标尺同步                 ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    const ROW_HEIGHT = 40;
    const HEADER_HEIGHT = 50;
    
    // ⭐ 定义视图标准常量
    const DEFAULT_CELL_WIDTH = 50; // 标准日视图宽度
    const MAX_DAY_WIDTH = 60;      // 最大放大上限 (允许比标准略大一点点，但不允许无限大)
    
    // 边距常量
    const LEFT_LABEL_SPACE = 120; 
    const RIGHT_PADDING = 50;     

    /**
     * GanttChart 构造函数
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
            timeScale: 'day',
            isOverviewMode: false,
            hideCompleted: false            
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

        // 默认视图下的前后缓冲
        this.startDate = addDays(dateRange.minDate, -3);
        this.endDate = addDays(dateRange.maxDate, 10);
    };

    /**
     * 生成日期数组
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
     * ⭐ 核心辅助：计算“完美适应屏幕”的最小宽度 (全貌视图)
     */
    GanttChart.prototype.calculateFitToScreenParams = function() {
        if (this.tasks.length === 0) return null;

        const container = this.container.querySelector('.gantt-rows-container');
        if (!container) return null;

        // 1. 确定项目真实边界
        let minDate = new Date(this.tasks[0].start);
        let maxDate = new Date(this.tasks[0].end);
        
        this.tasks.forEach(task => {
            const start = new Date(task.start);
            const end = new Date(task.end);
            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;
        });

        // 2. 计算项目总跨度 (天)
        const projectDays = daysBetween(minDate, maxDate) + 1;
        
        // 3. 计算可用像素宽度
        const containerWidth = container.clientWidth;
        const availableWidth = containerWidth - LEFT_LABEL_SPACE - RIGHT_PADDING;
        
        // 4. 计算刚好铺满的 cellWidth (下限)
        let fitCellWidth = availableWidth / projectDays;
        
        // 绝对最小值保护 (防止除以0或负数)
        fitCellWidth = Math.max(0.1, fitCellWidth);

        return {
            cellWidth: fitCellWidth,
            minDate: minDate,
            maxDate: maxDate,
            projectDays: projectDays
        };
    };

    /**
     * 切换到项目全貌视图 (Min Zoom)
     */
    GanttChart.prototype.switchToOverviewMode = function() {
        const fitParams = this.calculateFitToScreenParams();
        if (!fitParams) {
            addLog('❌ 无法计算全貌视图参数');
            return;
        }

        // 1. 获取下限宽度
        let optimalCellWidth = fitParams.cellWidth;
        
        // 如果项目极短（比如1天），全貌视图不应该让格子巨大无比，限制为标准日宽
        optimalCellWidth = Math.min(optimalCellWidth, MAX_DAY_WIDTH); 

        // 2. 根据宽度自动选择刻度层级
        let scale = 'week';
        if (optimalCellWidth >= 30) {
            scale = 'day';
        } else if (optimalCellWidth <= 5) {
            scale = 'month';
        }
        
        // 3. 应用设置
        this.options.timeScale = scale;
        this.options.cellWidth = optimalCellWidth;
        this.options.isOverviewMode = true;
        
        // 4. 调整日期范围：左侧向后推，留出空间
        const leftLabelDays = Math.ceil(LEFT_LABEL_SPACE / optimalCellWidth);
        this.startDate = addDays(fitParams.minDate, -leftLabelDays);
        this.endDate = new Date(fitParams.maxDate);
        
        // 5. 渲染
        this.render();
        
        // 6. 滚动归零
        requestAnimationFrame(() => {
            const rowsContainer = this.container.querySelector('.gantt-rows-container');
            if (rowsContainer) rowsContainer.scrollLeft = 0;
        });
        
        const scaleNames = { 'day': '日', 'week': '周', 'month': '月' };
        addLog(`🔭 全貌视图 (${scaleNames[scale]}模式, ${optimalCellWidth.toFixed(2)}px/天)`);
    };

    /**
     * 退出全貌视图 (Reset to Default)
     */
    GanttChart.prototype.exitOverviewMode = function() {
        this.options.isOverviewMode = false;
        this.calculateDateRange();
        this.options.timeScale = 'day';
        this.options.cellWidth = DEFAULT_CELL_WIDTH; // 恢复为 50px
        this.render();
        addLog('✅ 已退出全貌视图');
    };

    /**
     * ⭐⭐⭐ 处理滚轮缩放逻辑 (Symmetric Zoom) ⭐⭐⭐
     */
    GanttChart.prototype.handleWheelZoom = function(delta, mouseX, containerWidth) {
        // 1. 获取缩放边界
        // 下限 (Min): 全貌视图宽度
        const fitParams = this.calculateFitToScreenParams();
        const LIMIT_MIN_WIDTH = fitParams ? fitParams.cellWidth : 0.5; 
        
        // 上限 (Max): 标准日视图宽度 (60px)
        const LIMIT_MAX_WIDTH = MAX_DAY_WIDTH; 

        const oldScale = this.options.timeScale;
        const oldCellWidth = this.options.cellWidth;
        
        // 2. 锁定锚点
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        const header = this.container.querySelector('.gantt-timeline-header');
        if (!rowsContainer) return;

        const scrollLeft = rowsContainer.scrollLeft;
        const mouseDateOffset = (scrollLeft + mouseX) / oldCellWidth;

        // 3. 计算新宽度 (平滑系数)
        const ZOOM_FACTOR = 1.05;
        let newCellWidth = delta < 0 ? oldCellWidth / ZOOM_FACTOR : oldCellWidth * ZOOM_FACTOR;

        // 4. 应用统一边界 (关键修复)
        if (newCellWidth < LIMIT_MIN_WIDTH) newCellWidth = LIMIT_MIN_WIDTH;
        if (newCellWidth > LIMIT_MAX_WIDTH) newCellWidth = LIMIT_MAX_WIDTH;

        // 如果宽度到达边界未变化，直接返回
        if (Math.abs(newCellWidth - oldCellWidth) < 0.001) return;

        // 5. 判断视图层级切换 (Day <-> Week <-> Month)
        let newScale = oldScale;
        
        if (newCellWidth > 25) {
            newScale = 'day';
        } else if (newCellWidth > 5) {
            newScale = 'week';
        } else {
            newScale = 'month';
        }

        // 手动缩放时，退出全貌模式标记
        if (this.options.isOverviewMode) {
            this.options.isOverviewMode = false;
        }

        // 6. 应用变更
        this.options.timeScale = newScale;
        this.options.cellWidth = newCellWidth;
        
        // 7. 渲染
        this.render();

        // 8. 强制同步滚动位置 (消除标尺错位)
        requestAnimationFrame(() => {
            const newRowsContainer = this.container.querySelector('.gantt-rows-container');
            const newHeader = this.container.querySelector('.gantt-timeline-header');
            
            if (newRowsContainer) {
                const newScrollLeft = (mouseDateOffset * newCellWidth) - mouseX;
                
                newRowsContainer.style.scrollBehavior = 'auto'; 
                if (newHeader) newHeader.style.scrollBehavior = 'auto';

                newRowsContainer.scrollLeft = newScrollLeft;
                if (newHeader) {
                    newHeader.scrollLeft = newScrollLeft;
                }
            }
        });
    };

    /**
     * HTML 转义
     */
    GanttChart.prototype.escapeHtml = function(text) {
        if (typeof text !== 'string') return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    };

    /**
     * 销毁实例
     */
    GanttChart.prototype.destroy = function() {
        if (this._mouseMoveHandler) document.removeEventListener('mousemove', this._mouseMoveHandler);
        if (this._mouseUpHandler) document.removeEventListener('mouseup', this._mouseUpHandler);
        if (this.container) this.container.innerHTML = '';
        this.tasks = null;
        this.container = null;
        this._cachedElements = null;
        this._dateCache = null;
        console.log('GanttChart instance destroyed');
    };

    // 导出到全局
    global.GanttChart = GanttChart;
    global.ROW_HEIGHT = ROW_HEIGHT;
    global.HEADER_HEIGHT = HEADER_HEIGHT;

    console.log('✅ gantt-core.js loaded successfully (Epsilon32-SymmetricZoom)');

})(typeof window !== 'undefined' ? window : this);