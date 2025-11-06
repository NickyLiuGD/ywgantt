// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图核心类 - 渲染、数据管理、交互控制                          ▓▓
// ▓▓ 路径: js/gantt-chart.js                                          ▓▓
// ▓▓ 版本: Gamma9 - 修复滚动与居中功能                                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ⭐ 全局尺寸常量（紧凑模式）
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
            showTaskNames: true
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
     * 生成日期数组（带缓存）
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

        this._dateCache = { key: cacheKey, dates: dates };
        
        return dates;
    };

    /**
     * 渲染甘特图（完整版）
     */
    GanttChart.prototype.render = function() {
        if (!this.container) {
            console.error('GanttChart: Container not found, cannot render');
            return;
        }

        const dates = this.generateDates();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const isCollapsed = !this.options.showTaskNames;
        
        const html = `
            <div class="gantt-wrapper">
                <div class="gantt-sidebar ${isCollapsed ? 'collapsed' : ''}">
                    <div class="gantt-sidebar-header">任务名称</div>
                    <div class="gantt-sidebar-body" id="ganttSidebarBody">
                        ${this.renderTaskNames()}
                    </div>
                    <button class="sidebar-toggle-btn" id="sidebarToggleBtn" 
                            title="${isCollapsed ? '展开任务名称栏' : '折叠任务名称栏'}"
                            aria-label="${isCollapsed ? '展开' : '折叠'}任务名称栏">
                        <span class="sidebar-toggle-icon">${isCollapsed ? '▶' : '◀'}</span>
                    </button>
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

        const toggleBtn = document.getElementById('sidebarToggleBtn');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                this.toggleSidebar(isCollapsed);
                this.render();
            };
        }

        this.setupScrollSync();
        this.renderDependencies(dates);
        this.attachEvents();
        
        this.updateHeight();
    };

    /**
     * 渲染任务名称列表
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
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderTaskRows = function(dates) {
        return this.tasks.map(task => this.renderRow(task, dates)).join('');
    };

    /**
     * 渲染单个任务行
     * @param {Object} task - 任务对象
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderRow = function(task, dates) {
        const start = new Date(task.start);
        const end = new Date(task.end || task.start);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn(`Invalid date for task: ${task.name}`);
            return '';
        }
        
        const startOffset = daysBetween(this.startDate, start);
        const duration = daysBetween(start, end) + 1;
        
        const left = startOffset * this.options.cellWidth;
        const width = Math.max(duration * this.options.cellWidth, 60);
        const progress = Math.min(Math.max(task.progress || 0, 0), 100);

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
     */
    GanttChart.prototype.setupScrollSync = function() {
        const sidebarBody = document.getElementById('ganttSidebarBody');
        const rowsContainer = document.getElementById('ganttRowsContainer');
        const timelineHeader = document.getElementById('ganttTimelineHeader');

        if (!sidebarBody || !rowsContainer || !timelineHeader) {
            console.warn('GanttChart: Scroll sync elements not found');
            return;
        }

        let isSyncingScroll = false;

        rowsContainer.addEventListener('scroll', () => {
            if (isSyncingScroll) return;
            isSyncingScroll = true;
            
            sidebarBody.scrollTop = rowsContainer.scrollTop;
            timelineHeader.scrollLeft = rowsContainer.scrollLeft;
            
            requestAnimationFrame(() => {
                isSyncingScroll = false;
            });
        }, { passive: true });

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
     * @param {Array<Date>} dates - 日期数组
     */
    GanttChart.prototype.renderDependencies = function(dates) {
        const depSVG = this.container.querySelector('.gantt-dependencies');
        
        if (!depSVG) {
            console.warn('GanttChart: Dependencies SVG not found');
            return;
        }

        depSVG.style.width = `${dates.length * this.options.cellWidth}px`;
        depSVG.style.height = `${this.tasks.length * ROW_HEIGHT}px`;

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

        const paths = this.generateDependencyPaths();
        depSVG.innerHTML += paths;
    };

    /**
     * 生成依赖路径
     * @returns {string} SVG路径HTML字符串
     */
    GanttChart.prototype.generateDependencyPaths = function() {
        const w = this.options.cellWidth;
        const h = ROW_HEIGHT;
        const radius = 8;
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
                const y1 = depIndex * h + h / 2;
                const y2 = taskIndex * h + h / 2;
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
                    const bend = 15;
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
     * 🔧 修复：选择任务并自动居中显示
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
        this.updateSelectionState(taskId);
        
        // 🔑 关键：延迟执行居中滚动，确保DOM已完全更新
        setTimeout(() => {
            this.scrollTaskToCenter(taskId);
        }, 100);
        
        addLog(`📌 已选择任务 "${task.name}"`);
    };

    /**
     * 更新选择状态
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.updateSelectionState = function(taskId) {
        const bars = this.container.querySelectorAll('.gantt-bar');
        const labels = this.container.querySelectorAll('.gantt-bar-label-external');
        const names = this.container.querySelectorAll('.gantt-task-name');
        
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
     * @param {string} taskId - 任务ID
     * @returns {Set<string>} 所有前置依赖ID集合
     */
    GanttChart.prototype.getAllDependencies = function(taskId) {
        const deps = new Set();
        const visited = new Set();
        const stack = [taskId];
        let iterations = 0;
        const maxIterations = this.tasks.length * 10;

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
     * @param {Object} task - 任务对象
     */
    GanttChart.prototype.addTask = function(task) {
        if (!task || typeof task !== 'object') {
            console.error('Invalid task object');
            return;
        }

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
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.deleteTask = function(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        
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

    // ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    // ▓▓ 🔧 修复：选中任务居中显示（完全重写，确保可靠性）             ▓▓
    // ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

    /**
     * 🔧 修复版：滚动使任务条居中显示
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.scrollTaskToCenter = function(taskId) {
        if (!taskId || !this.container) {
            console.warn('scrollTaskToCenter: Missing taskId or container');
            return;
        }
        
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        
        if (!bar || !rowsContainer) {
            console.warn('scrollTaskToCenter: Elements not found', { bar: !!bar, rowsContainer: !!rowsContainer });
            return;
        }
        
        try {
            // 🔑 获取容器和任务条的尺寸信息
            const containerRect = rowsContainer.getBoundingClientRect();
            const barRect = bar.getBoundingClientRect();
            
            // 📐 计算任务条在滚动内容中的绝对位置
            const barLeftInScroll = bar.offsetLeft;
            const barTopInScroll = bar.offsetParent.offsetTop;
            
            // 🎯 计算目标滚动位置（使任务条位于视口中心）
            const targetScrollLeft = barLeftInScroll - (containerRect.width / 2) + (barRect.width / 2);
            const targetScrollTop = barTopInScroll - (containerRect.height / 2) + (barRect.height / 2);
            
            // 🔒 确保滚动值在有效范围内
            const maxScrollLeft = rowsContainer.scrollWidth - containerRect.width;
            const maxScrollTop = rowsContainer.scrollHeight - containerRect.height;
            
            const finalScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
            const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
            
            // ⚡ 平滑滚动到目标位置
            rowsContainer.scrollTo({
                left: finalScrollLeft,
                top: finalScrollTop,
                behavior: 'smooth'
            });
            
            // 📝 记录日志
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                addLog(`🎯 任务 "${task.name}" 已居中显示`);
            }
            
            console.log('scrollTaskToCenter:', {
                taskId,
                taskName: task?.name,
                barLeft: barLeftInScroll,
                barTop: barTopInScroll,
                targetLeft: targetScrollLeft,
                targetTop: targetScrollTop,
                finalLeft: finalScrollLeft,
                finalTop: finalScrollTop
            });
        } catch (error) {
            console.error('scrollTaskToCenter error:', error);
            addLog('⚠️ 任务居中失败：' + error.message);
        }
    };

    // ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    // ▓▓ 增强：动态更新甘特图高度                                         ▓▓
    // ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

    /**
     * 更新甘特图高度以适应窗口
     */
    GanttChart.prototype.updateHeight = function() {
        if (!this.container) return;
        
        try {
            const ganttWrapper = this.container.querySelector('.gantt-wrapper');
            if (!ganttWrapper) return;
            
            const headerElement = document.querySelector('h1')?.parentElement;
            const logPanel = document.getElementById('logPanel');
            
            // 精确计算可用高度
            const headerHeight = headerElement ? headerElement.offsetHeight : 80;
            const logHeight = logPanel ? 
                (logPanel.classList.contains('hidden') ? 0 : 
                 (logPanel.classList.contains('collapsed') ? 55 : 240)) : 0;
            
            // 更激进的空间利用
            const availableHeight = window.innerHeight - headerHeight - logHeight - 50;
            const finalHeight = Math.max(availableHeight, 350);
            
            ganttWrapper.style.height = finalHeight + 'px';
            
            console.log('updateHeight:', { availableHeight, finalHeight });
        } catch (error) {
            console.error('updateHeight error:', error);
        }
    };

    // ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    // ▓▓ 切换任务名称栏显示                                                 ▓▓
    // ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

    /**
     * 切换任务名称栏的显示/隐藏
     * @param {boolean} show - 是否显示
     */
    GanttChart.prototype.toggleSidebar = function(show) {
        if (!this.container) return;
        
        const sidebar = this.container.querySelector('.gantt-sidebar');
        if (!sidebar) return;
        
        try {
            if (show) {
                sidebar.classList.remove('collapsed');
                this.options.showTaskNames = true;
                addLog('✅ 任务名称栏已展开');
            } else {
                sidebar.classList.add('collapsed');
                this.options.showTaskNames = false;
                addLog('✅ 任务名称栏已折叠');
            }
        } catch (error) {
            console.error('toggleSidebar error:', error);
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

    console.log('✅ gantt-chart.js loaded successfully (Gamma9 - 修复版)');

})(typeof window !== 'undefined' ? window : this);