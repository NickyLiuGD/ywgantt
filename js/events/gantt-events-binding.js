// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图事件绑定模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-binding.js                        ▓▓
// ▓▓ 版本: Epsilon23 - 完整版 (画布拖拽 + 滚轮缩放 + 原有交互)       ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 绑定所有事件
     */
    GanttChart.prototype.attachEvents = function() {
        
        // 1. 绑定表头折叠/展开按钮 (如果有的话)
        const expandAllBtn = this.container.querySelector('#expandAllBtn');
        const collapseAllBtn = this.container.querySelector('#collapseAllBtn');

        if (expandAllBtn) {
            expandAllBtn.onclick = (e) => {
                e.stopPropagation();
                if (typeof this.expandAllTasks === 'function') this.expandAllTasks();
            };
        }

        if (collapseAllBtn) {
            collapseAllBtn.onclick = (e) => {
                e.stopPropagation();
                if (typeof this.collapseAllTasks === 'function') this.collapseAllTasks();
            };
        }

        // ==================== ⭐ 新增：画布拖拽与缩放逻辑 ====================
        
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        if (rowsContainer) {
            // --- A. 画布拖拽 (Pan) ---
            
            // 清理旧的全局监听器，防止重复绑定
            if (this._panMoveHandler) window.removeEventListener('mousemove', this._panMoveHandler);
            if (this._panUpHandler) window.removeEventListener('mouseup', this._panUpHandler);

            let isPanning = false;
            let panStartX = 0;
            let panStartY = 0;
            let panScrollLeft = 0;
            let panScrollTop = 0;

            // 1. 鼠标按下：开始拖拽
            rowsContainer.onmousedown = (e) => {
                // 卫语句：如果点击的是任务条、手柄、里程碑或表单，则不触发画布拖拽
                if (e.target.closest('.gantt-bar') || 
                    e.target.closest('.gantt-milestone') || 
                    e.target.closest('.gantt-bar-handle') ||
                    e.target.closest('.inline-task-form') ||
                    e.target.closest('.gantt-bar-label-start') || // 防止与时间标签冲突
                    e.target.closest('.gantt-bar-label-external')) {
                    return;
                }

                // 仅允许左键 (0) 或中键 (1)
                if (e.button !== 0 && e.button !== 1) return;

                isPanning = true;
                panStartX = e.clientX;
                panStartY = e.clientY;
                panScrollLeft = rowsContainer.scrollLeft;
                panScrollTop = rowsContainer.scrollTop;
                
                rowsContainer.style.cursor = 'grabbing'; // 抓取手势
                e.preventDefault(); // 防止选中文本
            };

            // 2. 鼠标移动：执行滚动 (绑定到 window 以防鼠标移出容器)
            this._panMoveHandler = (e) => {
                if (!isPanning) return;
                
                const deltaX = e.clientX - panStartX;
                const deltaY = e.clientY - panStartY;
                
                // 逻辑：鼠标向左移(负)，视野应向右(ScrollLeft变大) -> 也就是拖着纸向左
                rowsContainer.scrollLeft = panScrollLeft - deltaX;
                rowsContainer.scrollTop = panScrollTop - deltaY;
            };

            // 3. 鼠标松开：结束拖拽
            this._panUpHandler = () => {
                if (isPanning) {
                    isPanning = false;
                    rowsContainer.style.cursor = 'grab'; // 恢复为抓手
                }
            };

            window.addEventListener('mousemove', this._panMoveHandler);
            window.addEventListener('mouseup', this._panUpHandler);

            // --- B. 滚轮缩放 (Zoom) ---
            
            rowsContainer.addEventListener('wheel', (e) => {
                // 允许直接滚轮缩放，或者按住 Ctrl 缩放 (根据习惯调整，这里设为直接缩放)
                // 为了避免与垂直滚动冲突，通常结合 Ctrl 键，或者检测是否横向滚动
                // 这里假设直接滚轮用于缩放（类似地图/PERT体验）
                
                // 如果在全貌模式下，或者用户习惯，可以加上 e.ctrlKey 判断
                // if (!e.ctrlKey) return; 

                e.preventDefault();
                
                if (this._isZooming) return; // 节流锁
                this._isZooming = true;

                requestAnimationFrame(() => {
                    const rect = rowsContainer.getBoundingClientRect();
                    // 计算鼠标相对于容器内容的 X 坐标
                    // 注意：handleWheelZoom 内部会处理 scrollLeft，这里传入相对于可视窗口左边缘的偏移即可
                    const mouseX = e.clientX - rect.left;
                    const delta = e.deltaY > 0 ? -1 : 1; // 下滚缩小，上滚放大
                    
                    if (typeof this.handleWheelZoom === 'function') {
                        this.handleWheelZoom(delta, mouseX, rect.width);
                    }
                    
                    this._isZooming = false;
                });
            }, { passive: false });
        }

        // ==================== 以下为原有逻辑 (无省略) ====================

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

            // 单击
            label.onclick = (e) => {
                if (e.target.classList.contains('collapse-toggle')) return;
                e.preventDefault();
                e.stopPropagation();
                const taskId = label.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;
                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };

            // 双击
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
            // 单击
            label.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskId = label.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;
                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };

            // 双击：快速修改日期
            label.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskId = label.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;
                
                if (task.isSummary) {
                    alert('汇总任务的时间由子任务自动计算，无法手动修改');
                    return;
                }
                if (task.isMilestone) {
                    alert('里程碑的工期为0，无法修改结束日期');
                    return;
                }
                // 检查锁定状态
                if (task.progress >= 100) {
                    alert('🔒 任务已完成 (100%)，无法修改日期');
                    if (typeof addLog === 'function') addLog('🔒 操作被拒绝：任务已锁定');
                    return;
                }
                
                const clickedElement = e.target;
                const isStartTime = clickedElement.classList.contains('time-start');
                
                if (isStartTime) {
                    const newDate = prompt('修改开始日期 (YYYY-MM-DD):', task.start);
                    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                        const duration = task.duration || (typeof daysBetween === 'function' ? daysBetween(task.start, task.end) : 1);
                        task.start = newDate;
                        // 保持工期不变，推算结束日期
                        if (typeof addDays === 'function' && typeof formatDate === 'function') {
                            task.end = formatDate(addDays(new Date(newDate), duration));
                        }
                        
                        if (typeof this.updateParentTasks === 'function') this.updateParentTasks(taskId);
                        this.calculateDateRange();
                        this.render();
                        if (typeof addLog === 'function') addLog(`✅ 已修改任务"${task.name}"的开始日期为 ${newDate}`);
                    }
                } else {
                    const newDate = prompt('修改结束日期 (YYYY-MM-DD):', task.end);
                    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                        const newEndDate = new Date(newDate);
                        const startDate = new Date(task.start);
                        if (newEndDate >= startDate) {
                            task.end = newDate;
                            // 重新计算工期
                            if (typeof daysBetween === 'function') {
                                task.duration = daysBetween(task.start, task.end) + 1;
                            }
                            
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

            // 单击
            bar.onclick = (e) => {
                if (e.target.classList.contains('gantt-bar-handle')) return;
                const formOpen = !!this.container.querySelector('.inline-task-form');
                if (formOpen) {
                    e.stopPropagation();
                    return;
                }
            };

            // 鼠标按下：拖拽入口
            bar.onmousedown = (e) => {
                // 1. 检查特殊任务类型
                if (task && (task.isMilestone || task.isSummary)) {
                    if (typeof addLog === 'function') addLog(`⚠️ ${task.isMilestone ? '里程碑' : '汇总任务'}不可拖拽`);
                    return;
                }
                
                // 2. 检查完成锁定状态
                if (task && task.progress >= 100) {
                    if (typeof addLog === 'function') addLog(`🔒 任务 "${task.name}" 已完成，位置已锁定`);
                    e.preventDefault(); 
                    return;
                }
                
                const target = e.target;
                
                if (target.classList.contains('gantt-bar-handle')) {
                    if (!this.options.enableResize) return;
                    const isRight = target.classList.contains('right');
                    this.startResize(e, task, bar, isRight);
                } else {
                    if (!this.options.enableEdit) return;
                    this.startDrag(e, task, bar);
                }
                e.preventDefault();
                e.stopPropagation();
            };

            // 双击：编辑名称
            bar.ondblclick = (e) => {
                if (e.target.classList.contains('gantt-bar-handle')) return;
                e.preventDefault();
                e.stopPropagation();
                const taskNameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                if (taskNameEl) this.editTaskName(taskNameEl);
            };
        });

        // ==================== 点击空白处取消选择 ====================
        const timelineWrapper = this.container.querySelector('.gantt-timeline-wrapper');
        if (timelineWrapper) {
            timelineWrapper.addEventListener('click', (e) => {
                // 如果点击的不是交互元素，则取消选择
                if (!e.target.closest('.gantt-bar, .gantt-milestone, .gantt-bar-handle, .inline-task-form, .gantt-bar-label-external, .gantt-bar-label-start')) {
                    this.deselect();
                }
            });
        }

        // ==================== 全局任务拖拽鼠标事件 ====================
        if (!this._mouseMoveHandler) {
            this._mouseMoveHandler = (e) => this.onMouseMove(e);
        }
        if (!this._mouseUpHandler) {
            this._mouseUpHandler = (e) => {
                if (this.dragState) this.onMouseUp(e);
            };
        }
        
        // 清理并重新绑定，防止多次 render 导致累积
        document.removeEventListener('mousemove', this._mouseMoveHandler);
        document.removeEventListener('mouseup', this._mouseUpHandler);
        
        document.addEventListener('mousemove', this._mouseMoveHandler);
        document.addEventListener('mouseup', this._mouseUpHandler);
    };

    /**
     * 编辑任务名称（内联编辑）
     */
    GanttChart.prototype.editTaskName = function(element) {
        if (element.classList.contains('editing')) return;
        
        const taskId = element.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const originalName = task.name;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.style.cssText = 'border:1px solid #007bff;border-radius:4px;padding:4px 8px;font-size:0.9rem;width:100%;outline:none;';

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
                if (typeof addLog === 'function') addLog(`✏️ 任务名称从 "${originalName}" 改为 "${newName}"`);
            }
            
            // 恢复显示结构
            const indent = '　'.repeat((task.outlineLevel || 1) - 1);
            const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
            const wbsPrefix = task.wbs ? `<span class="wbs-badge">[${task.wbs}]</span> ` : '';
            
            const collapseBtn = (task.isSummary && task.children && task.children.length > 0) ? 
                `<span class="task-collapse-btn" data-task-id="${task.id}">${task.isCollapsed ? '▶' : '▼'}</span>` : '';
            
            element.innerHTML = `${collapseBtn}<span class="task-name-content">${indent}${icon} ${wbsPrefix}${task.name}</span>`;
            element.classList.remove('editing');
            
            // 重新绑定折叠按钮
            const newCollapseBtn = element.querySelector('.task-collapse-btn');
            if (newCollapseBtn) {
                newCollapseBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.toggleTaskCollapse(task.id);
                };
            }
            
            // 同步更新外部标签
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

        input.onblur = () => setTimeout(saveEdit, 100);
        
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
        
        input.onclick = (e) => e.stopPropagation();
    };

    console.log('✅ gantt-events-binding.js loaded successfully (Epsilon23 - 完整无省略版)');

})();