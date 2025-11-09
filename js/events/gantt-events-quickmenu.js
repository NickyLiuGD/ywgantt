// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图快捷菜单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-quickmenu.js                      ▓▓
// ▓▓ 版本: Epsilon5 - 兼容层级任务                                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    let quickMenuTimer = null;
    let currentQuickMenu = null;

    /**
     * 为任务名称和标签添加快捷菜单
     */
    GanttChart.prototype.attachQuickMenus = function() {
        // 为左侧任务名称添加快捷菜单
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            this.addQuickMenuToElement(el, 'left');
        });

        // 为右侧任务标签添加快捷菜单
        this.container.querySelectorAll('.gantt-bar-label-external').forEach(el => {
            this.addQuickMenuToElement(el, 'right');
        });
    };

    /**
     * 为元素添加快捷菜单
     */
    GanttChart.prototype.addQuickMenuToElement = function(element, position) {
        const taskId = element.dataset.taskId;
        
        element.addEventListener('mouseenter', (e) => {
            clearTimeout(quickMenuTimer);
            quickMenuTimer = setTimeout(() => {
                this.showQuickMenu(element, taskId, position);
            }, 300);
        });

        element.addEventListener('mouseleave', (e) => {
            clearTimeout(quickMenuTimer);
            quickMenuTimer = setTimeout(() => {
                if (currentQuickMenu && !currentQuickMenu.matches(':hover')) {
                    this.hideQuickMenu();
                }
            }, 200);
        });
    };

    /**
     * 显示快捷菜单
     */
    GanttChart.prototype.showQuickMenu = function(targetElement, taskId, position) {
        this.hideQuickMenu();

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const menu = document.createElement('div');
        menu.className = 'quick-menu';
        menu.dataset.taskId = taskId;
        
        menu.innerHTML = `
            <button class="quick-menu-btn quick-menu-add" title="在下方添加新任务" data-action="add">
                <span class="quick-menu-icon">➕</span>
            </button>
            <button class="quick-menu-btn quick-menu-edit" title="编辑此任务" data-action="edit">
                <span class="quick-menu-icon">✏️</span>
            </button>
            <button class="quick-menu-btn quick-menu-delete" title="删除此任务" data-action="delete">
                <span class="quick-menu-icon">🗑️</span>
            </button>
        `;

        document.body.appendChild(menu);
        this.positionQuickMenu(menu, targetElement, position);
        
        currentQuickMenu = menu;

        menu.querySelectorAll('.quick-menu-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleQuickMenuAction(action, taskId);
                this.hideQuickMenu();
            };
        });

        menu.addEventListener('mouseleave', () => {
            quickMenuTimer = setTimeout(() => {
                if (!targetElement.matches(':hover')) {
                    this.hideQuickMenu();
                }
            }, 200);
        });

        menu.addEventListener('mouseenter', () => {
            clearTimeout(quickMenuTimer);
        });

        requestAnimationFrame(() => {
            menu.classList.add('show');
        });
    };

    /**
     * 定位快捷菜单
     */
    GanttChart.prototype.positionQuickMenu = function(menu, target, position) {
        const rect = target.getBoundingClientRect();
        const menuWidth = 140;
        const menuHeight = 44;
        
        let left, top;
        
        if (position === 'left') {
            left = rect.right + 8;
            top = rect.top + (rect.height - menuHeight) / 2;
        } else {
            left = rect.right + 8;
            top = rect.top + (rect.height - menuHeight) / 2;
        }
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (left + menuWidth > viewportWidth) {
            left = rect.left - menuWidth - 8;
        }
        
        if (top + menuHeight > viewportHeight) {
            top = viewportHeight - menuHeight - 10;
        }
        
        if (top < 10) {
            top = 10;
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    };

    /**
     * 隐藏快捷菜单
     */
    GanttChart.prototype.hideQuickMenu = function() {
        if (currentQuickMenu) {
            currentQuickMenu.classList.remove('show');
            setTimeout(() => {
                if (currentQuickMenu && currentQuickMenu.parentElement) {
                    currentQuickMenu.parentElement.removeChild(currentQuickMenu);
                }
                currentQuickMenu = null;
            }, 200);
        }
    };

    /**
     * 处理快捷菜单操作
     */
    GanttChart.prototype.handleQuickMenuAction = function(action, taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        switch (action) {
            case 'add':
                // 在当前任务下方添加新任务（同级）
                const currentIndex = this.tasks.findIndex(t => t.id === taskId);
                
                const newTask = {
                    id: generateId(),
                    uid: this.getNextUID(),
                    name: '新任务',
                    start: formatDate(addDays(new Date(task.end), 1)),
                    end: formatDate(addDays(new Date(task.end), 4)),
                    duration: 4,
                    progress: 0,
                    isMilestone: false,
                    isSummary: false,
                    parentId: task.parentId,  // ⭐ 继承父任务
                    children: [],
                    outlineLevel: task.outlineLevel || 1,  // ⭐ 继承层级
                    wbs: '',
                    priority: 'medium',
                    notes: '',
                    isCollapsed: false,
                    dependencies: [{taskId: taskId, type: 'FS', lag: 0}]
                };
                
                this.tasks.splice(currentIndex + 1, 0, newTask);
                
                // ⭐ 如果有父任务，添加到父任务的子任务列表
                if (task.parentId) {
                    const parent = this.tasks.find(t => t.id === task.parentId);
                    if (parent) {
                        if (!parent.children) parent.children = [];
                        parent.children.push(newTask.id);
                    }
                }
                
                newTask.wbs = this.generateWBS(newTask.id);
                this.calculateDateRange();
                this.render();
                
                setTimeout(() => {
                    this.selectTask(newTask.id);
                    this.showInlineTaskForm(newTask);
                    addLog(`✅ 已在"${task.name}"下方添加新任务并打开编辑界面`);
                }, 100);
                break;

            case 'edit':
                this.selectTask(taskId);
                this.showInlineTaskForm(task);
                addLog(`✏️ 编辑任务 "${task.name}"`);
                break;

            case 'delete':
                const childrenCount = task.children ? task.children.length : 0;
                const warningMsg = childrenCount > 0 ? 
                    `\n\n⚠️ 此任务包含 ${childrenCount} 个子任务，将一并删除！` : 
                    '\n\n注意：其他依赖此任务的任务将失去该依赖关系。';
                
                if (confirm(`确定删除任务 "${task.name}"?${warningMsg}`)) {
                    this.deleteTaskWithChildren(taskId);
                    addLog(`✅ 已删除任务 "${task.name}"`);
                }
                break;
        }
    };

    /**
     * 在指定位置插入任务
     */
    GanttChart.prototype.insertTaskAt = function(task, index) {
        if (!task || typeof task !== 'object') {
            console.error('Invalid task object');
            return;
        }

        // ⭐ 确保所有必需字段
        if (!task.id) task.id = generateId();
        if (!task.uid) task.uid = this.getNextUID();
        if (!task.name) task.name = '新任务';
        if (!task.start) task.start = formatDate(new Date());
        if (!task.end) task.end = formatDate(addDays(new Date(), 3));
        if (typeof task.duration !== 'number') task.duration = 4;
        if (typeof task.progress !== 'number') task.progress = 0;
        if (!Array.isArray(task.dependencies)) task.dependencies = [];
        if (typeof task.isMilestone !== 'boolean') task.isMilestone = false;
        if (typeof task.isSummary !== 'boolean') task.isSummary = false;
        if (task.parentId === undefined) task.parentId = null;
        if (!Array.isArray(task.children)) task.children = [];
        if (!task.outlineLevel) task.outlineLevel = 1;
        if (!task.priority) task.priority = 'medium';
        if (task.notes === undefined) task.notes = '';
        if (typeof task.isCollapsed !== 'boolean') task.isCollapsed = false;

        const insertIndex = Math.max(0, Math.min(index, this.tasks.length));
        this.tasks.splice(insertIndex, 0, task);
        
        task.wbs = this.generateWBS(task.id);
        this.calculateDateRange();
        this.render();
        
        return task;
    };

    console.log('✅ gantt-events-quickmenu.js loaded successfully (Epsilon5)');

})();
