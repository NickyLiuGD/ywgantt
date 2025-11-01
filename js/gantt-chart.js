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
                    ${this.tasks.map(task => `
                        <div class="gantt-task-name ${this.selectedTask === task.id ? 'selected' : ''}" 
                             data-task-id="${task.id}">
                            ${task.name}
                        </div>
                    `).join('')}
                </div>
                <div class="gantt-timeline-wrapper">
                    <div class="gantt-timeline">
                        <div class="gantt-timeline-header">
                            ${dates.map(date => `
                                <div class="gantt-date-cell ${isWeekend(date) && this.options.showWeekends ? 'weekend' : ''} ${isToday(date) ? 'today' : ''}" 
                                     style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;">
                                    <div class="gantt-date-day">${date.getDate()}</div>
                                    <div class="gantt-date-weekday">${weekdays[date.getDay()]}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="gantt-rows">
                            ${this.tasks.map(task => this.renderRow(task, dates)).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
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

        let dependenciesHtml = '';
        if (this.options.showDependencies && task.dependencies && task.dependencies.length > 0) {
            task.dependencies.forEach(depId => {
                const depTask = this.tasks.find(t => t.id === depId);
                if (depTask) {
                    const depEnd = new Date(depTask.end);
                    const depEndOffset = daysBetween(this.startDate, depEnd);
                    const from = depEndOffset * this.options.cellWidth + this.options.cellWidth;  // 依赖结束点右侧
                    const to = startOffset * this.options.cellWidth;  // 本任务开始点左侧
                    const arrowLeft = Math.min(from, to);
                    const arrowWidth = Math.abs(from - to);
                    let path;
                    if (from < to) {
                        // 右箭头
                        path = `M0,12 H${arrowWidth - 10} L${arrowWidth - 10},0 L${arrowWidth},12 L${arrowWidth - 10},24`;
                    } else {
                        // 左箭头
                        path = `M${arrowWidth},12 H10 L10,24 L0,12 L10,0`;
                    }
                    dependenciesHtml += `
                        <svg class="gantt-dependency-arrow" style="position: absolute; left: ${arrowLeft}px; top: 18px; width: ${arrowWidth}px; height: 24px;">
                            <path d="${path}" stroke="#dc3545" fill="none" stroke-width="2"/>
                        </svg>
                    `;
                }
            });
        }

        return `
            <div class="gantt-row">
                ${dates.map(date => `
                    <div class="gantt-cell ${isWeekend(date) && this.options.showWeekends ? 'weekend' : ''} ${isToday(date) ? 'today' : ''}" 
                         style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;"></div>
                `).join('')}
                ${dependenciesHtml}
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