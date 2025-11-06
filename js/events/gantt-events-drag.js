// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图拖拽操作模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-drag.js                           ▓▓
// ▓▓ 版本: Gamma8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 开始拖拽任务
     */
    GanttChart.prototype.startDrag = function(e, task, bar) {
        this.dragState = { 
            type: 'move', 
            task, 
            bar, 
            startX: e.clientX, 
            originalStart: task.start, 
            originalEnd: task.end 
        };
        bar.classList.add('dragging');
        addLog(`开始拖动任务 "${task.name}"`);
    };

    /**
     * 开始调整任务大小
     */
    GanttChart.prototype.startResize = function(e, task, bar, isRight) {
        this.dragState = { 
            type: 'resize', 
            task, 
            bar, 
            isRight, 
            startX: e.clientX, 
            originalStart: task.start, 
            originalEnd: task.end 
        };
        bar.classList.add('dragging');
        addLog(`开始调整任务 "${task.name}" ${isRight ? '结束' : '开始'}日期`);
    };

    /**
     * 鼠标移动处理（添加左侧标签更新）
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
            
            // ⭐ 更新右侧任务名称标签
            const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${this.dragState.task.id}"]`);
            if (externalLabel) {
                const barWidth = parseFloat(this.dragState.bar.style.width) || this.dragState.bar.offsetWidth;
                externalLabel.style.left = (offset * this.options.cellWidth + barWidth + 8) + 'px';
            }
            
            // ⭐ 更新左侧双层时间标签
            const startLabel = this.container.querySelector(`.gantt-bar-label-start[data-task-id="${this.dragState.task.id}"]`);
            if (startLabel) {
                startLabel.style.right = `calc(100% - ${offset * this.options.cellWidth}px + 8px)`;
                
                // 更新双层文本
                const scale = this.options.timeScale || 'day';
                let startTimeLabel = '';
                let endTimeLabel = '';
                
                switch (scale) {
                    case 'day':
                        startTimeLabel = formatDate(newStart);
                        endTimeLabel = formatDate(new Date(this.dragState.task.end));
                        break;
                    case 'week':
                        const startWeek = getWeekNumber(newStart);
                        const endWeek = getWeekNumber(new Date(this.dragState.task.end));
                        startTimeLabel = `第${startWeek}周`;
                        endTimeLabel = `第${endWeek}周`;
                        break;
                    case 'month':
                        startTimeLabel = `${newStart.getMonth() + 1}月${newStart.getDate()}日`;
                        const endDate = new Date(this.dragState.task.end);
                        endTimeLabel = `${endDate.getMonth() + 1}月${endDate.getDate()}日`;
                        break;
                }
                
                const timeStartEl = startLabel.querySelector('.time-start');
                const timeEndEl = startLabel.querySelector('.time-end');
                if (timeStartEl) timeStartEl.textContent = startTimeLabel;
                if (timeEndEl) timeEndEl.textContent = endTimeLabel;
            }

            
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
                    
                    // ⭐ 更新右侧标签
                    const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${this.dragState.task.id}"]`);
                    if (externalLabel) {
                        externalLabel.style.left = (offset * this.options.cellWidth + w + 8) + 'px';
                    }
                    
                    // ⭐ 更新左侧双层时间标签（调整大小时）
                    const startLabel = this.container.querySelector(`.gantt-bar-label-start[data-task-id="${this.dragState.task.id}"]`);
                    if (startLabel) {
                        startLabel.style.right = `calc(100% - ${offset * this.options.cellWidth}px + 8px)`;
                        
                        const scale = this.options.timeScale || 'day';
                        let startTimeLabel = '';
                        let endTimeLabel = '';
                        
                        switch (scale) {
                            case 'day':
                                startTimeLabel = formatDate(newStart);
                                endTimeLabel = formatDate(end);
                                break;
                            case 'week':
                                const startWeek = getWeekNumber(newStart);
                                const endWeek = getWeekNumber(end);
                                startTimeLabel = `第${startWeek}周`;
                                endTimeLabel = `第${endWeek}周`;
                                break;
                            case 'month':
                                startTimeLabel = `${newStart.getMonth() + 1}月${newStart.getDate()}日`;
                                endTimeLabel = `${end.getMonth() + 1}月${end.getDate()}日`;
                                break;
                        }
                        
                        const timeStartEl = startLabel.querySelector('.time-start');
                        const timeEndEl = startLabel.querySelector('.time-end');
                        if (timeStartEl) timeStartEl.textContent = startTimeLabel;
                        if (timeEndEl) timeEndEl.textContent = endTimeLabel;
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
     * 鼠标释放处理
     */
    GanttChart.prototype.onMouseUp = function(e) {
        if (!this.dragState) return;
        const task = this.dragState.task;
        const duration = daysBetween(task.start, task.end) + 1;
        this.dragState.bar.classList.remove('dragging');
        addLog(`任务 "${task.name}" 已${this.dragState.type === 'move' ? '移动' : '调整'}到 ${task.start} ~ ${task.end}，工期 ${duration} 天`);
        this.dragState = null;
        this.calculateDateRange();
        this.render();
    };

    console.log('✅ gantt-events-drag.js loaded successfully');

})();
