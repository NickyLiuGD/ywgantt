// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图核心类定义                                                ▓▓
// ▓▓ 路径: js/gantt/gantt-core.js                                   ▓▓
// ▓▓ 版本: Epsilon34-FullRestore - 逻辑完整复原版                   ▓▓
// ▓▓ 修复: 缩放强制重绘 + 标尺同步 + 动态边界 + 找回所有原有逻辑    ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    const ROW_HEIGHT = 40;
    const HEADER_HEIGHT = 50;
    
    // 定义视图标准常量
    const DEFAULT_CELL_WIDTH = 50; 
    const MAX_DAY_WIDTH = 60;      // 最大放大上限 (60px)
    
    // 边距常量 (与 render 模块保持一致)
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
     * ⭐ 核心辅助：计算“完美适应屏幕”的最小宽度
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
        
        // 绝对最小值保护
        fitCellWidth = Math.max(0.1, fitCellWidth);

        return {
            cellWidth: fitCellWidth,
            minDate: minDate,
            maxDate: maxDate,
            projectDays: projectDays,
            availableWidth: availableWidth,
            containerWidth: containerWidth
        };
    };

    /**
     * 切换到项目全貌视图 (完整逻辑回归)
     */
    GanttChart.prototype.switchToOverviewMode = function() {
        const fitParams = this.calculateFitToScreenParams();
        if (!fitParams) {
            addLog('❌ 无法计算全貌视图参数');
            return;
        }

        // 1. 获取下限宽度
        let optimalCellWidth = fitParams.cellWidth;
        
        // 限制按钮触发的最大宽度，防止极短项目全屏过大
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
        
        // 4. 调整日期范围
        const leftLabelDays = Math.ceil(LEFT_LABEL_SPACE / optimalCellWidth);
        this.startDate = addDays(fitParams.minDate, -leftLabelDays);
        this.endDate = new Date(fitParams.maxDate);
        
        // 5. 渲染
        this.render();
        
        // 6. 滚动归零
        requestAnimationFrame(() => {
            const rowsContainer = this.container.querySelector('.gantt-rows-container');
            if (rowsContainer) {
                rowsContainer.scrollLeft = 0;
            }
        });
        
        // 7. 详细日志 (恢复)
        const scaleNames = { 'day': '日', 'week': '周', 'month': '月' };
        addLog(`╔═══════════════════════════════════════════════════════════╗`);
        addLog(`║  🔭 已切换到项目全貌视图                                  ║`);
        addLog(`╠═══════════════════════════════════════════════════════════╣`);
        addLog(`  📊 项目周期: ${fitParams.projectDays} 天`);
        addLog(`  📅 任务范围: ${formatDate(fitParams.minDate)} - ${formatDate(fitParams.maxDate)}`);
        addLog(`  🔄 视图范围: ${formatDate(this.startDate)} - ${formatDate(this.endDate)}`);
        addLog(`  📏 时间刻度: ${scaleNames[scale]}视图 (${optimalCellWidth.toFixed(2)}px/天)`);
        addLog(`  📐 可用宽度: ${fitParams.availableWidth.toFixed(0)}px`);
        addLog(`  🖥️ 容器宽度: ${fitParams.containerWidth}px`);
        addLog(`╚═══════════════════════════════════════════════════════════╝`);
    };

    /**
     * 退出全貌视图 (恢复)
     */
    GanttChart.prototype.exitOverviewMode = function() {
        this.options.isOverviewMode = false;
        this.calculateDateRange();
        this.options.timeScale = 'day';
        this.options.cellWidth = DEFAULT_CELL_WIDTH; // 恢复默认 50px
        this.render();
        addLog('✅ 已退出全貌视图');
    };

    /**
     * ⭐⭐⭐ 处理滚轮缩放逻辑 (逻辑对称 + 强制重绘) ⭐⭐⭐
     */
    GanttChart.prototype.handleWheelZoom = function(delta, mouseX, containerWidth) {
        // 1. 获取缩放边界
        const fitParams = this.calculateFitToScreenParams();
        // 下限 (Min): 全貌视图宽度
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

        // 4. 应用统一边界
        if (newCellWidth < LIMIT_MIN_WIDTH) newCellWidth = LIMIT_MIN_WIDTH;
        if (newCellWidth > LIMIT_MAX_WIDTH) newCellWidth = LIMIT_MAX_WIDTH;

        if (Math.abs(newCellWidth - oldCellWidth) < 0.001) return;

        // 5. 判断视图层级切换
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

        // 8. ⭐ 关键修复：强制浏览器 Reflow (Layout Calculation)
        // 强制读取 offsetWidth，迫使浏览器立即计算新 DOM 的位置
        // 确保接下来的 scrollLeft 是基于新宽度的
        void rowsContainer.offsetWidth; 

        // 9. 强制同步滚动位置 (消除标尺错位)
        const newScrollLeft = (mouseDateOffset * newCellWidth) - mouseX;
        
        // 暂时禁用平滑滚动，实现瞬时对齐
        rowsContainer.style.scrollBehavior = 'auto'; 
        if (header) header.style.scrollBehavior = 'auto';

        rowsContainer.scrollLeft = newScrollLeft;
        if (header) header.scrollLeft = newScrollLeft;
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

    console.log('✅ gantt-core.js loaded successfully (Epsilon34-FullRestore)');

})(typeof window !== 'undefined' ? window : this);