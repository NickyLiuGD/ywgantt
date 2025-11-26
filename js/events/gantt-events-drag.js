// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图拖拽操作模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-drag.js                           ▓▓
// ▓▓ 版本: Epsilon6-Fix - 修复 historyManager 引用错误               ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 开始拖拽任务
     */
    GanttChart.prototype.startDrag = function(e, task, bar) {
        // 里程碑和汇总任务不可拖拽
        if (task.isMilestone) {
            addLog(`⚠️ 里程碑不可拖拽`);
            return;
        }
        
        if (task.isSummary) {
            addLog(`⚠️ 汇总任务不可拖拽，时间由子任务自动计算`);
            return;
        }
        
        // ⭐ 1. 记录历史：拖拽前的快照 (深拷贝)
        const snapshot = typeof deepClone === 'function' ? deepClone(task) : JSON.parse(JSON.stringify(task));

        this.dragState = { 
            type: 'move', 
            task, 
            bar, 
            startX: e.clientX, 
            originalStart: task.start, 
            originalEnd: task.end,
            snapshot: snapshot // 保存快照供 onMouseUp 使用
        };
        bar.classList.add('dragging');
        addLog(`开始拖动任务 "${task.name}"`);
    };

    /**
     * 开始调整任务大小
     */
    GanttChart.prototype.startResize = function(e, task, bar, isRight) {
        if (task.isMilestone) {
            addLog(`⚠️ 里程碑工期固定为0，不可调整`);
            return;
        }
        
        if (task.isSummary) {
            addLog(`⚠️ 汇总任务时间由子任务自动计算，不可调整`);
            return;
        }
        
        // ⭐ 1. 记录历史：调整前的快照
        const snapshot = typeof deepClone === 'function' ? deepClone(task) : JSON.parse(JSON.stringify(task));

        this.dragState = { 
            type: 'resize', 
            task, 
            bar, 
            isRight, 
            startX: e.clientX, 
            originalStart: task.start, 
            originalEnd: task.end,
            snapshot: snapshot // 保存快照
        };
        bar.classList.add('dragging');
        addLog(`开始调整任务 "${task.name}" ${isRight ? '结束' : '开始'}日期`);
    };

    /**
     * 鼠标移动处理 (UI 实时更新逻辑保持不变)
     */
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
            
            // 更新右侧任务名称标签
            const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${this.dragState.task.id}"]`);
            if (externalLabel) {
                const barWidth = parseFloat(this.dragState.bar.style.width) || this.dragState.bar.offsetWidth;
                externalLabel.style.left = (offset * this.options.cellWidth + barWidth + 8) + 'px';
            }
            
            // 更新左侧双层时间标签
            const startLabel = this.container.querySelector(`.gantt-bar-label-start[data-task-id="${this.dragState.task.id}"]`);
            if (startLabel) {
                startLabel.style.right = `calc(100% - ${offset * this.options.cellWidth}px + 8px)`;
                startLabel.querySelector('.time-start').textContent = formatDate(newStart);
                startLabel.querySelector('.time-end').textContent = formatDate(newEnd);
            }
            
            // 如果表单打开，更新表单位置
            const form = this.container.querySelector('.inline-task-form');
            const rowsContainer = this.container.querySelector('.gantt-rows-container');
            if (form && form.dataset.taskId === this.dragState.task.id && rowsContainer) {
                this.updateFormPosition(form, this.dragState.bar, rowsContainer);
            }
        } else if (this.dragState.type === 'resize') {
            if (this.dragState.isRight) {
                const newEnd = addDays(new Date(this.dragState.originalEnd), deltaDays);
                const start = new Date(this.dragState.task.start);
                if (newEnd >= start) {
                    this.dragState.task.end = formatDate(newEnd);
                    const dur = daysBetween(start, newEnd) + 1;
                    const w = Math.max(dur * this.options.cellWidth, 80);
                    this.dragState.bar.style.width = w + 'px';
                    
                    const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${this.dragState.task.id}"]`);
                    if (externalLabel) {
                        const offset = daysBetween(this.startDate, start);
                        externalLabel.style.left = (offset * this.options.cellWidth + w + 8) + 'px';
                    }
                    
                    const startLabel = this.container.querySelector(`.gantt-bar-label-start[data-task-id="${this.dragState.task.id}"]`);
                    if (startLabel) startLabel.querySelector('.time-end').textContent = formatDate(newEnd);
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
                    
                    const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${this.dragState.task.id}"]`);
                    if (externalLabel) {
                        externalLabel.style.left = (offset * this.options.cellWidth + w + 8) + 'px';
                    }
                    
                    const startLabel = this.container.querySelector(`.gantt-bar-label-start[data-task-id="${this.dragState.task.id}"]`);
                    if (startLabel) {
                        startLabel.style.right = `calc(100% - ${offset * this.options.cellWidth}px + 8px)`;
                        startLabel.querySelector('.time-start').textContent = formatDate(newStart);
                    }
                }
            }
            
            const form = this.container.querySelector('.inline-task-form');
            const rowsContainer = this.container.querySelector('.gantt-rows-container');
            if (form && form.dataset.taskId === this.dragState.task.id && rowsContainer) {
                this.updateFormPosition(form, this.dragState.bar, rowsContainer);
            }
        }
    };

    /**
     * 鼠标释放处理 (提交历史记录)
     */
    GanttChart.prototype.onMouseUp = function(e) {
        if (!this.dragState) return;
        
        const task = this.dragState.task;
        const oldSnapshot = this.dragState.snapshot;
        
        // 根据工期类型重新计算 duration (业务逻辑)
        if (task.durationType === 'workdays') {
            task.duration = workdaysBetween(task.start, task.end);
        } else {
            task.duration = daysBetween(task.start, task.end) + 1;
        }
        
        this.dragState.bar.classList.remove('dragging');
        
        const durationLabel = task.durationType === 'workdays' ? '工作日' : '自然日';
        
        // ⭐⭐⭐ 核心修复：使用 window.historyManager 避免引用错误 ⭐⭐⭐
        if (window.historyManager && (oldSnapshot.start !== task.start || oldSnapshot.end !== task.end)) {
            const newSnapshot = typeof deepClone === 'function' ? deepClone(task) : JSON.parse(JSON.stringify(task));
            
            const actionType = this.dragState.type === 'resize' ? 'RESIZE' : 'MOVE';
            const desc = this.dragState.type === 'resize' 
                ? `调整任务 "${task.name}" 工期为 ${task.duration} 天`
                : `移动任务 "${task.name}" 到 ${task.start}`;

            window.historyManager.record(
                actionType,
                { task: oldSnapshot }, // Undo: 恢复旧状态
                { task: newSnapshot }, // Redo: 应用新状态
                desc
            );
        }

        addLog(`任务 "${task.name}" 已${this.dragState.type === 'move' ? '移动' : '调整'}到 ${task.start} ~ ${task.end}，工期 ${task.duration} ${durationLabel}`);
        
        this.dragState = null;
        
        // 更新父任务聚合时间
        if (typeof this.updateParentTasks === 'function') {
            this.updateParentTasks(task.id);
        }
        
        this.calculateDateRange();
        this.render();
    };

    console.log('✅ gantt-events-drag.js loaded (Epsilon6-Fix)');
})();