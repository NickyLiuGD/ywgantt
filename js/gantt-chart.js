/**
 * GanttChart - 完整版
 * 功能完整：固定头部 + 内联编辑 + 拖拽 + 依赖箭头 + 增删改查
 */
class GanttChart {
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
        this.container = null;
        this.init();
    }

    init() {
        this.container = document.querySelector(this.selector);
        if (!this.container) {
            console.error(`Container ${this.selector} not found`);
            return;
        }
        this.calculateDateRange();
        this.render();
        this.attachEvents(); // 确保在 render 后调用
    }

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

    generateDates() {
        const dates = [];
        let current = new Date(this.startDate);
        while (current <= this.endDate) {
            dates.push(new Date(current));
            current = addDays(current, 1);
        }
        return dates;
    }

    render() {
        const dates = this.generateDates();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        
        const html = `
            <div class="gantt-wrapper">
                <!-- 固定头部 -->
                <div class="gantt-header">
                    <div class="gantt-sidebar-header">任务名称</div>
                    <div class="gantt-timeline-header-wrapper">
                        <div class="gantt-timeline-header">
                            ${dates.map(date => `
                                <div class="gantt-date-cell ${isWeekend(date) && this.options.showWeekends ? 'weekend' : ''} ${isToday(date) ? 'today' : ''}" 
                                     style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;">
                                    <div class="gantt-date-day">${date.getDate()}</div>
                                    <div class="gantt-date-weekday">${weekdays[date.getDay()]}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- 可滚动内容区 -->
                <div class="gantt-body">
                    <div class="gantt-sidebar-body">
                        ${this.tasks.map(task => `
                            <div class="gantt-task-name ${this.selectedTask === task.id ? 'selected' : ''}" 
                                 data-task-id="${task.id}">
                                ${task.name}
                            </div>
                        `).join('')}
                    </div>
                    <div class="gantt-timeline-body">
                        <div class="gantt-timeline-wrapper">
                            <div class="gantt-timeline">
                                <div class="gantt-rows">
                                    ${this.tasks.map(task => this.renderRow(task, dates)).join('')}
                                </div>
                            </div>
                            <svg class="gantt-dependencies" style="position: absolute; top: 0; left: 0; pointer-events: none;"></svg>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // === 依赖箭头 SVG ===
        this.renderDependencies(dates);

        // === 同步滚动 ===
        this.syncScroll();
    }

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

    renderDependencies(dates) {
        const depSVG = this.container.querySelector('.gantt-dependencies');
        const totalWidth = dates.length * this.options.cellWidth;
        const totalHeight = this.tasks.length * 60;
        depSVG.style.width = `${totalWidth}px`;
        depSVG.style.height = `${totalHeight}px`;

        depSVG.innerHTML = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
                </marker>
            </defs>
        `;

        if (!this.options.showDependencies) return;

        const rowHeight = 60;
        const w = this.options.cellWidth;

        this.tasks.forEach((task, taskIndex) => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            task.dependencies.forEach(depId => {
                const depTask = this.tasks.find(t => t.id === depId);
                if (!depTask) return;
                const depIndex = this.tasks.findIndex(t => t.id === depId);
                const depEndOffset = daysBetween(this.startDate, new Date(depTask.end));
                const taskStartOffset = daysBetween(this.startDate, new Date(task.start));
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

                const dPath = this.createRoundedPath(coords, 10, false);
                depSVG.innerHTML += `<path data-from="${depId}" data-to="${task.id}" d="${dPath}" stroke="#dc3545" fill="none" stroke-width="2" marker-end="url(#arrow)" />`;
            });
        });
    }

    createRoundedPath(coords, radius, useMoveTo) {
        let path = useMoveTo ? 'M' : '';
        for (let i = 0; i < coords.length; i++) {
            const p0 = coords[i - 1] || coords[i];
            const p1 = coords[i];
            const p2 = coords[i + 1] || p1;

            if (i > 0 && !useMoveTo) path += ' ';
            if (i === 0) {
                path += `M${p1.x},${p1.y}`;
            } else {
                const dx = p2.x - p0.x;
                const dy = p2.y - p0.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) continue;
                const nx = dx / dist;
                const ny = dy / dist;
                const offset = Math.min(radius, dist / 2);
                const c1x = p1.x - nx * offset;
                const c1y = p1.y - ny * offset;
                path += ` L${c1x},${c1y}`;
                const c2x = p1.x + nx * offset;
                const c2y = p1.y + ny * offset;
                path += ` Q${p1.x},${p1.y} ${c2x},${c2y}`;
            }
        }
        return path;
    }

    syncScroll() {
        const timelineBody = this.container.querySelector('.gantt-timeline-body');
        const sidebarBody = this.container.querySelector('.gantt-sidebar-body');
        const headerWrapper = this.container.querySelector('.gantt-timeline-header-wrapper');

        if (!timelineBody || !sidebarBody || !headerWrapper) return;

        timelineBody.addEventListener('scroll', () => {
            sidebarBody.scrollTop = timelineBody.scrollTop;
            headerWrapper.scrollLeft = timelineBody.scrollLeft;
        });

        sidebarBody.addEventListener('scroll', () => {
            timelineBody.scrollTop = sidebarBody.scrollTop;
        });
    }

    attachEvents() {
        const wrapper = this.container.querySelector('.gantt-timeline-wrapper');
        if (!wrapper) return;

        // 点击任务条
        wrapper.addEventListener('click', (e) => {
            const bar = e.target.closest('.gantt-bar');
            if (!bar) return;
            const taskId = bar.dataset.taskId;
            this.selectTask(taskId);
            if (this.options.enableEdit) {
                this.showInlineTaskForm(taskId);
            }
        });

        // 双击任务名称编辑
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            el.addEventListener('dblclick', () => {
                const taskId = el.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task || !this.options.enableEdit) return;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = task.name;
                input.style.width = '100%';
                input.style.padding = '4px';
                input.style.border = '1px solid #007bff';
                input.style.borderRadius = '4px';

                el.innerHTML = '';
                el.appendChild(input);
                input.focus();
                input.select();

                const save = () => {
                    task.name = input.value.trim() || '未命名任务';
                    this.render();
                    this.attachEvents();
                };

                input.addEventListener('blur', save);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') {
                        this.render();
                        this.attachEvents();
                    }
                });
            });
        });

        // 拖拽调整
        if (this.options.enableResize) {
            wrapper.addEventListener('mousedown', (e) => {
                const handle = e.target.closest('.gantt-bar-handle');
                if (!handle) return;
                const bar = handle.closest('.gantt-bar');
                const taskId = bar.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                this.dragState = {
                    task,
                    type: handle.classList.contains('left') ? 'start' : 'end',
                    startX: e.clientX,
                    startDate: new Date(task[this.dragState.type === 'start' ? 'start' : 'end'])
                };

                const onMouseMove = (e) => {
                    if (!this.dragState) return;
                    const deltaX = e.clientX - this.dragState.startX;
                    const deltaDays = Math.round(deltaX / this.options.cellWidth);
                    const newDate = addDays(this.dragState.startDate, deltaDays);
                    this.dragState.task[this.dragState.type] = newDate.toISOString().split('T')[0];
                    this.render();
                    this.attachEvents();
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    this.dragState = null;
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }
    }

    showInlineTaskForm(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const wrapper = this.container.querySelector('.gantt-timeline-wrapper');
        const existing = wrapper.querySelector('.gantt-inline-form');
        if (existing) existing.remove();

        const rowIndex = this.tasks.findIndex(t => t.id === taskId);
        const rowTop = rowIndex * 60;

        const form = document.createElement('div');
        form.className = 'gantt-inline-form';
        form.style.position = 'absolute';
        form.style.top = `${rowTop}px`;
        form.style.left = '0';
        form.style.width = '100%';
        form.style.height = '60px';
        form.style.background = 'rgba(0,123,255,0.1)';
        form.style.border = '2px dashed #007bff';
        form.style.zIndex = '100';
        form.style.display = 'flex';
        form.style.alignItems = 'center';
        form.style.padding = '0 10px';
        form.style.gap = '10px';

        form.innerHTML = `
            <input type="text" value="${task.name}" style="flex:1; padding:4px; border:1px solid #ccc; border-radius:4px;">
            <input type="date" value="${task.start}" style="padding:4px; border:1px solid #ccc; border-radius:4px;">
            <input type="date" value="${task.end || task.start}" style="padding:4px; border:1px solid #ccc; border-radius:4px;">
            <input type="number" value="${task.progress || 0}" min="0" max="100" style="width:60px; padding:4px; border:1px solid #ccc; border-radius:4px;">
            <button style="padding:4px 8px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">保存</button>
            <button style="padding:4px 8px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">取消</button>
        `;

        const inputs = form.querySelectorAll('input, button');
        inputs[4].addEventListener('click', () => {
            const [name, start, end, progress] = inputs;
            task.name = name.value.trim() || '未命名';
            task.start = start.value;
            task.end = end.value;
            task.progress = Math.min(100, Math.max(0, parseInt(progress.value) || 0));
            this.render();
            this.attachEvents();
        });

        inputs[5].addEventListener('click', () => {
            form.remove();
        });

        wrapper.appendChild(form);
    }

    selectTask(taskId) {
        this.selectedTask = taskId;
        this.render();
        this.attachEvents();
    }

    getAllDependencies(taskId) {
        const deps = new Set();
        const addDeps = (id) => {
            const task = this.tasks.find(t => t.id === id);
            if (!task || deps.has(id)) return;
            deps.add(id);
            (task.dependencies || []).forEach(addDeps);
        };
        addDeps(taskId);
        return Array.from(deps);
    }

    addTask(task) {
        const newTask = {
            id: 'task_' + Date.now(),
            name: '新任务',
            start: new Date().toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0],
            progress: 0,
            dependencies: [],
            ...task
        };
        this.tasks.push(newTask);
        this.render();
        this.attachEvents();
        return newTask.id;
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.tasks.forEach(t => {
            if (t.dependencies) {
                t.dependencies = t.dependencies.filter(d => d !== taskId);
            }
        });
        this.render();
        this.attachEvents();
    }

    updateOptions(options) {
        this.options = { ...this.options, ...options };
        this.render();
        this.attachEvents();
    }

    getSelectedTask() {
        return this.tasks.find(t => t.id === this.selectedTask) || null;
    }
}