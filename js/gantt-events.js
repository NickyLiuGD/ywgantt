/**
 * 甘特图事件处理模块
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
        let clickTimer = null;
        let isDragging = false;

        // 鼠标按下：准备拖拽或点击
        bar.onmousedown = (e) => {
            const target = e.target;

            // 手柄：调整大小
            if (target.classList.contains('gantt-bar-handle')) {
                if (!this.options.enableResize) return;
                const isRight = target.classList.contains('right');
                const task = this.tasks.find(t => t.id === bar.dataset.taskId);
                this.startResize(e, task, bar, isRight);
                isDragging = true;
            }
            // 主体：拖拽移动
            else {
                if (!this.options.enableEdit) return;
                const task = this.tasks.find(t => t.id === bar.dataset.taskId);
                this.startDrag(e, task, bar);
                isDragging = true;
            }

            e.preventDefault();
            e.stopPropagation();

            // 设置点击判定定时器（300ms 内释放 = 点击）
            clickTimer = setTimeout(() => {
                clickTimer = null; // 长按或拖拽，不触发点击
            }, 300);
        };

        // 鼠标释放：判断点击还是拖拽结束
        bar.onmouseup = (e) => {
            if (isDragging) {
                isDragging = false;
                return; // 拖拽结束由全局 onMouseUp 处理
            }

            // 短按释放 → 视为点击
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;

                if (!e.target.classList.contains('gantt-bar-handle')) {
                    const taskId = bar.dataset.taskId;
                    this.selectTask(taskId);

                    // 同步左侧任务名称高亮
                    const nameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                    if (nameEl) {
                        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
                            el.classList.toggle('selected', el === nameEl);
                        });
                    }
                }
            }
        };

        // 双击编辑
        bar.ondblclick = (e) => {
            if (e.target.classList.contains('gantt-bar-handle')) return;
            e.preventDefault();
            e.stopPropagation();
            const taskId = bar.dataset.taskId;
            const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
            if (taskNameEl) this.editTaskName(taskNameEl);
        };
    });

    // ------------------- 全局鼠标事件 -------------------
    document.onmousemove = (e) => this.onMouseMove(e);

    document.onmouseup = (e) => {
        if (this.dragState) {
            this.onMouseUp(e); // 拖拽结束
        }
        // 不阻止点击处理（点击在 bar.onmouseup 中处理）
    };
};

// ------------------- 选择任务（核心逻辑）-------------------
GanttChart.prototype.selectTask = function(taskId) {
    this.selectedTask = taskId;
    const task = this.tasks.find(t => t.id === taskId);

    // 高亮任务条
    this.container.querySelectorAll('.gantt-bar').forEach(bar => {
        bar.classList.toggle('selected', bar.dataset.taskId === taskId);
    });

    // 高亮左侧任务名称
    this.container.querySelectorAll('.gantt-task-name').forEach(el => {
        el.classList.toggle('selected', el.dataset.taskId === taskId);
    });

    // 打开编辑表单
    if (window.showTaskForm) {
        window.showTaskForm(task);
    }

    addLog(`已选择任务 "${task.name}"`);
};

// ------------------- 编辑任务名称 -------------------
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

    const cancelEdit = () => {
        element.textContent = originalName;
        element.classList.remove('editing');
    };

    input.onblur = () => setTimeout(saveEdit, 100);
    input.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    };
    input.onclick = (e) => e.stopPropagation();
};

// ------------------- 拖拽开始 -------------------
GanttChart.prototype.startDrag = function(e, task, bar) {
    this.dragState = {
        type: 'move',
        task, bar,
        startX: e.clientX,
        originalStart: task.start,
        originalEnd: task.end
    };
    bar.classList.add('dragging');
    addLog(`开始拖动任务 "${task.name}"`);
};

GanttChart.prototype.startResize = function(e, task, bar, isRight) {
    this.dragState = {
        type: 'resize',
        task, bar, isRight,
        startX: e.clientX,
        originalStart: task.start,
        originalEnd: task.end
    };
    bar.classList.add('dragging');
    addLog(`开始调整任务 "${task.name}" ${isRight ? '结束' : '开始'}日期`);
};

// ------------------- 鼠标移动 -------------------
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

// ------------------- 鼠标释放 -------------------
GanttChart.prototype.onMouseUp = function(e) {
    if (!this.dragState) return;

    const task = this.dragState.task;
    this.dragState.bar.classList.remove('dragging');

    addLog(`任务 "${task.name}" 已${this.dragState.type === 'move' ? '移动' : '调整'}到 ${task.start} ~ ${task.end}`);

    this.dragState = null;
    this.calculateDateRange();
    this.render();
};