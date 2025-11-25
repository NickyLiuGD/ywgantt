// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图快捷菜单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-quickmenu.js                      ▓▓
// ▓▓ 版本: Epsilon10 - 完整版 (表头新图标 + 隐藏已完成 + 任务操作)    ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    let quickMenuTimer = null;
    let currentQuickMenu = null;

    /**
     * 初始化所有快捷菜单监听
     * 包含：左侧任务名、右侧任务条标签、顶部表头
     */
    GanttChart.prototype.attachQuickMenus = function() {
        // 1. 为左侧任务名称添加快捷菜单
        this.container.querySelectorAll('.gantt-task-name').forEach(el => {
            this.addQuickMenuToElement(el, 'left');
        });

        // 2. 为右侧任务标签添加快捷菜单
        this.container.querySelectorAll('.gantt-bar-label-external').forEach(el => {
            this.addQuickMenuToElement(el, 'right');
        });

        // 3. 为表头添加快捷菜单 (全部展开/折叠/隐藏完成)
        const header = this.container.querySelector('.gantt-sidebar-header');
        if (header) {
            this.addHeaderMenuToElement(header);
        }
    };

    /**
     * 辅助：为普通任务元素绑定悬停事件
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
     * 辅助：为表头元素绑定悬停事件
     */
    GanttChart.prototype.addHeaderMenuToElement = function(header) {
        header.addEventListener('mouseenter', (e) => {
            clearTimeout(quickMenuTimer);
            quickMenuTimer = setTimeout(() => {
                this.showHeaderQuickMenu(header);
            }, 300);
        });

        header.addEventListener('mouseleave', (e) => {
            clearTimeout(quickMenuTimer);
            quickMenuTimer = setTimeout(() => {
                if (currentQuickMenu && !currentQuickMenu.matches(':hover')) {
                    this.hideQuickMenu();
                }
            }, 200);
        });
    };

    /**
     * 显示【表头】快捷菜单
     * 功能：全部展开、全部折叠、显示/隐藏已完成
     */
    GanttChart.prototype.showHeaderQuickMenu = function(targetElement) {
        this.hideQuickMenu();

        const menu = document.createElement('div');
        menu.className = 'quick-menu';
        menu.dataset.type = 'header-menu';
        
        // 判断当前"隐藏已完成"的状态
        const isHiding = this.options.hideCompleted;
        // 图标逻辑：隐藏时显示眼睛，显示时显示禁止符
        const toggleIcon = isHiding ? '👁️' : '🚫'; 
        const toggleText = isHiding ? '显示完成' : '隐藏完成';
        const toggleClass = isHiding ? 'active' : '';

        // 构建菜单 HTML (使用 btn-text 实现悬停冒泡效果)
        menu.innerHTML = `
            <button class="quick-menu-btn quick-menu-expand" title="全部展开" data-action="expandAll">
                <span class="quick-menu-icon">📂</span>
                <span class="btn-text" style="color:#10b981;">全部展开</span>
            </button>
            <div style="width:1px;height:20px;background:#eee;margin:0 2px;"></div>
            <button class="quick-menu-btn quick-menu-collapse" title="全部折叠" data-action="collapseAll">
                <span class="quick-menu-icon">📁</span>
                <span class="btn-text" style="color:#f59e0b;">全部折叠</span>
            </button>
            <div style="width:1px;height:20px;background:#eee;margin:0 2px;"></div>
            <button class="quick-menu-btn quick-menu-hide-completed ${toggleClass}" title="${toggleText}" data-action="toggleCompleted">
                <span class="quick-menu-icon">${toggleIcon}</span>
                <span class="btn-text" style="color:#6c757d;">${toggleText}</span>
            </button>
        `;

        document.body.appendChild(menu);
        
        // 定位：表头右下角
        const rect = targetElement.getBoundingClientRect();
        // 调整 left 以确保菜单贴合表头右侧，不遮挡文字
        menu.style.left = (rect.right - 150) + 'px'; 
        menu.style.top = (rect.bottom - 5) + 'px'; 
        
        currentQuickMenu = menu;

        // 绑定按钮点击
        menu.querySelectorAll('.quick-menu-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                
                if (action === 'expandAll') {
                    if (typeof this.expandAllTasks === 'function') this.expandAllTasks();
                } else if (action === 'collapseAll') {
                    if (typeof this.collapseAllTasks === 'function') this.collapseAllTasks();
                } else if (action === 'toggleCompleted') {
                    // 切换选项并重绘
                    this.options.hideCompleted = !this.options.hideCompleted;
                    this.render();
                    if (typeof addLog === 'function') {
                        addLog(this.options.hideCompleted ? '🚫 已隐藏完成任务' : '👁️ 已显示完成任务');
                    }
                }
                
                this.hideQuickMenu();
            };
        });

        // 绑定菜单离开
        menu.addEventListener('mouseleave', () => {
            quickMenuTimer = setTimeout(() => {
                if (!targetElement.matches(':hover')) {
                    this.hideQuickMenu();
                }
            }, 200);
        });

        menu.addEventListener('mouseenter', () => clearTimeout(quickMenuTimer));

        requestAnimationFrame(() => menu.classList.add('show'));
    };

    /**
     * 显示【任务】快捷菜单
     * 功能：增、删、改、复制、移动
     */
    GanttChart.prototype.showQuickMenu = function(targetElement, taskId, position) {
        this.hideQuickMenu();

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const menu = document.createElement('div');
        menu.className = 'quick-menu';
        menu.dataset.taskId = taskId;
        
        // 更新结构：使用 btn-text 实现悬停文字冒泡
        menu.innerHTML = `
            <button class="quick-menu-btn quick-menu-add" data-action="add">
                <span class="quick-menu-icon">➕</span><span class="btn-text" style="color:#10b981;">添加</span>
            </button>
            <button class="quick-menu-btn quick-menu-copy" data-action="copy">
                <span class="quick-menu-icon">📄</span><span class="btn-text" style="color:#8b5cf6;">复制</span>
            </button>
            <div style="width:1px;height:20px;background:#eee;margin:0 2px;"></div>
            <button class="quick-menu-btn quick-menu-move" data-action="up">
                <span class="quick-menu-icon">⬆️</span><span class="btn-text">上移</span>
            </button>
            <button class="quick-menu-btn quick-menu-move" data-action="down">
                <span class="quick-menu-icon">⬇️</span><span class="btn-text">下移</span>
            </button>
            <div style="width:1px;height:20px;background:#eee;margin:0 2px;"></div>
            <button class="quick-menu-btn quick-menu-edit" data-action="edit">
                <span class="quick-menu-icon">✏️</span><span class="btn-text" style="color:#3b82f6;">编辑</span>
            </button>
            <button class="quick-menu-btn quick-menu-delete" data-action="delete">
                <span class="quick-menu-icon">🗑️</span><span class="btn-text" style="color:#dc3545;">删除</span>
            </button>
        `;

        document.body.appendChild(menu);
        this.positionQuickMenu(menu, targetElement, position);
        
        currentQuickMenu = menu;

        // 绑定按钮点击
        menu.querySelectorAll('.quick-menu-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleQuickMenuAction(action, taskId);
                this.hideQuickMenu();
            };
        });

        // 绑定菜单离开
        menu.addEventListener('mouseleave', () => {
            quickMenuTimer = setTimeout(() => {
                if (!targetElement.matches(':hover')) {
                    this.hideQuickMenu();
                }
            }, 200);
        });

        menu.addEventListener('mouseenter', () => clearTimeout(quickMenuTimer));

        requestAnimationFrame(() => menu.classList.add('show'));
    };

    /**
     * 计算菜单位置 (确保不溢出屏幕)
     */
    GanttChart.prototype.positionQuickMenu = function(menu, target, position) {
        const rect = target.getBoundingClientRect();
        // 估算菜单宽度，根据按钮数量预留空间
        const menuWidth = 280; 
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
        
        // 边界检测
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
     * 隐藏菜单
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
     * 处理任务菜单的操作指令
     */
    GanttChart.prototype.handleQuickMenuAction = function(action, taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const taskIndex = this.tasks.findIndex(t => t.id === taskId);

        switch (action) {
            case 'add':
                this.insertTaskAt(null, taskIndex + 1, task.parentId);
                addLog(`✅ 已在"${task.name}"下方添加新任务`);
                break;

            case 'copy':
                this.duplicateTask(task);
                break;

            case 'up':
                this.moveTask(task, -1);
                break;

            case 'down':
                this.moveTask(task, 1);
                break;

            case 'edit':
                this.selectTask(taskId);
                this.showInlineTaskForm(task);
                addLog(`✏️ 编辑任务 "${task.name}"`);
                break;

            case 'delete':
                if (task.children && task.children.length > 0) {
                    alert(`❌ 无法删除任务 "${task.name}"\n\n此任务包含 ${task.children.length} 个子任务，请先删除子任务。`);
                    return;
                }
                if (confirm(`确定删除任务 "${task.name}"？`)) {
                    this.deleteTaskWithChildren(task.id);
                }
                break;
        }
    };

    /**
     * 实现任务复制（包含子任务递归深拷贝）
     */
    GanttChart.prototype.duplicateTask = function(task) {
        // 1. 深度克隆数据并重置ID的辅助函数
        const cloneTaskData = (originalTask, newParentId = null) => {
            const newTask = JSON.parse(JSON.stringify(originalTask));
            newTask.id = generateId();
            newTask.uid = this.getNextUID();
            newTask.name = `${originalTask.name} (副本)`;
            newTask.parentId = newParentId;
            newTask.children = []; // 清空子集，稍后填充
            newTask.wbs = '';      // 清空WBS，稍后重算
            
            delete newTask.isCollapsed; // 重置折叠状态
            
            return newTask;
        };

        // 复制根任务
        const newRootTask = cloneTaskData(task, task.parentId);
        
        // 插入到当前任务下方
        const currentIndex = this.tasks.findIndex(t => t.id === task.id);
        this.tasks.splice(currentIndex + 1, 0, newRootTask);

        // 如果有父级，更新父级的 children 数组
        if (task.parentId) {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (parent) {
                const siblingIndex = parent.children.indexOf(task.id);
                parent.children.splice(siblingIndex + 1, 0, newRootTask.id);
            }
        }

        // 2. 递归复制子任务
        if (task.children && task.children.length > 0) {
            // 获取所有后代，保持视觉顺序
            const descendants = this.getAllDescendantsInOrder(task.id);
            
            let insertPos = currentIndex + 2; // 从副本的下一位开始插入
            const oldIdToNewId = { [task.id]: newRootTask.id };

            descendants.forEach(oldChild => {
                const newParentId = oldIdToNewId[oldChild.parentId];
                const newChild = cloneTaskData(oldChild, newParentId);
                newChild.name = oldChild.name; // 子任务保持原名，不加副本后缀
                
                oldIdToNewId[oldChild.id] = newChild.id;
                
                // 将新子任务ID加入新父级的children
                const newParent = this.tasks.find(t => t.id === newParentId);
                if (newParent) {
                    newParent.children.push(newChild.id);
                }

                this.tasks.splice(insertPos, 0, newChild);
                insertPos++;
            });
        }

        // 3. 刷新显示
        this.tasks.forEach(t => t.wbs = this.generateWBS(t.id)); // 重算WBS
        this.sortTasksByWBS(); // 排序
        this.calculateDateRange();
        this.render();
        
        addLog(`✅ 已复制任务 "${task.name}"`);
    };

    /**
     * 获取指定任务的所有后代（按列表顺序）
     */
    GanttChart.prototype.getAllDescendantsInOrder = function(taskId) {
        const result = [];
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.children) return result;

        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        for (let i = taskIndex + 1; i < this.tasks.length; i++) {
            const t = this.tasks[i];
            if (this.isDescendantOf(t.id, taskId)) {
                result.push(t);
            }
        }
        return result;
    };

    /**
     * 实现任务上移/下移
     */
    GanttChart.prototype.moveTask = function(task, direction) {
        // 1. 确定兄弟节点列表
        let siblings = [];
        if (task.parentId) {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (parent) siblings = parent.children;
        } else {
            // 根任务：提取所有根任务ID
            siblings = this.tasks.filter(t => !t.parentId).map(t => t.id);
        }

        const currentIndex = siblings.indexOf(task.id);
        if (currentIndex === -1) return;

        const newIndex = currentIndex + direction;

        // 2. 边界检查
        if (newIndex < 0 || newIndex >= siblings.length) {
            addLog(`⚠️ 已经是${direction === -1 ? '第' : '最后一'}个了`);
            return;
        }

        // 3. 交换位置
        const temp = siblings[currentIndex];
        siblings[currentIndex] = siblings[newIndex];
        siblings[newIndex] = temp;

        // 4. 如果是根任务，需要重构主 tasks 数组以反映顺序变化
        if (!task.parentId) {
            const newTasksArray = [];
            
            // 递归推入函数
            const pushTaskAndChildren = (taskId) => {
                const t = this.tasks.find(x => x.id === taskId);
                if (t) {
                    newTasksArray.push(t);
                    if (t.children) {
                        // 子任务顺序在此时未变，递归加入
                        t.children.forEach(childId => pushTaskAndChildren(childId));
                    }
                }
            };

            // 按新的 siblings 顺序重组
            siblings.forEach(rootId => pushTaskAndChildren(rootId));
            this.tasks = newTasksArray;
        }

        // 5. 刷新
        this.tasks.forEach(t => t.wbs = this.generateWBS(t.id));
        this.sortTasksByWBS(); // 根据 WBS 重新排序
        this.render();
        
        addLog(`✅ 任务 "${task.name}" 已${direction === -1 ? '上移' : '下移'}`);
    };

    /**
     * 在指定位置插入新任务
     */
    GanttChart.prototype.insertTaskAt = function(unused, index, parentId) {
        const newTask = {
            id: generateId(),
            uid: this.getNextUID(),
            name: '新任务',
            start: formatDate(new Date()),
            duration: 1,
            durationType: 'days',
            progress: 0,
            dependencies: [],
            isMilestone: false,
            isSummary: false,
            parentId: parentId || null,
            children: [],
            outlineLevel: 1,
            priority: 'medium',
            notes: ''
        };
        
        const startDate = new Date(newTask.start);
        const endDate = calculateEndDate(startDate, newTask.duration, newTask.durationType);
        newTask.end = formatDate(endDate);

        if (parentId) {
            const parent = this.tasks.find(t => t.id === parentId);
            if (parent) {
                parent.children.push(newTask.id);
                parent.isSummary = true;
                newTask.outlineLevel = (parent.outlineLevel || 1) + 1;
                this.tasks.push(newTask); // 先推入，稍后 sortTasksByWBS 会归位
            }
        } else {
            this.tasks.splice(index, 0, newTask);
        }

        this.tasks.forEach(t => t.wbs = this.generateWBS(t.id));
        this.sortTasksByWBS();
        this.calculateDateRange();
        this.render();
        
        setTimeout(() => {
            this.selectTask(newTask.id);
            this.showInlineTaskForm(newTask);
        }, 100);
    };

    console.log('✅ gantt-events-quickmenu.js loaded successfully (Epsilon10 - 完整无省略版)');

})();