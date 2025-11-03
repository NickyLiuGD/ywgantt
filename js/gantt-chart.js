/**
 * 甘特图核心类
 * 负责甘特图的渲染和数据管理
 */
class GanttChart {
    /**
     * 构造函数
     * @param {string} selector - 容器选择器
     * @param {Array} tasks - 任务数组
     * @param {Object} options - 配置选项
     */
    constructor(selector, tasks, options = {}) {
        this.selector = selector;
        this.tasks = tasks || [];
        this.options = {
            cellWidth: 60,
            showWeekends: true,
            enableEdit: true,
            enableResize: true,
            showDependencies: true,
            ...options
        };
        this.selectedTask = null;
        this.dragState = null;
        this.init();
    }

    /**
     * 初始化甘特图
     */
    init() {
        this.container = document.querySelector(this.selector);
        if (!this.container) {
            console.error(`Container ${this.selector} not found`);
            return;
        }
        this.calculateDateRange();
        this.render();
    }

    /**
     * 计算日期范围
     */
    calculateDateRange() {
        if (this.tasks.length === 0) {
            this.startDate = new Date();
            this.endDate = addDays(this.startDate, 30);
            return;
        }

        let minDate = new Date(this.tasks[0].start);
        let maxDate = new Date(this.tasks[0].end || this.tasks[0].start);

        this.tasks.forEach(task => {
            const start = new Date(task.start);
            const end = new Date(task.end || task.start);
            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;
        });

        this.startDate = addDays(minDate, -3);
        this.endDate = addDays(maxDate, 10);
    }

    /**
     * 生成日期数组
     * @returns {Array<Date>} 日期数组
     */
    generateDates() {
        const dates = [];
        let current = new Date(this.startDate);
        while (current <= this.endDate) {
            dates.push(new Date(current));
            current = addDays(current, 1);
        }
        return dates;
    }

    /**
     * 渲染甘特图
     */
    render() {
        const dates = this.generateDates();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        
        const html = `
            <div class="gantt-wrapper">
                <div class="gantt-sidebar">
                    <div class="gantt-sidebar-header">任务名称</div>
                    <div class="gantt-sidebar-body" id="ganttSidebarBody">
                        ${this.tasks.map(task => `
                            <div class="gantt-task-name ${this.selectedTask === task.id ? 'selected' : ''}" 
                                 data-task-id="${task.id}">
                                ${task.name}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="gantt-timeline-wrapper">
                    <div class="gantt-timeline">
                        <div class="gantt-timeline-header" id="ganttTimelineHeader">
                            ${dates.map(date => `
                                <div class="gantt-date-cell ${isWeekend(date) && this.options.showWeekends ? 'weekend' : ''} ${isToday(date) ? 'today' : ''}" 
                                     style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;">
                                    <div class="gantt-date-day">${date.getDate()}</div>
                                    <div class="gantt-date-weekday">${weekdays[date.getDay()]}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="gantt-rows-container" id="ganttRowsContainer">
                            <div class="gantt-rows">
                                ${this.tasks.map(task => this.renderRow(task, dates)).join('')}
                            </div>
                            <svg class="gantt-dependencies" style="position: absolute; top: 0; left: 0; pointer-events: none;"></svg>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // 同步滚动：左侧任务名称与右侧任务行
        const sidebarBody = document.getElementById('ganttSidebarBody');
        const rowsContainer = document.getElementById('ganttRowsContainer');
        const timelineHeader = document.getElementById('ganttTimelineHeader');

        if (sidebarBody && rowsContainer) {
            // 右侧滚动时，同步左侧垂直滚动
            rowsContainer.addEventListener('scroll', () => {
                sidebarBody.scrollTop = rowsContainer.scrollTop;
                // 同步头部水平滚动
                timelineHeader.scrollLeft = rowsContainer.scrollLeft;
            });

            // 左侧滚动时，同步右侧垂直滚动
            sidebarBody.addEventListener('scroll', () => {
                rowsContainer.scrollTop = sidebarBody.scrollTop;
            });
        }

        const depSVG = this.container.querySelector('.gantt-dependencies');
        depSVG.style.width = `${dates.length * this.options.cellWidth}px`;
        depSVG.style.height = `${this.tasks.length * 60}px`;

        depSVG.innerHTML = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
                </marker>
            </defs>
        `;

        if (this.options.showDependencies) {
            const rowHeight = 60;
            const w = this.options.cellWidth;
            const h = rowHeight;
            const radius = 10;

            this.tasks.forEach((task, taskIndex) => {
                if (!task.dependencies || task.dependencies.length === 0) return;
                task.dependencies.forEach(depId => {
                    const depTask = this.tasks.find(t => t.id === depId);
                    if (!depTask) return;
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

                    depSVG.innerHTML += `<path data-from="${depId}" data-to="${task.id}" d="${dPath}" stroke="#dc3545" fill="none" stroke-width="2" marker-end="url(#arrow)" />`;
                });
            });
        }

        this.attachEvents();
    }

    /**
     * 渲染单个任务行
     * @param {Object} task - 任务对象
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    renderRow(task, dates) {
        const start = new Date(task.start);
        const end = new Date(task.end || task.start);
        const startOffset = daysBetween(this.startDate, start);
        const duration = daysBetween(start, end) + 1;
        
        const left = startOffset * this.options.cellWidth;
        const width = Math.max(duration * this.options.cellWidth, 80);
        const progress = task.progress || 0;

        return `
            <div class="gantt-row">
                ${dates.map(date => `
                    <div class="gantt-cell ${isWeekend(date) && this.options.showWeekends ? 'weekend' : ''} ${isToday(date) ? 'today' : ''}" 
                         style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;"></div>
                `).join('')}
                <div class="gantt-bar ${this.selectedTask === task.id ? 'selected' : ''}" 
                     data-task-id="${task.id}"
                     style="left: ${left}px; width: ${width}px;">
                    <div class="gantt-bar-progress" style="width: ${progress}%"></div>
                    ${this.options.enableResize ? '<div class="gantt-bar-handle left"></div>' : ''}
                    <div class="gantt-bar-label">${task.name} (${progress}%)</div>
                    ${this.options.enableResize ? '<div class="gantt-bar-handle right"></div>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * 选择任务
     * @param {string} taskId - 任务ID
     */
    selectTask(taskId) {
        this.selectedTask = taskId;
        const task = this.tasks.find(t => t.id === taskId);
        
        this.container.querySelectorAll('.gantt-bar').forEach(bar => {
            bar.classList.toggle('selected', bar.dataset.taskId === taskId);
        });
        
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            el.classList.toggle('selected', el.dataset.taskId === taskId);
        });
        
        if (window.showTaskForm) {
            window.showTaskForm(task);
        }
        addLog(`📌 已选择任务 "${task.name}"`);
    }

    /**
     * 获取任务的所有前置依赖ID（递归）
     * @param {string} taskId - 任务ID
     * @returns {Set<string>} 所有前置依赖ID集合
     */
    getAllDependencies(taskId) {
        const deps = new Set();
        const visited = new Set();
        const stack = [taskId];

        while (stack.length) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            visited.add(current);

            const task = this.tasks.find(t => t.id === current);
            if (task && task.dependencies) {
                task.dependencies.forEach(dep => {
                    if (!deps.has(dep)) {
                        deps.add(dep);
                        stack.push(dep);
                    }
                });
            }
        }

        deps.delete(taskId);
        return deps;
    }

    /**
     * 添加任务
     * @param {Object} task - 任务对象
     */
    addTask(task) {
        this.tasks.push(task);
        this.calculateDateRange();
        this.render();
    }

    /**
     * 删除任务
     * @param {string} taskId - 任务ID
     */
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        if (this.selectedTask === taskId) {
            this.selectedTask = null;
        }
        this.calculateDateRange();
        this.render();
    }

    /**
     * 更新选项
     * @param {Object} options - 新选项
     */
    updateOptions(options) {
        Object.assign(this.options, options);
        this.render();
    }

    /**
     * 获取选中的任务
     * @returns {Object|undefined} 任务对象
     */
    getSelectedTask() {
        return this.tasks.find(t => t.id === this.selectedTask);
    }
}