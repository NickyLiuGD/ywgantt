// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图快捷菜单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-quickmenu.js                      ▓▓
// ▓▓ 版本: Delta6                                                   ▓▓
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
     * @param {HTMLElement} element - 目标元素
     * @param {string} position - 菜单位置 ('left' 或 'right')
     */
    GanttChart.prototype.addQuickMenuToElement = function(element, position) {
        const taskId = element.dataset.taskId;
        
        // 鼠标进入：延迟显示菜单
        element.addEventListener('mouseenter', (e) => {
            clearTimeout(quickMenuTimer);
            quickMenuTimer = setTimeout(() => {
                this.showQuickMenu(element, taskId, position);
            }, 300); // 300ms 延迟，避免误触发
        });

        // 鼠标离开：延迟隐藏菜单
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
     * @param {HTMLElement} targetElement - 目标元素
     * @param {string} taskId - 任务ID
     * @param {string} position - 菜单位置
     */
    GanttChart.prototype.showQuickMenu = function(targetElement, taskId, position) {
        // 移除旧菜单
        this.hideQuickMenu();

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // 创建菜单
        const menu = document.createElement('div');
        menu.className = 'quick-menu';
        menu.dataset.taskId = taskId;
        
        menu.innerHTML = `
            <button class="quick-menu-btn quick-menu-add" title="在此任务后添加" data-action="add">
                <span class="quick-menu-icon">➕</span>
            </button>
            <button class="quick-menu-btn quick-menu-edit" title="编辑任务" data-action="edit">
                <span class="quick-menu-icon">✏️</span>
            </button>
            <button class="quick-menu-btn quick-menu-delete" title="删除任务" data-action="delete">
                <span class="quick-menu-icon">🗑️</span>
            </button>
        `;

        // 定位菜单
        document.body.appendChild(menu);
        this.positionQuickMenu(menu, targetElement, position);
        
        currentQuickMenu = menu;

        // 绑定菜单按钮事件
        menu.querySelectorAll('.quick-menu-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleQuickMenuAction(action, taskId);
                this.hideQuickMenu();
            };
        });

        // 鼠标离开菜单时隐藏
        menu.addEventListener('mouseleave', () => {
            quickMenuTimer = setTimeout(() => {
                if (!targetElement.matches(':hover')) {
                    this.hideQuickMenu();
                }
            }, 200);
        });

        // 鼠标进入菜单时取消隐藏
        menu.addEventListener('mouseenter', () => {
            clearTimeout(quickMenuTimer);
        });

        // 添加淡入动画
        requestAnimationFrame(() => {
            menu.classList.add('show');
        });
    };

    /**
     * 定位快捷菜单
     * @param {HTMLElement} menu - 菜单元素
     * @param {HTMLElement} target - 目标元素
     * @param {string} position - 位置 ('left' 或 'right')
     */
    GanttChart.prototype.positionQuickMenu = function(menu, target, position) {
        const rect = target.getBoundingClientRect();
        const menuWidth = 140; // 菜单宽度
        const menuHeight = 44; // 菜单高度
        
        let left, top;
        
        if (position === 'left') {
            // 左侧任务名称：菜单显示在右侧
            left = rect.right + 8;
            top = rect.top + (rect.height - menuHeight) / 2;
        } else {
            // 右侧标签：菜单显示在右侧
            left = rect.right + 8;
            top = rect.top + (rect.height - menuHeight) / 2;
        }
        
        // 防止菜单超出视口
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (left + menuWidth > viewportWidth) {
            left = rect.left - menuWidth - 8; // 显示在左侧
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
     * @param {string} action - 操作类型 ('add'/'edit'/'delete')
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.handleQuickMenuAction = function(action, taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        switch (action) {
            case 'add':
                // 在当前任务后添加新任务
                const newTask = {
                    id: generateId(),
                    name: '新任务',
                    start: formatDate(addDays(new Date(task.end), 1)),
                    end: formatDate(addDays(new Date(task.end), 4)),
                    progress: 0,
                    dependencies: [taskId] // 自动依赖当前任务
                };
                this.addTask(newTask);
                this.selectTask(newTask.id);
                addLog(`✅ 已在"${task.name}"后添加新任务`);
                break;

            case 'edit':
                // 编辑任务
                this.selectTask(taskId);
                this.showInlineTaskForm(task);
                addLog(`✏️ 编辑任务 "${task.name}"`);
                break;

            case 'delete':
                // 删除任务
                if (confirm(`确定删除任务 "${task.name}"?`)) {
                    this.deleteTask(taskId);
                    addLog(`✅ 已删除任务 "${task.name}"`);
                }
                break;
        }
    };

    console.log('✅ gantt-events-quickmenu.js loaded successfully');

})();
