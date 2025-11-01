/**
 * 甘特图事件处理模块
 */

// 绑定事件
GanttChart.prototype.attachEvents = function() {
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
};

// 编辑任务名称
GanttChart.prototype.editTaskName = function(element) {
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
};

// 开始拖动任务
GanttChart.prototype.startDrag = function(e, task, bar) {
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
};

// 开始调整任务大小
GanttChart.prototype.startResize = function(e, task, bar, isRight) {
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
};

// 鼠标移动事件
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
};

// 鼠标释放事件
GanttChart.prototype.onMouseUp = function(e) {
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
};