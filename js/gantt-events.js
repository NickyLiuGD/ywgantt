/**
 * 甘特图事件处理模块
 * 选中任务时，在甘特图内部弹出编辑界面（浮动卡片）
 */

GanttChart.prototype.attachEvents = function() {
    // ------------------- 左侧任务名称 -------------------
    this.container.querySelectorAll('.gantt-task-name').forEach(el => {
        el.onclick = (e) => {
            if (el.classList.contains('editing')) return;
            const taskId = el.dataset.taskId;
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            // 选中任务并在甘特图内部弹出编辑界面
            this.selectTask(taskId);
            this.showInlineTaskForm(task);
        };

        el.ondblclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.editTaskName(el);
        };
    });

    // ------------------- 甘特图任务条 -------------------
    this.container.querySelectorAll('.gantt-bar').forEach(bar => {
        const taskId = bar.dataset.taskId;

        // 点击：切换依赖（仅表单打开时）
        bar.onclick = (e) => {
            if (e.target.classList.contains('gantt-bar-handle')) return;

            const formOpen = !!this.container.querySelector('.inline-task-form');
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

        // 双击编辑名称
        bar.ondblclick = (e) => {
            if (e.target.classList.contains('gantt-bar-handle')) return;
            e.preventDefault();
            e.stopPropagation();
            const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
            if (taskNameEl) this.editTaskName(taskNameEl);
        };
    });

    // ------------------- 点击时间轴空白处取消选择 -------------------
    const timelineWrapper = this.container.querySelector('.gantt-timeline-wrapper');
    if (timelineWrapper) {
        timelineWrapper.addEventListener('click', (e) => {
            if (!e.target.closest('.gantt-bar, .gantt-bar-handle, .inline-task-form')) {
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

// ------------------- 选择任务（仅高亮，不自动打开表单） -------------------
GanttChart.prototype.selectTask = function(taskId) {
    if (this.selectedTask === taskId) return;

    // 清除所有高亮和旧表单
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

    // 高亮选中任务
    const selectedBar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
    if (selectedBar) selectedBar.classList.add('selected');

    const selectedName = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
    if (selectedName) selectedName.classList.add('selected');

    // 高亮依赖任务
    const deps = this.getAllDependencies(taskId);
    deps.forEach(depId => {
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${depId}"]`);
        if (bar) bar.classList.add('dep-highlight');
        const name = this.container.querySelector(`.gantt-task-name[data-task-id="${depId}"]`);
        if (name) name.classList.add('dep-highlight');
    });

    // 高亮依赖箭头
    this.container.querySelectorAll('.gantt-dependencies path').forEach(path => {
        const fromId = path.dataset.from;
        const toId = path.dataset.to;
        if (deps.has(fromId) && (toId === taskId || deps.has(toId))) {
            path.classList.add('dep-highlight-arrow');
        }
    });

    addLog(`已选择任务 "${task.name}"`);
};

// ------------------- 取消选择 -------------------
GanttChart.prototype.deselect = function() {
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
};

// ------------------- 在甘特图内部显示编辑表单 -------------------
GanttChart.prototype.showInlineTaskForm = function(task) {
    // 移除旧表单
    const oldForm = this.container.querySelector('.inline-task-form');
    if (oldForm) oldForm.remove();

    const bar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`);
    if (!bar) return;

    const rect = bar.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const timelineRect = this.container.querySelector('.gantt-timeline-wrapper').getBoundingClientRect();

    const form = document.createElement('div');
    form.className = 'inline-task-form';
    form.style.position = 'absolute';
    form.style.left = `${rect.left - timelineRect.left + 20}px`;
    form.style.top = `${rect.bottom - timelineRect.top + 8}px`;
    form.style.zIndex = '1000';
    form.style.width = '320px';
    form.style.background = 'white';
    form.style.borderRadius = '12px';
    form.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
    form.style.padding = '16px';
    form.style.border = '1px solid #dee2e6';
    form.style.fontSize = '0.9rem';

    const availableTasks = this.tasks.filter(t => t.id !== task.id);

    form.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0 fw-bold">编辑任务</h6>
            <button type="button" class="btn-close btn-close-sm" id="closeForm"></button>
        </div>
        <div class="mb-2">
            <label class="form-label fw-semibold">任务名称</label>
            <input type="text" class="form-control form-control-sm" id="editName" value="${task.name}">
        </div>
        <div class="row g-2">
            <div class="col-6">
                <label class="form-label fw-semibold">开始日期</label>
                <input type="date" class="form-control form-control-sm" id="editStart" value="${task.start}">
            </div>
            <div class="col-6">
                <label class="form-label fw-semibold">结束日期</label>
                <input type="date" class="form-control form-control-sm" id="editEnd" value="${task.end}">
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label fw-semibold d-flex justify-content-between align-items-center">
                完成进度: <span id="progressVal">${task.progress}%</span>
            </label>
            <input type="range" class="form-range" id="editProgress" value="${task.progress}" min="0" max="100" step="5">
        </div>
        <div class="mb-3">
            <label class="form-label fw-semibold">依赖任务</label>
            <div id="depList" class="border rounded p-2" style="max-height:100px;overflow-y:auto;background:#f8f9fa;">
                ${availableTasks.length > 0 ? availableTasks.map(t => `
                    <div class="form-check form-check-inline mb-1">
                        <input class="form-check-input" type="checkbox" value="${t.id}" id="dep_${t.id}"
                            ${task.dependencies?.includes(t.id) ? 'checked' : ''}>
                        <label class="form-check-label small" for="dep_${t.id}">${t.name}</label>
                    </div>
                `).join('') : '<small class="text-muted">无其他任务</small>'}
            </div>
            <small class="text-muted">提示：点击其他任务条可快速切换依赖</small>
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm flex-fill" id="saveTask">保存</button>
            <button class="btn btn-secondary btn-sm flex-fill" id="cancelEdit">取消</button>
        </div>
    `;

    // 插入到时间轴容器
    const timelineWrapper = this.container.querySelector('.gantt-timeline-wrapper');
    timelineWrapper.appendChild(form);

    // 进度条同步
    const progressInput = form.querySelector('#editProgress');
    const progressVal = form.querySelector('#progressVal');
    progressInput.oninput = () => progressVal.textContent = progressInput.value + '%';

    // 保存
    form.querySelector('#saveTask').onclick = () => {
        const newName = form.querySelector('#editName').value.trim();
        if (!newName) { alert('任务名称不能为空'); return; }
        task.name = newName;
        task.start = form.querySelector('#editStart').value;
        task.end = form.querySelector('#editEnd').value;
        task.progress = parseInt(progressInput.value);
        task.dependencies = Array.from(form.querySelectorAll('#depList input[type="checkbox"]:checked')).map(cb => cb.value);
        this.calculateDateRange();
        this.render();
        addLog(`任务 "${task.name}" 已更新`);
        form.remove();
    };

    // 取消
    form.querySelector('#cancelEdit').onclick = () => form.remove();
    form.querySelector('#closeForm').onclick = () => form.remove();

    // 点击外部关闭
    const clickOutside = (e) => {
        if (!form.contains(e.target) && !bar.contains(e.target)) {
            form.remove();
            document.removeEventListener('click', clickOutside);
        }
    };
    setTimeout(() => document.addEventListener('click', clickOutside), 0);
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