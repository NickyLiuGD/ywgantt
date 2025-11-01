/**
 * 甘特图事件处理模块
 * 悬停 = 选中，点击 = 拖拽 + 切换依赖
 */

GanttChart.prototype.attachEvents = function() {
    // ------------------- 左侧任务名称 -------------------
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

    // ------------------- 甘特图任务条 -------------------
    this.container.querySelectorAll('.gantt-bar').forEach(bar => {
        let hoverTimer = null;
        const taskId = bar.dataset.taskId;

        // 悬停：延迟选中
        bar.onmouseenter = () => {
            hoverTimer = setTimeout(() => {
                this.selectTask(taskId);
                // 同步左侧高亮
                const nameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                if (nameEl) {
                    this.container.querySelectorAll('.gantt-task-name').forEach(el => {
                        el.classList.toggle('selected', el === nameEl);
                    });
                }
            }, 200);
        };

        bar.onmouseleave = () => {
            if (hoverTimer) clearTimeout(hoverTimer);
        };

        // 点击：切换依赖（仅表单打开时）或拖拽
        bar.onclick = (e) => {
            if (e.target.classList.contains('gantt-bar-handle')) return;

            const formOpen = !!document.getElementById('taskFormContainer').innerHTML;
            if (formOpen) {
                const selectedTask = gantt.getSelectedTask();
                if (selectedTask && selectedTask.id !== taskId) {
                    const depInput = document.getElementById(`dep_${taskId}`);
                    if (depInput) {
                        depInput.checked = !depInput.checked;
                        const taskName = bar.querySelector('.gantt-bar-label').textContent.split(' (')[0];
                        addLog(`${depInput.checked ? '添加' : '移除'}依赖：${taskName}`);
                    }
                }
                e.stopPropagation();
                return;
            }
        };

        // 按下：拖拽或调整
        bar.onmousedown = (e) => {
            const target = e.target;
            if (target.classList.contains('gantt-bar-handle')) {
                if (!this.options.enableResize) return;
                const isRight = target.classList.contains('right');
                const task = this.tasks.find(t => t.id === taskId);
                this.startResize(e, task, bar, isRight);
            } else {
                if (!this.options.enableEdit) return;
                const task = this.tasks.find(t => t.id === taskId);
                this.startDrag(e, task, bar);
            }
            e.preventDefault();
            e.stopPropagation();
        };

        // 双击编辑
        bar.ondblclick = (e) => {
            if (e.target.classList.contains('gantt-bar-handle')) return;
            e.preventDefault();
            e.stopPropagation();
            const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
            if (taskNameEl) this.editTaskName(taskNameEl);
        };
    });

    // ------------------- 添加取消选择事件（点击时间轴空白处） -------------------
    const timelineWrapper = this.container.querySelector('.gantt-timeline-wrapper');
    if (timelineWrapper) {
        timelineWrapper.addEventListener('click', (e) => {
            if (!e.target.closest('.gantt-bar, .gantt-bar-handle')) {
                this.deselect();
            }
        });
    }

    // ------------------- 全局鼠标事件 -------------------
    document.onmousemove = (e) => this.onMouseMove(e);
    document.onmouseup = (e) => {
        if (this.dragState) this.onMouseUp(e);
    };
};

// ------------------- 选择任务（修改：添加依赖高亮） -------------------
GanttChart.prototype.selectTask = function(taskId) {
    if (this.selectedTask === taskId) return;

    // 清除所有现有高亮
    this.container.querySelectorAll('.gantt-bar, .gantt-task-name').forEach(el => {
        el.classList.remove('selected', 'dep-highlight');
    });
    document.getElementById('taskFormContainer').innerHTML = '';

    if (!taskId) return;

    this.selectedTask = taskId;
    const task = this.tasks.find(t => t.id === taskId);

    // 添加选中高亮
    const selectedBar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
    if (selectedBar) selectedBar.classList.add('selected');

    const selectedName = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
    if (selectedName) selectedName.classList.add('selected');

    // 添加依赖高亮（递归前置）
    const deps = this.getAllDependencies(taskId);
    deps.forEach(depId => {
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${depId}"]`);
        if (bar) bar.classList.add('dep-highlight');

        const name = this.container.querySelector(`.gantt-task-name[data-task-id="${depId}"]`);
        if (name) name.classList.add('dep-highlight');
    });

    if (window.showTaskForm) {
        window.showTaskForm(task);
    }

    addLog(`📌 已选择任务 "${task.name}"`);
};

// ------------------- 取消选择 -------------------
GanttChart.prototype.deselect = function() {
    if (!this.selectedTask) return;

    this.selectedTask = null;
    this.container.querySelectorAll('.selected, .dep-highlight').forEach(el => {
        el.classList.remove('selected', 'dep-highlight');
    });
    document.getElementById('taskFormContainer').innerHTML = '';
    addLog('已取消选择');
};

// ------------------- 其余函数保持不变 -------------------
GanttChart.prototype.editTaskName = function(element) {
    if (element.classList.contains('editing')) return;
    const taskId = element.dataset.taskId;
    const task = this.tasks.find(t => t.id === taskId);
    const originalName = task.name;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalName;
    input.style.cssText = 'border:1px solid #007bff;border-radius:4px;padding:4px 8px;font-size:0.9rem;width:100%;outline:none;';

    element.innerHTML = '';
    element.appendChild(input);
    element.classList.add('editing');
    setTimeout(() => { input.focus(); input.select(); }, 10);

    const saveEdit = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalName) {
            task.name = newName;
            addLog(`任务名称从 "${originalName}" 改为 "${newName}"`);
        }
        element.textContent = task.name;
        element.classList.remove('editing');
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
        if (bar) {
            const label = bar.querySelector('.gantt-bar-label');
            if (label) label.textContent = `${task.name} (${task.progress || 0}%)`;
        }
    };

    input.onblur = () => setTimeout(saveEdit, 100);
    input.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
        else if (e.key === 'Escape') { e.preventDefault(); element.textContent = originalName; element.classList.remove('editing'); }
    };
    input.onclick = (e) => e.stopPropagation();
};

GanttChart.prototype.startDrag = function(e, task, bar) {
    this.dragState = { type: 'move', task, bar, startX: e.clientX, originalStart: task.start, originalEnd: task.end };
    bar.classList.add('dragging');
    addLog(`开始拖动任务 "${task.name}"`);
};

GanttChart.prototype.startResize = function(e, task, bar, isRight) {
    this.dragState = { type: 'resize', task, bar, isRight, startX: e.clientX, originalStart: task.start, originalEnd: task.end };
    bar.classList.add('dragging');
    addLog(`开始调整任务 "${task.name}" ${isRight ? '结束' : '开始'}日期`);
};

GanttChart.prototype.onMouseMove = function(e) {
    if (!this.dragState) return;
    const deltaX = e.clientX - this.dragState.startX;
    const deltaDays = Math.round(deltaX / this.options.cellWidth);

    if (this.dragState.type === 'move') {
        const newStart = addDays(new Date(this.dragState.originalStart), deltaDays);
        const duration = daysBetween(this.dragState.originalStart, this.dragState.originalEnd);
        const newEnd = addDays(newStart, duration);
        this.dragState.task.start = formatDate(newStart);
        this.dragState.task.end = formatDate(newEnd);
        const offset = daysBetween(this.startDate, newStart);
        this.dragState.bar.style.left = offset * this.options.cellWidth + 'px';
    } else if (this.dragState.type === 'resize') {
        if (this.dragState.isRight) {
            const newEnd = addDays(new Date(this.dragState.originalEnd), deltaDays);
            const start = new Date(this.dragState.task.start);
            if (newEnd >= start) {
                this.dragState.task.end = formatDate(newEnd);
                const dur = daysBetween(start, newEnd) + 1;
                const w = Math.max(dur * this.options.cellWidth, 80);
                this.dragState.bar.style.width = w + 'px';
            }
        } else {
            const newStart = addDays(new Date(this.dragState.originalStart), deltaDays);
            const end = new Date(this.dragState.task.end);
            if (newStart <= end) {
                this.dragState.task.start = formatDate(newStart);
                const offset = daysBetween(this.startDate, newStart);
                const dur = daysBetween(newStart, end) + 1;
                const w = Math.max(dur * this.options.cellWidth, 80);
                this.dragState.bar.style.left = offset * this.options.cellWidth + 'px';
                this.dragState.bar.style.width = w + 'px';
            }
        }
    }
};

GanttChart.prototype.onMouseUp = function(e) {
    if (!this.dragState) return;
    const task = this.dragState.task;
    this.dragState.bar.classList.remove('dragging');
    addLog(`任务 "${task.name}" 已${this.dragState.type === 'move' ? '移动' : '调整'}到 ${task.start} ~ ${task.end}`);
    this.dragState = null;
    this.calculateDateRange();
    this.render();
};