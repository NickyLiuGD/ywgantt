/**
 * 甘特图核心类
 * 负责甘特图的渲染和数据管理
 * 版本: NewBeta7 - 优化版
 */

(function(global) {
    'use strict';

    /**
     * GanttChart 构造函数
     * @param {string} selector - 容器选择器
     * @param {Array} tasks - 任务数组
     * @param {Object} options - 配置选项
     */
    function GanttChart(selector, tasks, options) {
        // 参数验证
        if (!selector) {
            throw new Error('GanttChart: selector is required');
        }

        this.selector = selector;
        this.tasks = Array.isArray(tasks) ? tasks : [];
        this.options = Object.assign({
            cellWidth: 60,
            showWeekends: true,
            enableEdit: true,
            enableResize: true,
            showDependencies: true
        }, options || {});

        this.selectedTask = null;
        this.dragState = null;
        
        // 缓存常用的 DOM 查询
        this._cachedElements = {};
        
        // 初始化
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
     * 优化：添加边界检查和性能优化
     */
    GanttChart.prototype.calculateDateRange = function() {
        if (this.tasks.length === 0) {
            this.startDate = new Date();
            this.endDate = addDays(this.startDate, 30);
            return;
        }

        // 使用 reduce 优化日期计算
        const dateRange = this.tasks.reduce((acc, task) => {
            const start = new Date(task.start);
            const end = new Date(task.end || task.start);
            
            // 验证日期有效性
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
     * 优化：添加缓存机制，避免重复计算
     * @returns {Array<Date>} 日期数组
     */
    GanttChart.prototype.generateDates = function() {
        const cacheKey = `${this.startDate.getTime()}_${this.endDate.getTime()}`;
        
        if (this._dateCache && this._dateCache.key === cacheKey) {
            return this._dateCache.dates;
        }

        const dates = [];
        let current = new Date(this.startDate);
        
        while (current <= this.endDate) {
            dates.push(new Date(current));
            current = addDays(current, 1);
        }

        // 缓存结果
        this._dateCache = { key: cacheKey, dates: dates };
        
        return dates;
    };

    /**
     * 渲染甘特图
     * 优化：使用 DocumentFragment 和模板字符串优化
     */
    GanttChart.prototype.render = function() {
        if (!this.container) {
            console.error('GanttChart: Container not found, cannot render');
            return;
        }

        const dates = this.generateDates();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        
        // 使用模板字符串构建 HTML（保持原有结构）
        const html = `
            <div class="gantt-wrapper">
                <div class="gantt-sidebar">
                    <div class="gantt-sidebar-header">任务名称</div>
                    <div class="gantt-sidebar-body" id="ganttSidebarBody">
                        ${this.renderTaskNames()}
                    </div>
                </div>
                <div class="gantt-timeline-wrapper">
                    <div class="gantt-timeline">
                        <div class="gantt-timeline-header" id="ganttTimelineHeader">
                            ${this.renderDateHeaders(dates, weekdays)}
                        </div>
                        <div class="gantt-rows-container" id="ganttRowsContainer">
                            <div class="gantt-rows">
                                ${this.renderTaskRows(dates)}
                            </div>
                            <svg class="gantt-dependencies" style="position: absolute; top: 0; left: 0; pointer-events: none;"></svg>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // 设置滚动同步
        this.setupScrollSync();

        // 渲染依赖关系
        this.renderDependencies(dates);

        // 绑定事件
        this.attachEvents();
    };

    /**
     * 渲染任务名称列表
     * 优化：提取为独立方法
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderTaskNames = function() {
        return this.tasks.map(task => `
            <div class="gantt-task-name ${this.selectedTask === task.id ? 'selected' : ''}" 
                 data-task-id="${task.id}"
                 role="button"
                 tabindex="0"
                 aria-label="任务: ${this.escapeHtml(task.name)}">
                ${this.escapeHtml(task.name)}
            </div>
        `).join('');
    };

    /**
     * 渲染日期表头
     * 优化：提取为独立方法
     * @param {Array<Date>} dates - 日期数组
     * @param {Array<string>} weekdays - 星期名称数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderDateHeaders = function(dates, weekdays) {
        return dates.map(date => {
            const isWeekendDay = isWeekend(date) && this.options.showWeekends;
            const isTodayDay = isToday(date);
            const classes = ['gantt-date-cell'];
            
            if (isWeekendDay) classes.push('weekend');
            if (isTodayDay) classes.push('today');
            
            return `
                <div class="${classes.join(' ')}" 
                     style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;"
                     role="columnheader"
                     aria-label="${formatDate(date)}">
                    <div class="gantt-date-day">${date.getDate()}</div>
                    <div class="gantt-date-weekday">${weekdays[date.getDay()]}</div>
                </div>
            `;
        }).join('');
    };

    /**
     * 渲染所有任务行
     * 优化：提取为独立方法
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderTaskRows = function(dates) {
        return this.tasks.map(task => this.renderRow(task, dates)).join('');
    };

    /**
     * 渲染单个任务行
     * 优化：添加边界检查和 ARIA 属性
     * @param {Object} task - 任务对象
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderRow = function(task, dates) {
        const start = new Date(task.start);
        const end = new Date(task.end || task.start);
        
        // 验证日期有效性
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn(`Invalid date for task: ${task.name}`);
            return '';
        }
        
        const startOffset = daysBetween(this.startDate, start);
        const duration = daysBetween(start, end) + 1;
        
        const left = startOffset * this.options.cellWidth;
        const width = Math.max(duration * this.options.cellWidth, 80);
        const progress = Math.min(Math.max(task.progress || 0, 0), 100); // 确保进度在 0-100 之间

        const isSelected = this.selectedTask === task.id;

        return `
            <div class="gantt-row" role="row" aria-label="任务行: ${this.escapeHtml(task.name)}">
                ${this.renderCells(dates)}
                <div class="gantt-bar ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}"
                     style="left: ${left}px; width: ${width}px;"
                     role="button"
                     tabindex="0"
                     aria-label="任务条: ${this.escapeHtml(task.name)}, 进度: ${progress}%">
                    <div class="gantt-bar-progress" style="width: ${progress}%" aria-hidden="true"></div>
                    ${this.options.enableResize ? '<div class="gantt-bar-handle left" role="button" aria-label="调整开始日期"></div>' : ''}
                    ${this.options.enableResize ? '<div class="gantt-bar-handle right" role="button" aria-label="调整结束日期"></div>' : ''}
                </div>
                <div class="gantt-bar-label-external ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}"
                     style="left: ${left + width + 8}px;"
                     role="button"
                     tabindex="0"
                     aria-label="任务标签: ${this.escapeHtml(task.name)}">
                    ${this.escapeHtml(task.name)} (${progress}%)
                </div>
            </div>
        `;
    };

    /**
     * 渲染单元格
     * 优化：提取为独立方法
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderCells = function(dates) {
        return dates.map(date => {
            const isWeekendDay = isWeekend(date) && this.options.showWeekends;
            const isTodayDay = isToday(date);
            const classes = ['gantt-cell'];
            
            if (isWeekendDay) classes.push('weekend');
            if (isTodayDay) classes.push('today');
            
            return `
                <div class="${classes.join(' ')}" 
                     style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;"
                     role="gridcell"></div>
            `;
        }).join('');
    };

    /**
     * 设置滚动同步
     * 优化：使用被动监听器和节流
     */
    GanttChart.prototype.setupScrollSync = function() {
        const sidebarBody = document.getElementById('ganttSidebarBody');
        const rowsContainer = document.getElementById('ganttRowsContainer');
        const timelineHeader = document.getElementById('ganttTimelineHeader');

        if (!sidebarBody || !rowsContainer || !timelineHeader) {
            console.warn('GanttChart: Scroll sync elements not found');
            return;
        }

        // 使用标志防止循环触发
        let isSyncingScroll = false;

        // 右侧滚动时，同步左侧垂直滚动和头部水平滚动
        rowsContainer.addEventListener('scroll', () => {
            if (isSyncingScroll) return;
            isSyncingScroll = true;
            
            sidebarBody.scrollTop = rowsContainer.scrollTop;
            timelineHeader.scrollLeft = rowsContainer.scrollLeft;
            
            requestAnimationFrame(() => {
                isSyncingScroll = false;
            });
        }, { passive: true });

        // 左侧滚动时，同步右侧垂直滚动
        sidebarBody.addEventListener('scroll', () => {
            if (isSyncingScroll) return;
            isSyncingScroll = true;
            
            rowsContainer.scrollTop = sidebarBody.scrollTop;
            
            requestAnimationFrame(() => {
                isSyncingScroll = false;
            });
        }, { passive: true });
    };

    /**
     * 渲染依赖关系
     * 优化：提取为独立方法，添加错误处理
     * @param {Array<Date>} dates - 日期数组
     */
    GanttChart.prototype.renderDependencies = function(dates) {
        const depSVG = this.container.querySelector('.gantt-dependencies');
        
        if (!depSVG) {
            console.warn('GanttChart: Dependencies SVG not found');
            return;
        }

        depSVG.style.width = `${dates.length * this.options.cellWidth}px`;
        depSVG.style.height = `${this.tasks.length * 60}px`;

        // 添加箭头标记定义
        depSVG.innerHTML = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" 
                        markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
                </marker>
            </defs>
        `;

        if (!this.options.showDependencies) {
            return;
        }

        // 渲染依赖箭头
        const paths = this.generateDependencyPaths();
        depSVG.innerHTML += paths;
    };

    /**
     * 生成依赖路径
     * 优化：提取为独立方法
     * @returns {string} SVG路径HTML字符串
     */
    GanttChart.prototype.generateDependencyPaths = function() {
        const rowHeight = 60;
        const w = this.options.cellWidth;
        const h = rowHeight;
        const radius = 10;
        const paths = [];

        this.tasks.forEach((task, taskIndex) => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            task.dependencies.forEach(depId => {
                const depTask = this.tasks.find(t => t.id === depId);
                if (!depTask) {
                    console.warn(`Dependency task not found: ${depId}`);
                    return;
                }
                
                const depIndex = this.tasks.findIndex(t => t.id === depId);
                const depEndOffset = daysBetween(this.startDate, depTask.end);
                const taskStartOffset = daysBetween(this.startDate, task.start);
                
                const x1 = depEndOffset * w + w;
                const x2 = taskStartOffset * w;
                const y1 = depIndex * rowHeight + rowHeight / 2;
                const y2 = taskIndex * rowHeight + rowHeight / 2;
                const d = Math.abs(taskIndex - depIndex);

                let coords;
                if (depIndex < taskIndex) {
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + w / 2, y: y1},
                        {x: x1 + w / 2, y: y1 + h / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y1 + h / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y2},
                        {x: x2, y: y2}
                    ];
                } else if (depIndex > taskIndex) {
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + w / 2, y: y1},
                        {x: x1 + w / 2, y: y1 - h / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y1 - h / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y2},
                        {x: x2, y: y2}
                    ];
                } else {
                    const sign = x2 > x1 ? 1 : -1;
                    const bend = 20;
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + sign * bend, y: y1},
                        {x: x1 + sign * bend, y: y2},
                        {x: x2, y: y2}
                    ];
                }

                const dPath = createRoundedPath(coords, radius, false);
                paths.push(`<path data-from="${depId}" data-to="${task.id}" d="${dPath}" 
                                  stroke="#dc3545" fill="none" stroke-width="2" 
                                  marker-end="url(#arrow)" />`);
            });
        });

        return paths.join('');
    };

    /**
     * 选择任务
     * 优化：添加状态检查
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.selectTask = function(taskId) {
        if (!taskId || this.selectedTask === taskId) return;

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`Task not found: ${taskId}`);
            return;
        }

        this.selectedTask = taskId;
        
        // 更新所有相关元素的选中状态
        this.updateSelectionState(taskId);
        
        // 调用外部表单显示函数（如果存在）
        if (typeof window.showTaskForm === 'function') {
            window.showTaskForm(task);
        }
        
        addLog(`📌 已选择任务 "${task.name}"`);
    };

    /**
     * 更新选择状态
     * 优化：提取为独立方法，批量更新DOM
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.updateSelectionState = function(taskId) {
        // 批量查询所有需要更新的元素
        const bars = this.container.querySelectorAll('.gantt-bar');
        const labels = this.container.querySelectorAll('.gantt-bar-label-external');
        const names = this.container.querySelectorAll('.gantt-task-name');
        
        // 批量更新
        bars.forEach(bar => {
            bar.classList.toggle('selected', bar.dataset.taskId === taskId);
        });
        
        labels.forEach(label => {
            label.classList.toggle('selected', label.dataset.taskId === taskId);
        });
        
        names.forEach(name => {
            name.classList.toggle('selected', name.dataset.taskId === taskId);
        });
    };

    /**
     * 获取任务的所有前置依赖ID（递归）
     * 优化：添加循环依赖检测
     * @param {string} taskId - 任务ID
     * @returns {Set<string>} 所有前置依赖ID集合
     */
    GanttChart.prototype.getAllDependencies = function(taskId) {
        const deps = new Set();
        const visited = new Set();
        const stack = [taskId];
        let iterations = 0;
        const maxIterations = this.tasks.length * 10; // 防止无限循环

        while (stack.length && iterations < maxIterations) {
            iterations++;
            const current = stack.pop();
            
            if (visited.has(current)) continue;
            visited.add(current);

            const task = this.tasks.find(t => t.id === current);
            if (task && Array.isArray(task.dependencies)) {
                task.dependencies.forEach(dep => {
                    if (!deps.has(dep)) {
                        deps.add(dep);
                        stack.push(dep);
                    }
                });
            }
        }

        if (iterations >= maxIterations) {
            console.warn('Possible circular dependency detected');
        }

        deps.delete(taskId);
        return deps;
    };

    /**
     * 添加任务
     * 优化：添加参数验证
     * @param {Object} task - 任务对象
     */
    GanttChart.prototype.addTask = function(task) {
        if (!task || typeof task !== 'object') {
            console.error('Invalid task object');
            return;
        }

        // 确保任务有必需的属性
        if (!task.id) task.id = generateId();
        if (!task.name) task.name = '新任务';
        if (!task.start) task.start = formatDate(new Date());
        if (!task.end) task.end = formatDate(addDays(new Date(), 3));
        if (typeof task.progress !== 'number') task.progress = 0;
        if (!Array.isArray(task.dependencies)) task.dependencies = [];

        this.tasks.push(task);
        this.calculateDateRange();
        this.render();
    };

    /**
     * 删除任务
     * 优化：清理相关依赖
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.deleteTask = function(taskId) {
        // 从任务列表中移除
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        
        // 清理其他任务中对该任务的依赖引用
        this.tasks.forEach(task => {
            if (Array.isArray(task.dependencies)) {
                task.dependencies = task.dependencies.filter(dep => dep !== taskId);
            }
        });
        
        if (this.selectedTask === taskId) {
            this.selectedTask = null;
        }
        
        this.calculateDateRange();
        this.render();
    };

    /**
     * 更新选项
     * 优化：只在选项真正改变时重新渲染
     * @param {Object} options - 新选项
     */
    GanttChart.prototype.updateOptions = function(options) {
        if (!options || typeof options !== 'object') return;
        
        const hasChanged = Object.keys(options).some(key => 
            this.options[key] !== options[key]
        );
        
        if (hasChanged) {
            Object.assign(this.options, options);
            this.render();
        }
    };

    /**
     * 获取选中的任务
     * @returns {Object|undefined} 任务对象
     */
    GanttChart.prototype.getSelectedTask = function() {
        return this.tasks.find(t => t.id === this.selectedTask);
    };

    /**
     * HTML 转义工具函数
     * 安全性优化：防止 XSS 攻击
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
     * 优化：添加清理方法
     */
    GanttChart.prototype.destroy = function() {
        // 移除事件监听器
        if (this._mouseMoveHandler) {
            document.removeEventListener('mousemove', this._mouseMoveHandler);
        }
        if (this._mouseUpHandler) {
            document.removeEventListener('mouseup', this._mouseUpHandler);
        }
        
        // 清空容器
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // 清空引用
        this.tasks = null;
        this.container = null;
        this._cachedElements = null;
        this._dateCache = null;
        
        console.log('GanttChart instance destroyed');
    };

    // 导出到全局
    global.GanttChart = GanttChart;

})(typeof window !== 'undefined' ? window : this);
