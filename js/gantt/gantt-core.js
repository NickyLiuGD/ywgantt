// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图核心类定义                                                ▓▓
// ▓▓ 路径: js/gantt/gantt-core.js                                   ▓▓
// ▓▓ 版本: Delta8 - 支持项目全貌视图（包容左侧标签）                ▓▓
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
            hideCompleted: false // ⭐ 新增：默认不隐藏已完成任务            
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
     * ⭐ 切换到项目全貌视图（修复版 - 包容左侧时间标签）
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
        
        // 2. 计算项目总天数
        const projectDays = daysBetween(minDate, maxDate) + 1;
        
        // 3. 获取容器宽度
        const container = this.container.querySelector('.gantt-rows-container');
        if (!container) {
            addLog('❌ 无法获取容器宽度');
            return;
        }
        
        const containerWidth = container.clientWidth;
        
        // ⭐ 4. 预留空间（包括左侧时间标签）
        const leftTimeLabelWidth = 100;
        const leftLabelMargin = 20;
        const rightLabelSpace = 150;
        const scrollbarSpace = 20;
        
        const totalReservedSpace = leftTimeLabelWidth + leftLabelMargin + rightLabelSpace + scrollbarSpace;
        const availableWidth = containerWidth - totalReservedSpace;
        
        // 5. 计算最优 cellWidth
        let optimalCellWidth = Math.floor(availableWidth / projectDays);
        
        // 6. 限制范围
        const minCellWidth = 2;
        const maxCellWidth = 50;
        optimalCellWidth = Math.max(minCellWidth, Math.min(optimalCellWidth, maxCellWidth));
        
        // 7. 选择时间刻度
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
        
        // ⭐ 9. 向左扩展日期范围（包容左侧标签）
        const leftLabelDays = Math.ceil((leftTimeLabelWidth + leftLabelMargin) / optimalCellWidth);
        this.startDate = addDays(minDate, -leftLabelDays);
        this.endDate = new Date(maxDate);
        
        // 10. 重新渲染
        this.render();
        
        // 11. 滚动到最左侧
        setTimeout(() => {
            const rowsContainer = this.container.querySelector('.gantt-rows-container');
            if (rowsContainer) {
                rowsContainer.scrollLeft = 0;
            }
        }, 100);
        
        // 12. 详细日志
        const scaleNames = { 'day': '日', 'week': '周', 'month': '月' };
        addLog(`╔═══════════════════════════════════════════════════════════╗`);
        addLog(`║  🔭 已切换到项目全貌视图                                  ║`);
        addLog(`╠═══════════════════════════════════════════════════════════╣`);
        addLog(`  📊 项目周期: ${projectDays} 天`);
        addLog(`  📅 任务范围: ${formatDate(minDate)} - ${formatDate(maxDate)}`);
        addLog(`  🔄 视图范围: ${formatDate(this.startDate)} - ${formatDate(this.endDate)}`);
        addLog(`  📏 时间刻度: ${scaleNames[scale]}视图 (${optimalCellWidth}px/天)`);
        addLog(`  📐 可用宽度: ${availableWidth}px`);
        addLog(`  🖥️ 容器宽度: ${containerWidth}px`);
        addLog(`  ◀️ 左侧预留: ${leftTimeLabelWidth + leftLabelMargin}px`);
        addLog(`  ▶️ 右侧预留: ${rightLabelSpace}px`);
        addLog(`  📍 左扩展: ${leftLabelDays} 天`);
        addLog(`╚═══════════════════════════════════════════════════════════╝`);
    };

    /**
     * 退出全貌视图
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
     * HTML 转义
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
     * 处理滚轮缩放逻辑
     * @param {number} delta - 滚轮增量 (+1 或 -1)
     * @param {number} mouseX - 鼠标相对于容器左侧的 X 坐标
     * @param {number} containerWidth - 容器宽度
     */
    GanttChart.prototype.handleWheelZoom = function(delta, mouseX, containerWidth) {
        const oldScale = this.options.timeScale;
        const oldCellWidth = this.options.cellWidth;
        
        // 1. 计算鼠标当前指向的时间点 (锚点)
        // 当前滚动位置 + 鼠标偏移 = 绝对像素位置
        // 绝对像素位置 / 旧单元格宽度 = 距离开始日期的天数
        const scrollLeft = this.container.querySelector('.gantt-rows-container').scrollLeft;
        const mouseDateOffset = (scrollLeft + mouseX) / oldCellWidth;

        // 2. 定义缩放系数和阈值
        const ZOOM_FACTOR = 1.1; // 每次缩放 10%
        
        // 阈值定义 (像素/天)
        // 日视图标准: 50px
        // 周视图标准: ~12px (84px/周) -> 2倍即 24px
        // 月视图标准: ~4px
        const THRESHOLD_DAY_TO_WEEK = 24; 
        const THRESHOLD_WEEK_TO_MONTH = 6;
        const MAX_CELL_WIDTH = 100; // 日视图最大宽度

        // 计算全貌视图的最小宽度作为底线
        const overviewParams = typeof calculateOverviewParams === 'function' ? 
            calculateOverviewParams(this.tasks, containerWidth) : { cellWidth: 2 };
        const MIN_CELL_WIDTH = overviewParams ? overviewParams.cellWidth : 1;

        // 3. 计算新的 CellWidth
        let newCellWidth = oldCellWidth;
        let newScale = oldScale;

        if (delta < 0) {
            // 缩小 (Zoom Out)
            newCellWidth = oldCellWidth / ZOOM_FACTOR;
        } else {
            // 放大 (Zoom In)
            newCellWidth = oldCellWidth * ZOOM_FACTOR;
        }

        // 4. 判断是否需要切换视图层级
        if (oldScale === 'day') {
            if (newCellWidth < THRESHOLD_DAY_TO_WEEK) {
                newScale = 'week';
                // 保持视觉连续性，切换瞬间宽度不要跳变太大
            } else if (newCellWidth > MAX_CELL_WIDTH) {
                newCellWidth = MAX_CELL_WIDTH;
            }
        } else if (oldScale === 'week') {
            if (newCellWidth > THRESHOLD_DAY_TO_WEEK) {
                newScale = 'day';
            } else if (newCellWidth < THRESHOLD_WEEK_TO_MONTH) {
                newScale = 'month';
            }
        } else if (oldScale === 'month') {
            if (newCellWidth > THRESHOLD_WEEK_TO_MONTH) {
                newScale = 'week';
            } else if (newCellWidth < MIN_CELL_WIDTH) {
                // 限制最小缩放为全貌视图尺寸
                newCellWidth = MIN_CELL_WIDTH;
                // 如果已经很小，可能触发全貌模式
                if (!this.options.isOverviewMode) {
                    this.switchToOverviewMode();
                    return; // 全貌模式处理接管
                }
            }
        }

        // 如果从全貌模式放大，退出全貌模式
        if (this.options.isOverviewMode && delta > 0) {
            this.options.isOverviewMode = false;
            newScale = 'month';
            newCellWidth = MIN_CELL_WIDTH * 1.2;
        }

        // 5. 应用变更并重新渲染
        this.options.timeScale = newScale;
        this.options.cellWidth = newCellWidth;
        
        this.render(); // 重新渲染 DOM

        // 6. 恢复滚动位置 (保持锚点不动)
        // 新的绝对像素位置 = 天数 * 新单元格宽度
        // 新 ScrollLeft = 新绝对位置 - 鼠标偏移
        const newScrollLeft = (mouseDateOffset * newCellWidth) - mouseX;
        
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        if (rowsContainer) {
            rowsContainer.scrollLeft = newScrollLeft;
        }
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

    console.log('✅ gantt-core.js loaded successfully (Delta8 - 全貌视图修复版)');

})(typeof window !== 'undefined' ? window : this);

