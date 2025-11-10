// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图任务操作模块                                              ▓▓
// ▓▓ 路径: js/gantt/gantt-operations.js                             ▓▓
// ▓▓ 版本: Epsilon16 - 精简版（移除依赖相关，专注任务CRUD）         ▓▓
// ▓▓ 职责: 任务增删改查、层级管理、汇总任务计算                     ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    // ==================== 任务选择与显示 ====================

    /**
     * 选中任务
     */
    GanttChart.prototype.selectTask = function(taskId) {
        if (!taskId || this.selectedTask === taskId) return;

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`Task not found: ${taskId}`);
            return;
        }

        // 清除所有高亮和旧表单
        this.container.querySelectorAll('.gantt-bar, .gantt-milestone, .gantt-task-name, .gantt-bar-label-external, .gantt-bar-label-start').forEach(el => {
            el.classList.remove('selected', 'dep-highlight');
        });
        this.container.querySelectorAll('.gantt-dependencies path').forEach(path => {
            path.classList.remove('dep-highlight-arrow');
        });
        const oldForm = this.container.querySelector('.inline-task-form');
        if (oldForm) oldForm.remove();

        this.selectedTask = taskId;

        // 高亮选中任务
        const selectedBar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`) ||
                           this.container.querySelector(`.gantt-milestone[data-task-id="${taskId}"]`);
        if (selectedBar) selectedBar.classList.add('selected');

        const selectedLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
        if (selectedLabel) selectedLabel.classList.add('selected');

        const selectedStartLabel = this.container.querySelector(`.gantt-bar-label-start[data-task-id="${taskId}"]`);
        if (selectedStartLabel) selectedStartLabel.classList.add('selected');

        const selectedName = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
        if (selectedName) selectedName.classList.add('selected');

        // 获取并高亮所有依赖任务（使用 gantt-dependencies.js 中的函数）
        const deps = this.getAllDependencies(taskId);
        deps.forEach(depId => {
            const bar = this.container.querySelector(`.gantt-bar[data-task-id="${depId}"]`) ||
                       this.container.querySelector(`.gantt-milestone[data-task-id="${depId}"]`);
            if (bar) bar.classList.add('dep-highlight');
            
            const label = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${depId}"]`);
            if (label) label.classList.add('dep-highlight');
            
            const startLabel = this.container.querySelector(`.gantt-bar-label-start[data-task-id="${depId}"]`);
            if (startLabel) startLabel.classList.add('dep-highlight');
            
            const name = this.container.querySelector(`.gantt-task-name[data-task-id="${depId}"]`);
            if (name) name.classList.add('dep-highlight');
        });

        // 高亮依赖箭头
        this.container.querySelectorAll('.gantt-dependencies path').forEach(path => {
            const fromId = path.dataset.from;
            const toId = path.dataset.to;
            if (deps.has(fromId) && (toId === taskId || deps.has(toId))) {
                path.classList.add('dep-highlight-arrow');
            }
        });

        setTimeout(() => {
            this.scrollTaskToCenter(taskId);
        }, 150);
        
        addLog(`📌 已选择任务 "${task.name}"${deps.size > 0 ? ` (依赖${deps.size}个任务)` : ''}`);
    };

    /**
     * 取消选择
     */
    GanttChart.prototype.deselect = function() {
        if (!this.selectedTask) return;

        this.selectedTask = null;
        
        this.container.querySelectorAll('.selected, .dep-highlight').forEach(el => {
            el.classList.remove('selected', 'dep-highlight');
        });
        
        this.container.querySelectorAll('.dep-highlight-arrow').forEach(path => {
            path.classList.remove('dep-highlight-arrow');
        });
        
        const form = this.container.querySelector('.inline-task-form');
        if (form) form.remove();
        
        addLog('✅ 已取消选择');
    };

    /**
     * 滚动使任务条居中显示
     */
    GanttChart.prototype.scrollTaskToCenter = function(taskId) {
        if (!taskId || !this.container) return;
        
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`) ||
                    this.container.querySelector(`.gantt-milestone[data-task-id="${taskId}"]`);
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        
        if (!bar || !rowsContainer) return;
        
        try {
            const barRect = bar.getBoundingClientRect();
            const containerRect = rowsContainer.getBoundingClientRect();
            
            const currentScrollLeft = rowsContainer.scrollLeft;
            const currentScrollTop = rowsContainer.scrollTop;
            
            const barAbsoluteLeft = currentScrollLeft + (barRect.left - containerRect.left);
            const barAbsoluteTop = currentScrollTop + (barRect.top - containerRect.top);
            
            const barCenterX = barAbsoluteLeft + (barRect.width / 2);
            const barCenterY = barAbsoluteTop + (barRect.height / 2);
            
            const targetScrollLeft = barCenterX - (rowsContainer.clientWidth / 2);
            const targetScrollTop = barCenterY - (rowsContainer.clientHeight / 2);
            
            const maxScrollLeft = rowsContainer.scrollWidth - rowsContainer.clientWidth;
            const maxScrollTop = rowsContainer.scrollHeight - rowsContainer.clientHeight;
            
            const finalScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
            const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
            
            rowsContainer.scrollTo({
                left: finalScrollLeft,
                top: finalScrollTop,
                behavior: 'smooth'
            });
        } catch (error) {
            console.error('scrollTaskToCenter error:', error);
        }
    };

    /**
     * 更新甘特图高度
     */
    GanttChart.prototype.updateHeight = function() {
        if (!this.container) return;
        
        try {
            const ganttWrapper = this.container.querySelector('.gantt-wrapper');
            const rowsContainer = this.container.querySelector('.gantt-rows-container');
            
            if (!ganttWrapper || !rowsContainer) return;
            
            const headerElement = document.querySelector('h1')?.parentElement;
            const logPanel = document.getElementById('logPanel');
            
            const headerHeight = headerElement ? headerElement.offsetHeight : 80;
            const logHeight = logPanel ? 
                (logPanel.classList.contains('hidden') ? 0 : 
                 (logPanel.classList.contains('collapsed') ? 55 : 240)) : 0;
            
            const totalPadding = 30 + 30 + 50;
            const availableHeight = window.innerHeight - headerHeight - logHeight - totalPadding;
            const finalHeight = Math.max(availableHeight, 350);
            
            ganttWrapper.style.height = finalHeight + 'px';
            ganttWrapper.style.maxHeight = finalHeight + 'px';
            
            const contentHeight = this.tasks.length * ROW_HEIGHT;
            
            if (contentHeight > finalHeight - HEADER_HEIGHT) {
                rowsContainer.style.overflowY = 'auto';
                rowsContainer.style.overflowX = 'auto';
            } else {
                rowsContainer.style.overflowY = 'hidden';
                rowsContainer.style.overflowX = 'auto';
            }
        } catch (error) {
            console.error('updateHeight error:', error);
        }
    };

    // ==================== 任务增删改查 ====================

    /**
     * 添加任务（⭐ 默认工期1天，自然日）
     */
    GanttChart.prototype.addTask = function(task) {
        if (!task || typeof task !== 'object') {
            console.error('Invalid task object');
            return;
        }

        // 自动补全所有必需字段
        if (!task.id) task.id = generateId();
        if (!task.uid) task.uid = this.getNextUID();
        if (!task.name) task.name = '新任务';
        if (!task.start) task.start = formatDate(new Date());
        
        // ⭐ 默认工期1天，自然日类型
        if (typeof task.duration !== 'number') task.duration = 1;
        if (!task.durationType) task.durationType = 'days';
        
        // 根据工期类型计算结束日期
        if (!task.end) {
            const startDate = new Date(task.start);
            const endDate = calculateEndDate(startDate, task.duration, task.durationType);
            task.end = formatDate(endDate);
        }
        
        if (typeof task.progress !== 'number') task.progress = 0;
        if (!Array.isArray(task.dependencies)) task.dependencies = [];
        
        // 新字段默认值
        if (typeof task.isMilestone !== 'boolean') task.isMilestone = false;
        if (typeof task.isSummary !== 'boolean') task.isSummary = false;
        if (task.parentId === undefined) task.parentId = null;
        if (!Array.isArray(task.children)) task.children = [];
        if (!task.outlineLevel) task.outlineLevel = 1;
        if (!task.priority) task.priority = 'medium';
        if (task.notes === undefined) task.notes = '';
        if (typeof task.isCollapsed !== 'boolean') task.isCollapsed = false;

        this.tasks.push(task);
        
        // 生成 WBS
        task.wbs = this.generateWBS(task.id);
        
        this.sortTasksByWBS();
        this.calculateDateRange();
        this.render();
        
        const typeLabel = task.durationType === 'workdays' ? '工作日' : '自然日';
        addLog(`✅ 已添加任务 "${task.name}"（${task.duration}${typeLabel}）`);
    };

    /**
     * 删除任务
     */
    GanttChart.prototype.deleteTask = function(taskId) {
        this.deleteTaskWithChildren(taskId);
    };

    /**
     * 删除任务（⭐ 禁止删除有子任务的任务）
     */
    GanttChart.prototype.deleteTaskWithChildren = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn('Task not found:', taskId);
            return;
        }

        // ⭐ 有子任务时禁止删除
        if (task.children && task.children.length > 0) {
            console.warn(`Cannot delete task with children: ${task.name}`);
            return;
        }

        // 从父任务移除
        if (task.parentId) {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (parent && parent.children) {
                parent.children = parent.children.filter(cid => cid !== taskId);
                
                if (parent.children.length === 0) {
                    parent.isSummary = false;
                    addLog(`   "${parent.name}" 已自动取消汇总任务状态`);
                } else {
                    this.recalculateSummaryTask(parent.id);
                }
            }
        }

        // 删除任务
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        
        // 清理其他任务的依赖
        let removedDepsCount = 0;
        this.tasks.forEach(t => {
            if (t.dependencies && t.dependencies.length > 0) {
                const originalCount = t.dependencies.length;
                
                t.dependencies = t.dependencies.filter(dep => {
                    const depId = typeof dep === 'string' ? dep : dep.taskId;
                    return depId !== taskId;
                });
                
                const removed = originalCount - t.dependencies.length;
                if (removed > 0) {
                    removedDepsCount += removed;
                    addLog(`   "${t.name}" 移除了对 "${task.name}" 的依赖`);
                }
            }
        });

        // 取消选择
        if (this.selectedTask === taskId) {
            this.selectedTask = null;
        }

        // 重新生成所有 WBS
        this.tasks.forEach(t => {
            t.wbs = this.generateWBS(t.id);
        });

        this.calculateDateRange();
        this.render();

        addLog(`✅ 已删除任务 "${task.name}"${removedDepsCount > 0 ? `（清理了 ${removedDepsCount} 个依赖关系）` : ''}`);
    };

    // ==================== 子任务管理 ====================

    /**
     * 添加子任务（⭐ 继承父任务的工期类型）
     */
    GanttChart.prototype.addChildTask = function(parentId) {
        const parent = this.tasks.find(t => t.id === parentId);
        if (!parent) return;

        const newTask = {
            id: generateId(),
            uid: this.getNextUID(),
            name: '新子任务',
            start: formatDate(new Date(parent.start)),
            duration: 1, // ⭐ 默认1天
            durationType: parent.durationType || 'days', // ⭐ 继承父任务的工期类型
            progress: 0,
            isMilestone: false,
            isSummary: false,
            parentId: parentId,
            children: [],
            outlineLevel: (parent.outlineLevel || 1) + 1,
            wbs: '',
            priority: 'medium',
            notes: '',
            isCollapsed: false,
            dependencies: []
        };
        
        // 计算结束日期
        const startDate = new Date(newTask.start);
        const endDate = calculateEndDate(startDate, newTask.duration, newTask.durationType);
        newTask.end = formatDate(endDate);

        if (!parent.children) parent.children = [];
        parent.children.push(newTask.id);
        parent.isSummary = true;

        const parentIndex = this.tasks.findIndex(t => t.id === parentId);
        this.tasks.splice(parentIndex + 1, 0, newTask);

        newTask.wbs = this.generateWBS(newTask.id);
        this.recalculateSummaryTask(parentId);
        this.calculateDateRange();
        this.render();

        setTimeout(() => {
            this.selectTask(newTask.id);
            this.showInlineTaskForm(newTask);
            addLog(`✅ 已为 "${parent.name}" 添加子任务 [${newTask.wbs}]`);
        }, 100);
    };

    // ==================== 父子关系管理 ====================

    /**
     * 更新父子关系
     */
    GanttChart.prototype.updateParentRelationship = function(task, oldParentId, newParentId) {
        // 从旧父任务移除
        if (oldParentId) {
            const oldParent = this.tasks.find(t => t.id === oldParentId);
            if (oldParent && oldParent.children) {
                oldParent.children = oldParent.children.filter(cid => cid !== task.id);
                
                if (oldParent.children.length === 0) {
                    oldParent.isSummary = false;
                } else {
                    this.recalculateSummaryTask(oldParentId);
                }
            }
        }
        
        // 添加到新父任务
        if (newParentId) {
            const newParent = this.tasks.find(t => t.id === newParentId);
            if (newParent) {
                if (!newParent.children) newParent.children = [];
                if (!newParent.children.includes(task.id)) {
                    newParent.children.push(task.id);
                }
                
                if (!newParent.isSummary) {
                    newParent.isSummary = true;
                }
                
                task.outlineLevel = (newParent.outlineLevel || 1) + 1;
                this.updateChildrenOutlineLevel(task.id);
            }
        } else {
            task.outlineLevel = 1;
            this.updateChildrenOutlineLevel(task.id);
        }

        task.parentId = newParentId;
    };

    /**
     * 递归更新子任务的层级深度
     */
    GanttChart.prototype.updateChildrenOutlineLevel = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.children || task.children.length === 0) return;

        const parentLevel = task.outlineLevel || 1;
        
        task.children.forEach(childId => {
            const child = this.tasks.find(t => t.id === childId);
            if (child) {
                child.outlineLevel = parentLevel + 1;
                this.updateChildrenOutlineLevel(childId);
            }
        });
    };

    /**
     * 判断任务A是否是任务B的后代
     */
    GanttChart.prototype.isDescendantOf = function(taskAId, taskBId) {
        const taskA = this.tasks.find(t => t.id === taskAId);
        if (!taskA || !taskA.parentId) return false;
        
        if (taskA.parentId === taskBId) return true;
        
        return this.isDescendantOf(taskA.parentId, taskBId);
    };

    // ==================== 汇总任务计算 ====================

    /**
     * 重新计算汇总任务的时间范围
     */
    GanttChart.prototype.recalculateSummaryTask = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.isSummary || !task.children || task.children.length === 0) {
            return;
        }

        let minStart = null;
        let maxEnd = null;
        let totalProgress = 0;
        let totalDuration = 0;

        task.children.forEach(childId => {
            const child = this.tasks.find(t => t.id === childId);
            if (!child) return;

            if (child.isSummary) {
                this.recalculateSummaryTask(childId);
            }

            const childStart = new Date(child.start);
            const childEnd = new Date(child.end);

            if (!minStart || childStart < minStart) minStart = childStart;
            if (!maxEnd || childEnd > maxEnd) maxEnd = childEnd;

            const childDuration = child.duration || 1;
            totalProgress += (child.progress || 0) * childDuration;
            totalDuration += childDuration;
        });

        if (minStart && maxEnd) {
            task.start = formatDate(minStart);
            task.end = formatDate(maxEnd);
            task.duration = daysBetween(minStart, maxEnd) + 1;
            task.progress = totalDuration > 0 ? Math.round(totalProgress / totalDuration) : 0;
        }
    };

    /**
     * 更新所有父任务（递归向上）
     */
    GanttChart.prototype.updateParentTasks = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.parentId) return;

        this.recalculateSummaryTask(task.parentId);
        this.updateParentTasks(task.parentId);
    };

    // ==================== WBS 管理 ====================

    /**
     * 自动生成 WBS 编号
     */
    GanttChart.prototype.generateWBS = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return '';

        if (!task.parentId) {
            const topLevelTasks = this.tasks.filter(t => !t.parentId);
            const index = topLevelTasks.findIndex(t => t.id === taskId);
            return String(index + 1);
        } else {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (!parent) return '';

            const parentWBS = parent.wbs || this.generateWBS(parent.id);
            const siblings = parent.children || [];
            const index = siblings.indexOf(taskId);
            
            return `${parentWBS}.${index + 1}`;
        }
    };

    /**
     * 按 WBS 排序任务
     */
    GanttChart.prototype.sortTasksByWBS = function() {
        this.tasks.sort((a, b) => {
            const wbsA = a.wbs || '';
            const wbsB = b.wbs || '';
            
            if (!wbsA && !wbsB) return 0;
            if (!wbsA) return 1;
            if (!wbsB) return -1;
            
            const partsA = wbsA.split('.').map(n => parseInt(n) || 0);
            const partsB = wbsB.split('.').map(n => parseInt(n) || 0);
            
            for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                const numA = partsA[i] || 0;
                const numB = partsB[i] || 0;
                if (numA !== numB) return numA - numB;
            }
            
            return 0;
        });
    };

    // ==================== 折叠/展开 ====================

    /**
     * 切换任务折叠状态
     */
    GanttChart.prototype.toggleTaskCollapse = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.isSummary) return;

        task.isCollapsed = !task.isCollapsed;
        this.render();

        const childrenCount = task.children ? task.children.length : 0;
        addLog(`${task.isCollapsed ? '📂' : '📁'} 任务 "${task.name}" 已${task.isCollapsed ? '折叠' : '展开'}（${childrenCount}个子任务）`);
    };

    // ==================== 工具函数 ====================

    /**
     * 获取下一个 UID
     */
    GanttChart.prototype.getNextUID = function() {
        const maxUID = this.tasks.reduce((max, task) => 
            Math.max(max, task.uid || 0), 0);
        return maxUID + 1;
    };

    /**
     * 更新选项
     */
    GanttChart.prototype.updateOptions = function(options) {
        if (!options || typeof options !== 'object') return;
        
        const hasChanged = Object.keys(options).some(key => 
            this.options[key] !== options[key]
        );
        
        if (hasChanged) {
            Object.assign(this.options, options);
            this.render();
        }
    };

    /**
     * 获取选中的任务
     */
    GanttChart.prototype.getSelectedTask = function() {
        return this.tasks.find(t => t.id === this.selectedTask);
    };

    /**
     * 切换任务名称栏
     */
    GanttChart.prototype.toggleSidebar = function(show) {
        if (!this.container) return;
        
        const sidebar = this.container.querySelector('.gantt-sidebar');
        if (!sidebar) return;
        
        try {
            if (show) {
                sidebar.classList.remove('collapsed');
                this.options.showTaskNames = true;
                addLog('✅ 任务名称栏已展开');
            } else {
                sidebar.classList.add('collapsed');
                this.options.showTaskNames = false;
                addLog('✅ 任务名称栏已折叠');
            }
        } catch (error) {
            console.error('toggleSidebar error:', error);
        }
    };

    console.log('✅ gantt-operations.js loaded successfully (Epsilon16 - 精简版)');

})();
