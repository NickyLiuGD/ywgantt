// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图事件绑定模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-binding.js                        ▓▓
// ▓▓ 版本: Delta7 - 完整版（包含所有事件处理 + 双层时间标签）       ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 绑定所有事件
     */
    GanttChart.prototype.attachEvents = function() {
        // ==================== 左侧任务名称事件 ====================
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            // 单击：选中任务并打开编辑表单
            el.onclick = (e) => {
                if (el.classList.contains('editing')) return;
                const taskId = el.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };

            // 双击：编辑任务名称
            el.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.editTaskName(el);
            };
        });

        // ==================== 右侧任务名称标签事件 ====================
        this.container.querySelectorAll('.gantt-bar-label-external').forEach(label => {
            // 单击：选中任务并打开编辑表单
            label.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const taskId = label.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };

            // 双击：编辑任务名称
            label.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskId = label.dataset.taskId;
                const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                if (taskNameEl) this.editTaskName(taskNameEl);
            };
        });

        // ==================== 左侧双层时间标签事件 ====================
        this.container.querySelectorAll('.gantt-bar-label-start').forEach(label => {
            // 单击：选中任务并打开编辑表单
            label.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const taskId = label.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };

            // 双击：快速修改开始或结束日期
            label.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskId = label.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;
                
                // 判断点击的是上层还是下层
                const clickedElement = e.target;
                const isStartTime = clickedElement.classList.contains('time-start');
                
                if (isStartTime) {
                    // 修改开始日期
                    const newDate = prompt('修改开始日期 (YYYY-MM-DD):', task.start);
                    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                        const duration = daysBetween(task.start, task.end);
                        task.start = newDate;
                        task.end = formatDate(addDays(new Date(newDate), duration));
                        this.calculateDateRange();
                        this.render();
                        addLog(`✅ 已修改任务"${task.name}"的开始日期为 ${newDate}`);
                    }
                } else {
                    // 修改结束日期
                    const newDate = prompt('修改结束日期 (YYYY-MM-DD):', task.end);
                    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                        const newEndDate = new Date(newDate);
                        const startDate = new Date(task.start);
                        if (newEndDate >= startDate) {
                            task.end = newDate;
                            this.calculateDateRange();
                            this.render();
                            addLog(`✅ 已修改任务"${task.name}"的结束日期为 ${newDate}`);
                        } else {
                            alert('结束日期不能早于开始日期！');
                        }
                    }
                }
            };
        });

        // ==================== 甘特图任务条事件 ====================
        this.container.querySelectorAll('.gantt-bar').forEach(bar => {
            const taskId = bar.dataset.taskId;

            // 单击：切换依赖（仅在表单打开时）
            bar.onclick = (e) => {
                if (e.target.classList.contains('gantt-bar-handle')) return;

                const formOpen = !!this.container.querySelector('.inline-task-form');
                if (formOpen) {
                    const selectedTask = this.getSelectedTask();
                    if (selectedTask && selectedTask.id !== taskId) {
                        const depInput = document.getElementById(`dep_${taskId}`);
                        if (depInput) {
                            depInput.checked = !depInput.checked;
                            const task = this.tasks.find(t => t.id === taskId);
                            addLog(`${depInput.checked ? '添加' : '移除'}依赖：${task.name}`);
                        }
                    }
                    e.stopPropagation();
                    return;
                }
            };

            // 鼠标按下：开始拖拽或调整大小
            bar.onmousedown = (e) => {
                const target = e.target;
                
                // 如果点击的是调整手柄
                if (target.classList.contains('gantt-bar-handle')) {
                    if (!this.options.enableResize) return;
                    const isRight = target.classList.contains('right');
                    const task = this.tasks.find(t => t.id === taskId);
                    this.startResize(e, task, bar, isRight);
                } else {
                    // 点击任务条主体，开始拖拽
                    if (!this.options.enableEdit) return;
                    const task = this.tasks.find(t => t.id === taskId);
                    this.startDrag(e, task, bar);
                }
                e.preventDefault();
                e.stopPropagation();
            };

            // 双击：编辑任务名称
            bar.ondblclick = (e) => {
                if (e.target.classList.contains('gantt-bar-handle')) return;
                e.preventDefault();
                e.stopPropagation();
                const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                if (taskNameEl) this.editTaskName(taskNameEl);
            };
        });

        // ==================== 点击时间轴空白处取消选择 ====================
        const timelineWrapper = this.container.querySelector('.gantt-timeline-wrapper');
        if (timelineWrapper) {
            timelineWrapper.addEventListener('click', (e) => {
                // 如果点击的不是任务条、手柄、表单或标签，则取消选择
                if (!e.target.closest('.gantt-bar, .gantt-bar-handle, .inline-task-form, .gantt-bar-label-external, .gantt-bar-label-start')) {
                    this.deselect();
                }
            });
        }

        // ==================== 全局鼠标事件（拖拽和调整大小）====================
        if (!this._mouseMoveHandler) {
            this._mouseMoveHandler = (e) => this.onMouseMove(e);
        }
        if (!this._mouseUpHandler) {
            this._mouseUpHandler = (e) => {
                if (this.dragState) this.onMouseUp(e);
            };
        }
        
        document.addEventListener('mousemove', this._mouseMoveHandler);
        document.addEventListener('mouseup', this._mouseUpHandler);
    };

    /**
     * 编辑任务名称（内联编辑）
     * @param {HTMLElement} element - 任务名称元素
     */
    GanttChart.prototype.editTaskName = function(element) {
        if (element.classList.contains('editing')) return;
        
        const taskId = element.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const originalName = task.name;

        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.style.cssText = 'border:1px solid #007bff;border-radius:4px;padding:4px 8px;font-size:0.9rem;width:100%;outline:none;';

        // 替换元素内容
        element.innerHTML = '';
        element.appendChild(input);
        element.classList.add('editing');
        
        // 聚焦并选中文本
        setTimeout(() => { 
            input.focus(); 
            input.select(); 
        }, 10);

        // 保存编辑
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== originalName) {
                task.name = newName;
                addLog(`任务名称从 "${originalName}" 改为 "${newName}"`);
            }
            
            // 恢复显示
            element.textContent = task.name;
            element.classList.remove('editing');
            
            // 更新外部标签
            const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
            if (externalLabel) {
                externalLabel.textContent = `${task.name} (${task.progress || 0}%)`;
            }
        };

        // 失焦时保存
        input.onblur = () => setTimeout(saveEdit, 100);
        
        // 键盘事件
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                element.textContent = originalName;
                element.classList.remove('editing');
            }
        };
        
        // 阻止点击冒泡
        input.onclick = (e) => e.stopPropagation();
    };

    console.log('✅ gantt-events-binding.js loaded successfully (Delta7 - 完整版)');

})();
