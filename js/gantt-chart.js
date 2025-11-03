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
     * 渲染甘特图（分离头部与内容）
     */
    render() {
        const dates = this.generateDates();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        
        const html = `
            <div class="gantt-wrapper">
                <!-- 左侧任务列表 -->
                <div class="gantt-sidebar">
                    <div class="gantt-sidebar-header">任务名称</div>
                    <div class="gantt-sidebar-content" id="sidebarScroll">
                        ${this.tasks.map(task => `
                            <div class="gantt-task-name ${this.selectedTask === task.id ? 'selected' : ''}" 
                                 data-task-id="${task.id}">
                                ${task.name}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 右侧甘特图 -->
                <div class="gantt-timeline-wrapper">
                    <!-- 固定头部 -->
                    <div class="gantt-timeline-header">
                        ${dates.map(date => `
                            <div class="gantt-date-cell ${isWeekend(date) && this.options.showWeekends ? 'weekend' : ''} ${isToday(date) ? 'today' : ''}" 
                                 style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;">
                                <div class="gantt-date-day">${date.getDate()}</div>
                                <div class="gantt-date-weekday">${weekdays[date.getDay()]}</div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- 可滚动内容 -->
                    <div class="gantt-timeline-content" id="timelineScroll">
                        <div class="gantt-rows">
                            ${this.tasks.map(task => this.renderRow(task, dates)).join('')}
                        </div>
                        <svg class="gantt-dependencies"></svg>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // 设置 SVG 尺寸
        const depSVG = this.container.querySelector('.gantt-dependencies');
        const contentWidth = dates.length * this.options.cellWidth;
        const contentHeight = this.tasks.length * 60 + 60; // 行高 + 头部
        depSVG.style.width = `${contentWidth}px`;
        depSVG.style.height = `${contentHeight}px`;

        // 渲染依赖箭头
        if (this.options.showDependencies) {
            this.renderDependencies(depSVG, dates);
        }

        // 同步左右滚动
        const sidebarScroll = this.container.querySelector('#sidebarScroll');
        const timelineScroll = this.container.querySelector('#timelineScroll');
        if (sidebarScroll && timelineScroll) {
            sidebarScroll.onscroll = () => {
                timelineScroll.scrollTop = sidebarScroll.scrollTop;
            };
            timelineScroll.onscroll = () => {
                sidebarScroll.scrollTop = timelineScroll.scrollTop;
            };
        }

        this.attachEvents();
    }

    /**
     * 渲染依赖箭头
     */
    renderDependencies(svg, dates) {
        const rowHeight = 60;
        const w = this.options.cellWidth;
        const radius = 10;

        svg.innerHTML = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
                </marker>
            </defs>
        `;

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
                        {x: x1 + w / 2, y: y1 + rowHeight / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y1 + rowHeight / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y2},
                        {x: x2, y: y2}
                    ];
                } else if (depIndex > taskIndex) {
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + w / 2, y: y1},
                        {x: x1 + w / 2, y: y1 - rowHeight / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y1 - rowHeight / 8},
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
                svg.innerHTML += `<path data-from="${depId}" data-to="${task.id}" d="${dPath}" stroke="#dc3545" fill="none" stroke-width="2" marker-end="url(#arrow)" />`;
            });
        });
    }

    /**
     * 渲染单个任务行
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
     */
    selectTask(taskId) {
        if (this.selectedTask === taskId) return;

        this.container.querySelectorAll('.gantt-bar, .gantt-task-name').forEach(el => {
            el.classList.remove('selected', 'dep-highlight');
        });
        this.container.querySelectorAll('.gantt-dependencies path').forEach(path => {
            path.classList.remove('dep-highlight-arrow');
        });
        const oldForm = this.container.querySelector('.inline-task-form');
        if (oldForm) oldForm.remove();

        if (!taskId) return;

        this.selectedTask = taskId;
        const task = this.tasks.find(t => t.id === taskId);

        const selectedBar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
        if (selectedBar) selectedBar.classList.add('selected');

        const selectedName = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
        if (selectedName) selectedName.classList.add('selected');

        const deps = this.getAllDependencies(taskId);
        deps.forEach(depId => {
            const bar = this.container.querySelector(`.gantt-bar[data-task-id="${depId}"]`);
            if (bar) bar.classList.add('dep-highlight');
            const name = this.container.querySelector(`.gantt-task-name[data-task-id="${depId}"]`);
            if (name) name.classList.add('dep-highlight');
        });

        this.container.querySelectorAll('.gantt-dependencies path').forEach(path => {
            const fromId = path.dataset.from;
            const toId = path.dataset.to;
            if (deps.has(fromId) && (toId === taskId || deps.has(toId))) {
                path.classList.add('dep-highlight-arrow');
            }
        });

        addLog(`已选择任务 "${task.name}"`);
    }

    /**
     * 取消选择
     */
    deselect() {
        if (!this.selectedTask) return;

        this.selectedTask = null;
        this.container.querySelectorAll('.selected, .dep-highlight').forEach(el => {
            el.classList.remove('selected', 'dep-highlight');
        });
        this.container.querySelectorAll('.dep-highlight-arrow').forEach(path => {
            path.classList.remove('dep-highlight-arrow');
        });
        const form = this.container.querySelector('.inline-task-form');
        if (form) form.remove();
        addLog('已取消选择');
    }

    /**
     * 获取所有前置依赖
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
     */
    addTask(task) {
        this.tasks.push(task);
        this.calculateDateRange();
        this.render();
    }

    /**
     * 删除任务
     */
    deleteTask(taskId) {
        this.tasks =  = this.tasks.filter(t => t.id !== taskId);
        if (this.selectedTask === taskId) {
            this.selectedTask = null;
        }
        this.calculateDateRange();
        this.render();
    }

    /**
     * 更新选项
     */
    updateOptions(options) {
        Object.assign(this.options, options);
        this.render();
    }

    /**
     * 获取选中任务
     */
    getSelectedTask() {
        return this.tasks.find(t => t.id === this.selectedTask);
    }
}