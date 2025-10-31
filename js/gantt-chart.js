/**
 * 甘特图核心类
 * 负责甘特图的渲染、交互和数据管理
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
                    const depLeft = depEndOffset * this.options.cellWidth + this.options.cellWidth;  // 依赖结束点右侧
                    const startOffset = daysBetween(this.startDate, start);
                    const arrowLeft = Math.min(depLeft, startOffset * this.options.cellWidth);
                    const arrowWidth = Math.abs(startOffset * this.options.cellWidth - depLeft);
                    
                    dependenciesHtml += `
                        <svg class="gantt-dependency-arrow" style="position: absolute; left: ${arrowLeft}px; top: 18px; width: ${arrowWidth}px; height: 24px;">
                            <path d="M0,12 H${arrowWidth - 10} L${arrowWidth - 10},0 L${arrowWidth},12 L${arrowWidth - 10},24" stroke="#dc3545" fill="none" stroke-width="2"/>
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
     * 绑定事件
     */
    attachEvents() {
        // 任务名称事件
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            el.onclick = (e) => {
                if (el.classList.contains('editing')) return;
                this.selectTask(el.dataset.taskId);
            };
            
            el.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.editTaskName(el);
            };
        });

        // 任务条事件
        this.container.querySelectorAll('.gantt-bar').forEach(bar => {
            bar.onclick = (e) => {
                if (!e.target.classList.contains('gantt-bar-handle')) {
                    this.selectTask(bar.dataset.taskId);
                }
            };
            
            bar.ondblclick = (e) => {
                if (!e.target.classList.contains('gantt-bar-handle')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const taskId = bar.dataset.taskId;
                    const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                    if (taskNameEl) this.editTaskName(taskNameEl);
                }
            };
            
            bar.onmousedown = (e) => {
                if (e.target.classList.contains('gantt-bar-handle')) {
                    if (!this.options.enableResize) return;
                    const isRight = e.target.classList.contains('right');
                    const task = this.tasks.find(t => t.id === bar.dataset.taskId);
                    this.startResize(e, task, bar, isRight);
                } else {
                    if (!this.options.enableEdit) return;
                    const task = this.tasks.find(t => t.id === bar.dataset.taskId);
                    this.startDrag(e, task, bar);
                }
                e.preventDefault();
                e.stopPropagation();
            };
        });

        // 全局鼠标事件
        document.onmousemove = (e) => this.onMouseMove(e);
        document.onmouseup = (e) => this.onMouseUp(e);
    }

    /**
     * 编辑任务名称
     * @param {HTMLElement} element - 任务名称元素
     */
    editTaskName(element) {
        if (element.classList.contains('editing')) return;
        
        const taskId = element.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        const originalName = task.name;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.style.cssText = 'border: 1px solid #007bff; border-radius: 4px; padding: 4px 8px; font-size: 0.9rem; width: 100%; outline: none;';
        
        element.innerHTML = '';
        element.appendChild(input);
        element.classList.add('editing');
        
        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);
        
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== originalName) {
                task.name = newName;
                addLog(`✏️ 任务名称从 "${originalName}" 改为 "${newName}"`);
            }
            element.textContent = task.name;
            element.classList.remove('editing');
            
            const bar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
            if (bar) {
                const label = bar.querySelector('.gantt-bar-label');
                if (label) label.textContent = `${task.name} (${task.progress || 0}%)`;
            }
        };
        
        const cancelEdit = () => {
            element.textContent = originalName;
            element.classList.remove('editing');
        };
        
        input.onblur = () => setTimeout(saveEdit, 100);
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        };
        input.onclick = (e) => e.stopPropagation();
    }

    /**
     * 开始拖动任务
     */
    startDrag(e, task, bar) {
        this.dragState = {
            type: 'move',
            task: task,
            bar: bar,
            startX: e.clientX,
            originalStart: task.start,
            originalEnd: task.end
        };
        bar.classList.add('dragging');
        addLog(`🖱️ 开始拖动任务 "${task.name}"`);
    }

    /**
     * 开始调整任务大小
     */
    startResize(e, task, bar, isRight) {
        this.dragState = {
            type: 'resize',
            task: task,
            bar: bar,
            isRight: isRight,
            startX: e.clientX,
            originalStart: task.start,
            originalEnd: task.end
        };
        bar.classList.add('dragging');
        addLog(`↔️ 开始调整任务 "${task.name}" ${isRight ? '结束' : '开始'}日期`);
    }

    /**
     * 鼠标移动事件
     */
    onMouseMove(e) {
        if (!this.dragState) return;

        const deltaX = e.clientX - this.dragState.startX;
        const deltaDays = Math.round(deltaX / this.options.cellWidth);

        if (this.dragState.type === 'move') {
            const newStart = addDays(new Date(this.dragState.originalStart), deltaDays);
            const duration = daysBetween(this.dragState.originalStart, this.dragState.originalEnd);
            const newEnd = addDays(newStart, duration);
            
            this.dragState.task.start = formatDate(newStart);
            this.dragState.task.end = formatDate(newEnd);
            
            const startOffset = daysBetween(this.startDate, newStart);
            const left = startOffset * this.options.cellWidth;
            this.dragState.bar.style.left = left + 'px';
        } else if (this.dragState.type === 'resize') {
            if (this.dragState.isRight) {
                const newEnd = addDays(new Date(this.dragState.originalEnd), deltaDays);
                const start = new Date(this.dragState.task.start);
                if (newEnd >= start) {
                    this.dragState.task.end = formatDate(newEnd);
                    const duration = daysBetween(start, newEnd) + 1;
                    const width = Math.max(duration * this.options.cellWidth, 80);
                    this.dragState.bar.style.width = width + 'px';
                }
            } else {
                const newStart = addDays(new Date(this.dragState.originalStart), deltaDays);
                const end = new Date(this.dragState.task.end);
                if (newStart <= end) {
                    this.dragState.task.start = formatDate(newStart);
                    const startOffset = daysBetween(this.startDate, newStart);
                    const left = startOffset * this.options.cellWidth;
                    const duration = daysBetween(newStart, end) + 1;
                    const width = Math.max(duration * this.options.cellWidth, 80);
                    this.dragState.bar.style.left = left + 'px';
                    this.dragState.bar.style.width = width + 'px';
                }
            }
        }
    }

    /**
     * 鼠标释放事件
     */
    onMouseUp(e) {
        if (!this.dragState) return;

        const task = this.dragState.task;
        this.dragState.bar.classList.remove('dragging');
        
        if (this.dragState.type === 'move') {
            addLog(`✅ 任务 "${task.name}" 已移动到 ${task.start} ~ ${task.end}`);
        } else {
            addLog(`✅ 任务 "${task.name}" 时长已调整为 ${task.start} ~ ${task.end}`);
        }
        
        this.dragState = null;
        this.calculateDateRange();
        this.render();
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