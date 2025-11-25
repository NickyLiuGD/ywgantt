// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图快捷菜单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-quickmenu.js                      ▓▓
// ▓▓ 版本: Epsilon6 - 增加复制/上移/下移功能                        ▓▓
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
        
        // ⭐ 扩充菜单按钮：添加、复制、上移、下移、编辑、删除
        menu.innerHTML = `
            <button class="quick-menu-btn quick-menu-add" title="在下方添加新任务" data-action="add">
                <span class="quick-menu-icon">➕</span>
            </button>
            <button class="quick-menu-btn quick-menu-copy" title="复制任务" data-action="copy">
                <span class="quick-menu-icon">📄</span>
            </button>
            <div style="width:1px;height:20px;background:#eee;margin:0 2px;"></div>
            <button class="quick-menu-btn quick-menu-move" title="上移" data-action="up">
                <span class="quick-menu-icon">⬆️</span>
            </button>
            <button class="quick-menu-btn quick-menu-move" title="下移" data-action="down">
                <span class="quick-menu-icon">⬇️</span>
            </button>
            <div style="width:1px;height:20px;background:#eee;margin:0 2px;"></div>
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
     * 定位快捷菜单 (增加宽度适应)
     */
    GanttChart.prototype.positionQuickMenu = function(menu, target, position) {
        const rect = target.getBoundingClientRect();
        const menuWidth = 260; // ⭐ 增加宽度以容纳更多按钮
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
     * ⭐ 实现任务复制（包含子任务深拷贝）
     */
    GanttChart.prototype.duplicateTask = function(task) {
        // 1. 深度克隆任务数据
        const cloneTaskData = (originalTask, newParentId = null) => {
            const newTask = JSON.parse(JSON.stringify(originalTask));
            newTask.id = generateId();
            newTask.uid = this.getNextUID();
            newTask.name = `${originalTask.name} (副本)`;
            newTask.parentId = newParentId;
            newTask.children = []; // 先清空，稍后填充
            newTask.wbs = ''; // 稍后生成
            
            // 移除不必要的临时状态
            delete newTask.isCollapsed;
            
            return newTask;
        };

        const newRootTask = cloneTaskData(task, task.parentId);
        
        // 插入到当前任务下方
        const currentIndex = this.tasks.findIndex(t => t.id === task.id);
        this.tasks.splice(currentIndex + 1, 0, newRootTask);

        // 更新父任务的 children
        if (task.parentId) {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (parent) {
                const siblingIndex = parent.children.indexOf(task.id);
                parent.children.splice(siblingIndex + 1, 0, newRootTask.id);
            }
        }

        // 2. 递归复制子任务（如果原任务是汇总任务）
        if (task.children && task.children.length > 0) {
            // 收集所有后代任务，保持顺序
            const descendants = this.getAllDescendantsInOrder(task.id);
            
            let insertPos = currentIndex + 2; // 根副本之后
            const oldIdToNewId = { [task.id]: newRootTask.id };

            descendants.forEach(oldChild => {
                const newParentId = oldIdToNewId[oldChild.parentId];
                const newChild = cloneTaskData(oldChild, newParentId);
                newChild.name = oldChild.name; // 子任务不加"(副本)"后缀，保持整洁
                
                oldIdToNewId[oldChild.id] = newChild.id;
                
                // 链接到新父级
                const newParent = this.tasks.find(t => t.id === newParentId);
                if (newParent) {
                    newParent.children.push(newChild.id);
                }

                this.tasks.splice(insertPos, 0, newChild);
                insertPos++;
            });
        }

        // 3. 刷新
        this.tasks.forEach(t => t.wbs = this.generateWBS(t.id)); // 重算所有WBS
        this.sortTasksByWBS(); // 确保顺序
        this.calculateDateRange();
        this.render();
        
        addLog(`✅ 已复制任务 "${task.name}"`);
    };

    /**
     * ⭐ 辅助：获取所有后代任务（按列表顺序）
     */
    GanttChart.prototype.getAllDescendantsInOrder = function(taskId) {
        const result = [];
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.children) return result;

        // 简单按当前数组顺序查找，这比递归更能保持视觉顺序
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
     * ⭐ 实现任务上移/下移
     */
    GanttChart.prototype.moveTask = function(task, direction) {
        // 1. 确定操作的容器（根列表 或 父任务的children）
        let siblings = [];
        if (task.parentId) {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (parent) siblings = parent.children;
        } else {
            // 根任务：我们需要从 this.tasks 中提取出所有根任务的 ID
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

        // 4. 如果是根任务，我们需要重新排列 this.tasks
        // 策略：利用 generateWBS 和 sortTasksByWBS 的机制
        // sortTasksByWBS 依赖 wbs 字符串排序。
        // generateWBS 依赖 siblings 的顺序 (parent.children) 或 根任务在 this.tasks 的顺序。
        
        // 如果是根任务移动，我们必须物理调整 this.tasks 中根任务块的顺序
        if (!task.parentId) {
            // 这是一个复杂操作，简单起见，我们给根任务赋予一个临时的 sortIndex，然后重排
            const rootOrderMap = {};
            siblings.forEach((id, index) => rootOrderMap[id] = index);
            
            // 临时覆盖 generateWBS 逻辑或手动重排
            // 最稳健的方法：重构整个 tasks 数组
            const newTasksArray = [];
            
            // 递归函数：按新顺序推入任务
            const pushTaskAndChildren = (taskId) => {
                const t = this.tasks.find(x => x.id === taskId);
                if(t) {
                    newTasksArray.push(t);
                    // 递归子任务（子任务顺序已经在 siblings 交换步骤中处理了，如果它是当前操作对象的父级）
                    // 这里我们只处理根顺序，子任务顺序由 parent.children 决定
                    if (t.children) {
                        // 如果当前移动的是子任务，parent.children 已经变了，这里遍历就是新顺序
                        t.children.forEach(childId => pushTaskAndChildren(childId));
                    }
                }
            };

            siblings.forEach(rootId => pushTaskAndChildren(rootId));
            this.tasks = newTasksArray;
        } else {
            // 如果是子任务移动，parent.children 已经变了。
            // 只需要重新生成 WBS，WBS 会根据 children 顺序生成 1.1, 1.2...
            // 然后 sortTasksByWBS 会根据 WBS 重新排列 tasks 数组
        }

        // 5. 全局刷新
        this.tasks.forEach(t => t.wbs = this.generateWBS(t.id));
        this.sortTasksByWBS();
        this.render();
        
        addLog(`✅ 任务 "${task.name}" 已${direction === -1 ? '上移' : '下移'}`);
    };

    /**
     * 辅助：在指定位置插入新任务
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
            outlineLevel: 1, // 稍后计算
            priority: 'medium',
            notes: ''
        };
        
        // 计算结束日期
        const startDate = new Date(newTask.start);
        const endDate = calculateEndDate(startDate, newTask.duration, newTask.durationType);
        newTask.end = formatDate(endDate);

        if (parentId) {
            const parent = this.tasks.find(t => t.id === parentId);
            if (parent) {
                parent.children.push(newTask.id);
                parent.isSummary = true;
                newTask.outlineLevel = (parent.outlineLevel || 1) + 1;
                // 插入位置需要调整到父任务块的末尾，或者简单push然后排序
                this.tasks.push(newTask);
            }
        } else {
            // 根任务插入
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

    console.log('✅ gantt-events-quickmenu.js loaded successfully (Epsilon6 - 增强版)');

})();