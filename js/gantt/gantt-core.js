// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图核心类定义                                                ▓▓
// ▓▓ 路径: js/gantt/gantt-core.js                                   ▓▓
// ▓▓ 版本: Epsilon30-ZoomPerfect - 完美缩放版                       ▓▓
// ▓▓ 修复: 动态缩放边界 + 标尺严格同步 + 移除跳变                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    const ROW_HEIGHT = 40;
    const HEADER_HEIGHT = 50;
    const DEFAULT_CELL_WIDTH = 50;

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
     * 切换到项目全貌视图
     */
    GanttChart.prototype.switchToOverviewMode = function() {
        if (this.tasks.length === 0) {
            addLog('❌ 无任务数据，无法切换到全貌视图');
            return;
        }

        // 1. 计算项目实际日期范围
        let minDate = new Date(this.tasks[0].start);
        let maxDate = new Date(this.tasks[0].end);
        
        this.tasks.forEach(task => {
            const start = new Date(task.start);
            const end = new Date(task.end);
            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;
        });
        
        const projectDays = daysBetween(minDate, maxDate) + 1;
        
        // 2. 获取容器宽度
        const container = this.container.querySelector('.gantt-rows-container');
        if (!container) {
            addLog('❌ 无法获取容器宽度');
            return;
        }
        
        const containerWidth = container.clientWidth;
        
        // 3. 预留空间（包括左侧时间标签）
        const leftTimeLabelWidth = 100;
        const leftLabelMargin = 20;
        const rightLabelSpace = 150;
        const scrollbarSpace = 20;
        
        const totalReservedSpace = leftTimeLabelWidth + leftLabelMargin + rightLabelSpace + scrollbarSpace;
        const availableWidth = containerWidth - totalReservedSpace;
        
        // 4. 计算最优 cellWidth
        let optimalCellWidth = Math.floor(availableWidth / projectDays);
        
        // 限制范围
        const minCellWidth = 0.5; // 允许更小，适应超长项目
        const maxCellWidth = 60;
        optimalCellWidth = Math.max(minCellWidth, Math.min(optimalCellWidth, maxCellWidth));
        
        // 5. 选择时间刻度
        let scale = 'week';
        if (optimalCellWidth >= 30) {
            scale = 'day';
        } else if (optimalCellWidth <= 5) {
            scale = 'month';
        }
        
        // 6. 应用设置
        this.options.timeScale = scale;
        this.options.cellWidth = optimalCellWidth;
        this.options.isOverviewMode = true;
        
        // 7. 向左扩展日期范围（包容左侧标签）
        const leftLabelDays = Math.ceil((leftTimeLabelWidth + leftLabelMargin) / optimalCellWidth);
        this.startDate = addDays(minDate, -leftLabelDays);
        this.endDate = new Date(maxDate);
        
        // 8. 重新渲染
        this.render();
        
        // 9. 滚动到最左侧
        requestAnimationFrame(() => {
            const rowsContainer = this.container.querySelector('.gantt-rows-container');
            if (rowsContainer) {
                rowsContainer.scrollLeft = 0;
            }
        });
        
        const scaleNames = { 'day': '日', 'week': '周', 'month': '月' };
        addLog(`🔭 全貌视图 (${scaleNames[scale]}模式, ${optimalCellWidth.toFixed(2)}px/天)`);
    };

    /**
     * 退出全貌视图
     */
    GanttChart.prototype.exitOverviewMode = function() {
        this.options.isOverviewMode = false;
        this.calculateDateRange();
        this.options.timeScale = 'day';
        this.options.cellWidth = 50;
        this.render();
        addLog('✅ 已退出全貌视图');
    };

    /**
     * ⭐⭐⭐ 处理滚轮缩放逻辑 (完美修复版) ⭐⭐⭐
     */
    GanttChart.prototype.handleWheelZoom = function(delta, mouseX, containerWidth) {
        // 1. 动态计算缩放边界 (Critical Fix)
        // 下限：基于当前项目总工期，计算出能铺满屏幕的最小宽度 (即全貌视图宽度)
        const daysCount = daysBetween(this.startDate, this.endDate) || 30;
        // 预留一些边距，防止完全贴边
        const dynamicMinWidth = (containerWidth - 100) / daysCount; 
        
        // 绝对限制
        const LIMIT_MIN_WIDTH = Math.max(0.1, dynamicMinWidth); // 绝不小于全貌
        const LIMIT_MAX_WIDTH = 60; // 绝不大于舒适的日视图 (60px)

        const oldScale = this.options.timeScale;
        const oldCellWidth = this.options.cellWidth;
        
        // 2. 锁定锚点
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        const header = this.container.querySelector('.gantt-timeline-header');
        if (!rowsContainer) return;

        const scrollLeft = rowsContainer.scrollLeft;
        const mouseDateOffset = (scrollLeft + mouseX) / oldCellWidth;

        // 3. 计算新宽度 (更平滑的系数)
        const ZOOM_FACTOR = 1.05; // 5% 的变化率，更平滑
        let newCellWidth = delta < 0 ? oldCellWidth / ZOOM_FACTOR : oldCellWidth * ZOOM_FACTOR;

        // 4. 应用边界限制 (Fix Issue 2)
        if (newCellWidth < LIMIT_MIN_WIDTH) newCellWidth = LIMIT_MIN_WIDTH;
        if (newCellWidth > LIMIT_MAX_WIDTH) newCellWidth = LIMIT_MAX_WIDTH;

        // 如果宽度没变（到了边界），直接返回，节省性能
        if (Math.abs(newCellWidth - oldCellWidth) < 0.01) return;

        // 5. 判断视图层级切换
        // 调整了阈值，避免频繁跳动
        let newScale = oldScale;
        
        // 逻辑：
        // Day: > 25px
        // Week: 5px - 25px
        // Month: < 5px
        if (newCellWidth > 25) {
            newScale = 'day';
        } else if (newCellWidth > 5) {
            newScale = 'week';
        } else {
            newScale = 'month';
        }

        // 退出全貌标记
        if (this.options.isOverviewMode) {
            this.options.isOverviewMode = false;
        }

        // 6. 应用变更
        this.options.timeScale = newScale;
        this.options.cellWidth = newCellWidth;
        
        // 7. 渲染
        this.render();

        // 8. ⭐ 强制同步滚动位置 (Fix Issue 1)
        // 使用 requestAnimationFrame 确保 DOM 重绘完成后再设置 scrollLeft
        // 这解决了标尺和内容短暂不同步的问题
        requestAnimationFrame(() => {
            // 重新获取容器（防止引用丢失）
            const newRowsContainer = this.container.querySelector('.gantt-rows-container');
            const newHeader = this.container.querySelector('.gantt-timeline-header');
            
            if (newRowsContainer) {
                const newScrollLeft = (mouseDateOffset * newCellWidth) - mouseX;
                
                // 强制去除平滑滚动，实现瞬时同步
                newRowsContainer.style.scrollBehavior = 'auto'; 
                if (newHeader) newHeader.style.scrollBehavior = 'auto';

                newRowsContainer.scrollLeft = newScrollLeft;
                if (newHeader) {
                    newHeader.scrollLeft = newScrollLeft;
                }
                
                // 恢复平滑滚动（可选，如果不想要平滑滚动可去掉）
                // requestAnimationFrame(() => {
                //    newRowsContainer.style.scrollBehavior = 'smooth';
                // });
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

    console.log('✅ gantt-core.js loaded successfully (Epsilon30-ZoomPerfect)');

})(typeof window !== 'undefined' ? window : this);