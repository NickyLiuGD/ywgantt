// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图事件绑定模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-binding.js                        ▓▓
// ▓▓ 版本: Gamma8 - 修复版（恢复依赖关系显示）                      ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 绑定所有事件
     */
    GanttChart.prototype.attachEvents = function() {
        // 左侧任务名称事件
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            el.onclick = (e) => {
                if (el.classList.contains('editing')) return;
                const taskId = el.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };

            el.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.editTaskName(el);
            };
        });

        // 右侧任务名称标签事件
        this.container.querySelectorAll('.gantt-bar-label-external').forEach(label => {
            label.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const taskId = label.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };

            label.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskId = label.dataset.taskId;
                const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                if (taskNameEl) this.editTaskName(taskNameEl);
            };
        });

        // 甘特图任务条事件
        this.container.querySelectorAll('.gantt-bar').forEach(bar => {
            const taskId = bar.dataset.taskId;

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

            bar.ondblclick = (e) => {
                if (e.target.classList.contains('gantt-bar-handle')) return;
                e.preventDefault();
                e.stopPropagation();
                const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                if (taskNameEl) this.editTaskName(taskNameEl);
            };
        });

        // 点击时间轴空白处取消选择
        const timelineWrapper = this.container.querySelector('.gantt-timeline-wrapper');
        if (timelineWrapper) {
            timelineWrapper.addEventListener('click', (e) => {
                if (!e.target.closest('.gantt-bar, .gantt-bar-handle, .inline-task-form, .gantt-bar-label-external')) {
                    this.deselect();
                }
            });
        }

        // 全局鼠标事件
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
     * 取消选择（完整版 - 清除所有高亮）
     */
    GanttChart.prototype.deselect = function() {
        if (!this.selectedTask) return;

        this.selectedTask = null;
        
        // ⭐ 清除所有选中和依赖高亮
        this.container.querySelectorAll('.selected, .dep-highlight').forEach(el => {
            el.classList.remove('selected', 'dep-highlight');
        });
        
        // ⭐ 清除依赖箭头高亮
        this.container.querySelectorAll('.dep-highlight-arrow').forEach(path => {
            path.classList.remove('dep-highlight-arrow');
        });
        
        // 移除编辑表单
        const form = this.container.querySelector('.inline-task-form');
        if (form) form.remove();
        
        addLog('✅ 已取消选择');
    };

    console.log('✅ gantt-events-binding.js loaded successfully (修复版 - 恢复依赖关系显示)');

})();
