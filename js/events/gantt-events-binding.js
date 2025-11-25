// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图事件绑定模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-binding.js                        ▓▓
// ▓▓ 版本: Epsilon6 - 支持全部展开/折叠按钮                         ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 绑定所有事件
     */
    GanttChart.prototype.attachEvents = function() {
        // ⭐ 新增：绑定表头"全部折叠/展开"按钮事件
        const expandAllBtn = this.container.querySelector('#expandAllBtn');
        const collapseAllBtn = this.container.querySelector('#collapseAllBtn');

        if (expandAllBtn) {
            expandAllBtn.onclick = (e) => {
                e.stopPropagation();
                // 调用 gantt-operations.js 中定义的方法
                if (typeof this.expandAllTasks === 'function') {
                    this.expandAllTasks();
                } else {
                    console.warn('expandAllTasks method not found');
                }
            };
        }

        if (collapseAllBtn) {
            collapseAllBtn.onclick = (e) => {
                e.stopPropagation();
                // 调用 gantt-operations.js 中定义的方法
                if (typeof this.collapseAllTasks === 'function') {
                    this.collapseAllTasks();
                } else {
                    console.warn('collapseAllTasks method not found');
                }
            };
        }

        // ==================== 左侧任务名称事件 ====================
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            // 折叠按钮事件（优先处理，阻止冒泡）
            const collapseBtn = el.querySelector('.task-collapse-btn');
            if (collapseBtn) {
                collapseBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const taskId = collapseBtn.dataset.taskId;
                    this.toggleTaskCollapse(taskId);
                };
            }

            // 单击：选中任务并打开编辑表单
            el.onclick = (e) => {
                // 如果点击的是折叠按钮，不触发选择
                if (e.target.classList.contains('task-collapse-btn')) return;
                
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
            // 折叠按钮事件
            const collapseToggle = label.querySelector('.collapse-toggle');
            if (collapseToggle) {
                collapseToggle.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const taskId = collapseToggle.dataset.taskId;
                    this.toggleTaskCollapse(taskId);
                };
            }

            // 单击：选中任务并打开编辑表单
            label.onclick = (e) => {
                // 如果点击的是折叠按钮，不触发选择
                if (e.target.classList.contains('collapse-toggle')) return;
                
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
                
                // 汇总任务不允许手动修改时间
                if (task.isSummary) {
                    alert('汇总任务的时间由子任务自动计算，无法手动修改');
                    return;
                }
                
                // 里程碑不允许修改结束日期
                if (task.isMilestone) {
                    alert('里程碑的工期为0，无法修改结束日期');
                    return;
                }
                
                const clickedElement = e.target;
                const isStartTime = clickedElement.classList.contains('time-start');
                
                if (isStartTime) {
                    // 修改开始日期
                    const newDate = prompt('修改开始日期 (YYYY-MM-DD):', task.start);
                    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                        const duration = task.duration || (typeof daysBetween === 'function' ? daysBetween(task.start, task.end) : 1);
                        task.start = newDate;
                        
                        // 重新计算结束日期
                        if (typeof addDays === 'function') {
                            task.end = typeof formatDate === 'function' ? formatDate(addDays(new Date(newDate), duration)) : task.end;
                        }
                        
                        // 更新父任务
                        if (typeof this.updateParentTasks === 'function') this.updateParentTasks(taskId);
                        
                        this.calculateDateRange();
                        this.render();
                        if (typeof addLog === 'function') addLog(`✅ 已修改任务"${task.name}"的开始日期为 ${newDate}`);
                    }
                } else {
                    // 修改结束日期
                    const newDate = prompt('修改结束日期 (YYYY-MM-DD):', task.end);
                    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                        const newEndDate = new Date(newDate);
                        const startDate = new Date(task.start);
                        if (newEndDate >= startDate) {
                            task.end = newDate;
                            task.duration = (typeof daysBetween === 'function' ? daysBetween(task.start, task.end) : 0) + 1;
                            
                            // 更新父任务
                            if (typeof this.updateParentTasks === 'function') this.updateParentTasks(taskId);
                            
                            this.calculateDateRange();
                            this.render();
                            if (typeof addLog === 'function') addLog(`✅ 已修改任务"${task.name}"的结束日期为 ${newDate}`);
                        } else {
                            alert('结束日期不能早于开始日期！');
                        }
                    }
                }
            };
        });

        // ==================== 甘特图任务条/里程碑事件 ====================
        this.container.querySelectorAll('.gantt-bar, .gantt-milestone').forEach(bar => {
            const taskId = bar.dataset.taskId;
            const task = this.tasks.find(t => t.id === taskId);

            // 单击：切换依赖（仅在表单打开时）
            bar.onclick = (e) => {
                if (e.target.classList.contains('gantt-bar-handle')) return;

                const formOpen = !!this.container.querySelector('.inline-task-form');
                if (formOpen) {
                    const selectedTask = this.getSelectedTask();
                    if (selectedTask && selectedTask.id !== taskId) {
                        // 仅做界面反馈，实际依赖添加逻辑在表单操作中
                        console.log('点击任务条尝试交互依赖');
                    }
                    e.stopPropagation();
                    return;
                }
            };

            // 鼠标按下：开始拖拽或调整大小
            bar.onmousedown = (e) => {
                // 里程碑和汇总任务不可拖拽
                if (task && (task.isMilestone || task.isSummary)) {
                    if (typeof addLog === 'function') {
                        addLog(`⚠️ ${task.isMilestone ? '里程碑' : '汇总任务'}不可拖拽，时间${task.isSummary ? '由子任务自动计算' : '固定为0'}`);
                    }
                    return;
                }
                
                const target = e.target;
                
                // 如果点击的是调整手柄
                if (target.classList.contains('gantt-bar-handle')) {
                    if (!this.options.enableResize) return;
                    const isRight = target.classList.contains('right');
                    this.startResize(e, task, bar, isRight);
                } else {
                    // 点击任务条主体，开始拖拽
                    if (!this.options.enableEdit) return;
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
                if (!e.target.closest('.gantt-bar, .gantt-milestone, .gantt-bar-handle, .inline-task-form, .gantt-bar-label-external, .gantt-bar-label-start')) {
                    this.deselect();
                }
            });
        }

        // ==================== 全局鼠标事件（拖拽和调整大小）====================
        // 防止重复绑定
        if (!this._mouseMoveHandler) {
            this._mouseMoveHandler = (e) => this.onMouseMove(e);
        }
        if (!this._mouseUpHandler) {
            this._mouseUpHandler = (e) => {
                if (this.dragState) this.onMouseUp(e);
            };
        }
        
        // 确保先移除旧的监听器（如果存在）
        document.removeEventListener('mousemove', this._mouseMoveHandler);
        document.removeEventListener('mouseup', this._mouseUpHandler);
        
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
                if (typeof addLog === 'function') addLog(`✏️ 任务名称从 "${originalName}" 改为 "${newName}"`);
            }
            
            // 恢复显示
            const indent = '　'.repeat((task.outlineLevel || 1) - 1);
            const icon = task.isMilestone ? '🎯' : task.isSummary ? '📁' : '📋';
            const wbsPrefix = task.wbs ? `<span class="wbs-badge">[${task.wbs}]</span> ` : '';
            
            // 重新生成折叠按钮
            const collapseBtn = task.isSummary && task.children && task.children.length > 0 ? 
                `<span class="task-collapse-btn" data-task-id="${task.id}">${task.isCollapsed ? '▶' : '▼'}</span>` : '';
            
            element.innerHTML = `${collapseBtn}<span class="task-name-content">${indent}${icon} ${wbsPrefix}${task.name}</span>`;
            element.classList.remove('editing');
            
            // 重新绑定折叠按钮事件
            const newCollapseBtn = element.querySelector('.task-collapse-btn');
            if (newCollapseBtn) {
                newCollapseBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.toggleTaskCollapse(task.id);
                };
            }
            
            // 更新外部标签
            const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
            if (externalLabel) {
                const displayName = `${indent}${icon} ${task.wbs ? '[' + task.wbs + '] ' : ''}${task.name}`;
                const progressBadge = !task.isMilestone ? `<span class="task-progress-badge">${task.progress || 0}%</span>` : '';
                const collapseToggle = (task.isSummary && task.children && task.children.length > 0) ? 
                    `<span class="collapse-toggle" data-task-id="${task.id}">${task.isCollapsed ? '▶' : '▼'}</span>` : '';
                
                externalLabel.innerHTML = `${displayName} ${progressBadge}${collapseToggle}`;
                
                const extCollapseToggle = externalLabel.querySelector('.collapse-toggle');
                if (extCollapseToggle) {
                    extCollapseToggle.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        this.toggleTaskCollapse(task.id);
                    };
                }
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

    console.log('✅ gantt-events-binding.js loaded successfully (Epsilon6 - 全折叠支持)');

})();