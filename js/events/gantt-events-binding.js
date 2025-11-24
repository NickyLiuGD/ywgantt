// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图事件绑定模块 (企业级完整版)                                  ▓▓
// ▓▓ 路径: js/events/gantt-events-binding.js                        ▓▓
// ▓▓ 版本: Epsilon32 - 补全 Touch 支持与右键处理                     ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    GanttChart.prototype.attachEvents = function() {
        if (!this.container) return;

        // ==================== 1. 任务名称栏事件 ====================
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            const taskId = el.dataset.taskId;
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            // 折叠按钮
            const collapseBtn = el.querySelector('.task-collapse-btn');
            if (collapseBtn) {
                collapseBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.toggleTaskCollapse(taskId);
                };
                // 移动端触摸支持
                collapseBtn.ontouchend = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.toggleTaskCollapse(taskId);
                };
            }

            // 单击选中
            el.onclick = (e) => {
                if (el.classList.contains('editing') || e.target.classList.contains('task-collapse-btn')) return;
                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };

            // 双击编辑
            el.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.editTaskName(el);
            };
        });

        // ==================== 2. 任务条交互 (Mouse & Touch) ====================
        this.container.querySelectorAll('.gantt-bar, .gantt-milestone').forEach(bar => {
            const taskId = bar.dataset.taskId;
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            // --- 通用点击处理 ---
            const handleClick = (e) => {
                if (e.target.classList.contains('gantt-bar-handle')) return;
                if (bar.classList.contains('dragging') || this.isDragging) return;
                
                e.stopPropagation();
                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };
            
            bar.onclick = handleClick;

            // --- 鼠标按下 (Desktop) ---
            bar.onmousedown = (e) => {
                if (e.button !== 0) return; // 仅左键
                this.handleInputStart(e, task, bar);
            };

            // --- 触摸开始 (Mobile) ---
            bar.ontouchstart = (e) => {
                if (e.touches.length > 1) return; // 忽略多指触控
                const touch = e.touches[0];
                // 模拟鼠标事件对象
                const mockEvent = {
                    target: e.target,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => e.preventDefault(),
                    stopPropagation: () => e.stopPropagation(),
                    type: 'touchstart'
                };
                this.handleInputStart(mockEvent, task, bar);
            };

            // 双击编辑
            bar.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const nameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                if (nameEl) this.editTaskName(nameEl);
            };
            
            // 右键菜单阻止 (预留)
            bar.oncontextmenu = (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                // 未来可在此处调用 showContextMenu(e, task);
            };
        });

        // ==================== 3. 外部标签交互 ====================
        this.container.querySelectorAll('.gantt-bar-label-external').forEach(label => {
            const taskId = label.dataset.taskId;
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            const toggle = label.querySelector('.collapse-toggle');
            if (toggle) {
                toggle.onclick = (e) => { e.stopPropagation(); this.toggleTaskCollapse(taskId); };
            }

            label.onclick = (e) => {
                if (e.target.classList.contains('collapse-toggle')) return;
                e.stopPropagation();
                this.selectTask(taskId);
                this.showInlineTaskForm(task);
            };
            
            label.ondblclick = (e) => {
                e.stopPropagation();
                const nameEl = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
                if (nameEl) this.editTaskName(nameEl);
            };
        });

        // ==================== 4. 全局点击 (取消选择) ====================
        const timelineWrapper = this.container.querySelector('.gantt-timeline-wrapper');
        if (timelineWrapper) {
            const handleBackgroundClick = (e) => {
                const isInteractive = e.target.closest('.gantt-bar') || 
                                      e.target.closest('.gantt-milestone') ||
                                      e.target.closest('.gantt-bar-label-external') || 
                                      e.target.closest('.gantt-bar-label-start') ||
                                      e.target.closest('.inline-task-form') ||
                                      e.target.closest('.dependency-selector-modal');

                if (!isInteractive && !this.isDragging) {
                    this.deselect();
                }
            };
            
            timelineWrapper.onclick = handleBackgroundClick;
        }

        // ==================== 5. 全局事件监听 (Move / Up) ====================
        if (!this._globalEventsBound) {
            // Mouse Events
            document.addEventListener('mousemove', (e) => this.onMouseMove(e));
            document.addEventListener('mouseup', (e) => this.onMouseUp(e));
            
            // Touch Events (Mapped to Mouse Handlers)
            document.addEventListener('touchmove', (e) => {
                if (!this.dragState) return;
                const touch = e.touches[0];
                const mockEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => { if(e.cancelable) e.preventDefault(); }
                };
                this.onMouseMove(mockEvent);
            }, { passive: false });

            document.addEventListener('touchend', (e) => {
                if (!this.dragState) return;
                this.onMouseUp(e);
            }, { passive: false });

            this._globalEventsBound = true;
        }
    };

    /**
     * 统一输入处理入口 (Mouse & Touch)
     */
    GanttChart.prototype.handleInputStart = function(e, task, bar) {
        // 忽略里程碑和汇总任务的拖拽
        if (task.isMilestone || task.isSummary) return;

        // 1. 调整大小
        if (e.target.classList.contains('gantt-bar-handle')) {
            if (this.options.enableResize) {
                this.startResize(e, task, bar, e.target.classList.contains('right'));
                e.stopPropagation();
                if(e.type !== 'touchstart') e.preventDefault();
            }
            return;
        }

        // 2. 移动任务
        if (this.options.enableEdit) {
            // 初始化状态，等待阈值 (3px)
            this.dragState = { 
                type: 'awaiting_threshold',
                task, bar, 
                startX: e.clientX, 
                originalStart: task.start, 
                originalEnd: task.end 
            };
            e.stopPropagation();
        }
    };

    console.log('✅ gantt-events-binding.js loaded (Epsilon32 - Touch Enabled)');
})();