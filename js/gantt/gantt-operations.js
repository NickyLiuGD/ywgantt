// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图任务操作模块                                              ▓▓
// ▓▓ 路径: js/gantt/gantt-operations.js                             ▓▓
// ▓▓ 版本: Epsilon4 - 支持层级任务/汇总任务/里程碑                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 选中任务（完整版 - 包含依赖关系高亮）
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.selectTask = function(taskId) {
        if (!taskId || this.selectedTask === taskId) return;

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`Task not found: ${taskId}`);
            return;
        }

        // 清除所有高亮和旧表单
        this.container.querySelectorAll('.gantt-bar, .gantt-milestone, .gantt-task-name, .gantt-bar-label-external').forEach(el => {
            el.classList.remove('selected', 'dep-highlight');
        });
        this.container.querySelectorAll('.gantt-dependencies path').forEach(path => {
            path.classList.remove('dep-highlight-arrow');
        });
        const oldForm = this.container.querySelector('.inline-task-form');
        if (oldForm) oldForm.remove();

        // 设置选中任务
        this.selectedTask = taskId;

        // 高亮选中任务
        const selectedBar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`) ||
                           this.container.querySelector(`.gantt-milestone[data-task-id="${taskId}"]`);
        if (selectedBar) selectedBar.classList.add('selected');

        const selectedLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
        if (selectedLabel) selectedLabel.classList.add('selected');

        const selectedName = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
        if (selectedName) selectedName.classList.add('selected');

        // 获取并高亮所有依赖任务
        const deps = this.getAllDependencies(taskId);
        deps.forEach(depId => {
            const bar = this.container.querySelector(`.gantt-bar[data-task-id="${depId}"]`) ||
                       this.container.querySelector(`.gantt-milestone[data-task-id="${depId}"]`);
            if (bar) bar.classList.add('dep-highlight');
            
            const label = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${depId}"]`);
            if (label) label.classList.add('dep-highlight');
            
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

        // 滚动到任务中心
        setTimeout(() => {
            this.scrollTaskToCenter(taskId);
        }, 150);
        
        addLog(`📌 已选择任务 "${task.name}"${deps.size > 0 ? ` (依赖${deps.size}个任务)` : ''}`);
    };

    /**
     * 取消选择（完整版 - 清除所有高亮）
     */
    GanttChart.prototype.deselect = function() {
        if (!this.selectedTask) return;

        this.selectedTask = null;
        
        // 清除所有选中和依赖高亮
        this.container.querySelectorAll('.selected, .dep-highlight').forEach(el => {
            el.classList.remove('selected', 'dep-highlight');
        });
        
        // 清除依赖箭头高亮
        this.container.querySelectorAll('.dep-highlight-arrow').forEach(path => {
            path.classList.remove('dep-highlight-arrow');
        });
        
        // 移除编辑表单
        const form = this.container.querySelector('.inline-task-form');
        if (form) form.remove();
        
        addLog('✅ 已取消选择');
    };

    /**
     * 滚动使任务条居中显示
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.scrollTaskToCenter = function(taskId) {
        if (!taskId || !this.container) {
            console.warn('scrollTaskToCenter: Invalid parameters');
            return;
        }
        
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`) ||
                    this.container.querySelector(`.gantt-milestone[data-task-id="${taskId}"]`);
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        
        if (!bar || !rowsContainer) {
            console.warn('scrollTaskToCenter: Required elements not found');
            return;
        }
        
        try {
            const barRect = bar.getBoundingClientRect();
            const containerRect = rowsContainer.getBoundingClientRect();
            
            const currentScrollLeft = rowsContainer.scrollLeft;
            const currentScrollTop = rowsContainer.scrollTop;
            
            const barAbsoluteLeft = currentScrollLeft + (barRect.left - containerRect.left);
            const barAbsoluteTop = currentScrollTop + (barRect.top - containerRect.top);
            
            const barWidth = barRect.width;
            const barHeight = barRect.height;
            const containerWidth = rowsContainer.clientWidth;
            const containerHeight = rowsContainer.clientHeight;
            
            const barCenterX = barAbsoluteLeft + (barWidth / 2);
            const barCenterY = barAbsoluteTop + (barHeight / 2);
            
            const targetScrollLeft = barCenterX - (containerWidth / 2);
            const targetScrollTop = barCenterY - (containerHeight / 2);
            
            const maxScrollLeft = rowsContainer.scrollWidth - containerWidth;
            const maxScrollTop = rowsContainer.scrollHeight - containerHeight;
            
            const finalScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
            const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
            
            rowsContainer.scrollTo({
                left: finalScrollLeft,
                top: finalScrollTop,
                behavior: 'smooth'
            });
            
            setTimeout(() => {
                const task = this.tasks.find(t => t.id === taskId);
                const taskIndex = this.tasks.findIndex(t => t.id === taskId);
                if (task) {
                    addLog(`✅ 任务 "${task.name}" 已居中显示 (第 ${taskIndex + 1}/${this.tasks.length} 个)`);
                }
            }, 500);
            
        } catch (error) {
            console.error('scrollTaskToCenter error:', error);
            addLog(`❌ 居中显示失败: ${error.message}`);
        }
    };

    /**
     * 更新甘特图高度以适应窗口
     */
    GanttChart.prototype.updateHeight = function() {
        if (!this.container) return;
        
        try {
            const ganttWrapper = this.container.querySelector('.gantt-wrapper');
            const rowsContainer = this.container.querySelector('.gantt-rows-container');
            
            if (!ganttWrapper || !rowsContainer) {
                console.warn('updateHeight: Elements not found');
                return;
            }
            
            const headerElement = document.querySelector('h1')?.parentElement;
            const logPanel = document.getElementById('logPanel');
            
            const headerHeight = headerElement ? headerElement.offsetHeight : 80;
            const logHeight = logPanel ? 
                (logPanel.classList.contains('hidden') ? 0 : 
                 (logPanel.classList.contains('collapsed') ? 55 : 240)) : 0;
            
            const containerPadding = 30;
            const ganttContainerPadding = 30;
            const totalPadding = containerPadding + ganttContainerPadding + 50;
            
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
            
            addLog(`📏 甘特图高度: ${finalHeight}px, 内容高度: ${contentHeight}px`);
            
        } catch (error) {
            console.error('updateHeight error:', error);
        }
    };

    /**
     * 添加任务
     * @param {Object} task - 任务对象
     */
    GanttChart.prototype.addTask = function(task) {
        if (!task || typeof task !== 'object') {
            console.error('Invalid task object');
            return;
        }

        if (!task.id) task.id = generateId();
        if (!task.uid) task.uid = this.getNextUID();
        if (!task.name) task.name = '新任务';
        if (!task.start) task.start = formatDate(new Date());
        if (!task.end) task.end = formatDate(addDays(new Date(), 3));
        if (typeof task.duration !== 'number') task.duration = 4;
        if (typeof task.progress !== 'number') task.progress = 0;
        if (!Array.isArray(task.dependencies)) task.dependencies = [];
        
        // ⭐ 新增字段默认值
        if (typeof task.isMilestone !== 'boolean') task.isMilestone = false;
        if (typeof task.isSummary !== 'boolean') task.isSummary = false;
        if (!task.parentId) task.parentId = null;
        if (!Array.isArray(task.children)) task.children = [];
        if (!task.outlineLevel) task.outlineLevel = 1;
        if (!task.wbs) task.wbs = this.generateWBS(task.id);
        if (!task.priority) task.priority = 'medium';
        if (!task.notes) task.notes = '';

        this.tasks.push(task);
        this.sortTasksByWBS();
        this.calculateDateRange();
        this.render();
    };

    /**
     * 删除任务
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.deleteTask = function(taskId) {
        this.deleteTaskWithChildren(taskId);
    };

    /**
     * ⭐ 删除任务及其所有子任务
     */
    GanttChart.prototype.deleteTaskWithChildren = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const toDelete = [taskId];
        
        // 🤖 递归收集所有子任务
        const collectChildren = (id) => {
            const t = this.tasks.find(task => task.id === id);
            if (t && t.children && t.children.length > 0) {
                t.children.forEach(childId => {
                    toDelete.push(childId);
                    collectChildren(childId);
                });
            }
        };
        collectChildren(taskId);

        // 🤖 从父任务移除
        if (task.parentId) {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (parent && parent.children) {
                parent.children = parent.children.filter(cid => cid !== taskId);
                
                // 🤖 如果父任务没有子任务了，取消汇总状态
                if (parent.children.length === 0) {
                    parent.isSummary = false;
                    addLog(`   "${parent.name}" 已自动取消汇总任务状态`);
                } else {
                    // 重新计算父任务
                    this.recalculateSummaryTask(parent.id);
                }
            }
        }

        // 删除所有相关任务
        this.tasks = this.tasks.filter(t => !toDelete.includes(t.id));
        
        // 🤖 清理其他任务的依赖
        this.tasks.forEach(t => {
            if (t.dependencies && t.dependencies.length > 0) {
                t.dependencies = t.dependencies.filter(dep => {
                    const depId = typeof dep === 'string' ? dep : dep.taskId;
                    return !toDelete.includes(depId);
                });
            }
        });

        if (this.selectedTask === taskId) {
            this.selectedTask = null;
        }

        // 🤖 重新生成所有 WBS
        this.tasks.forEach(t => {
            t.wbs = this.generateWBS(t.id);
        });

        this.calculateDateRange();
        this.render();

        addLog(`✅ 已删除任务 "${task.name}"${toDelete.length > 1 ? ` 及 ${toDelete.length - 1} 个子任务` : ''}`);
    };

    /**
     * ⭐ 添加子任务
     */
    GanttChart.prototype.addChildTask = function(parentId) {
        const parent = this.tasks.find(t => t.id === parentId);
        if (!parent) return;

        const newTask = {
            id: generateId(),
            uid: this.getNextUID(),
            name: '新子任务',
            start: formatDate(new Date(parent.start)),
            end: formatDate(addDays(new Date(parent.start), 2)),
            duration: 3,
            progress: 0,
            isMilestone: false,
            isSummary: false,
            parentId: parentId,
            children: [],
            outlineLevel: (parent.outlineLevel || 1) + 1,
            wbs: '',
            priority: 'medium',
            notes: '',
            dependencies: []
        };

        // 🤖 添加到父任务的子任务列表
        if (!parent.children) parent.children = [];
        parent.children.push(newTask.id);
        
        // 🤖 设置父任务为汇总任务
        parent.isSummary = true;

        // 插入到父任务后面
        const parentIndex = this.tasks.findIndex(t => t.id === parentId);
        this.tasks.splice(parentIndex + 1, 0, newTask);

        // 🤖 生成 WBS
        newTask.wbs = this.generateWBS(newTask.id);

        // 🤖 重新计算父任务时间
        this.recalculateSummaryTask(parentId);

        this.calculateDateRange();
        this.render();

        // 自动选中并编辑
        setTimeout(() => {
            this.selectTask(newTask.id);
            this.showInlineTaskForm(newTask);
            addLog(`✅ 已为 "${parent.name}" 添加子任务 [${newTask.wbs}]`);
        }, 100);
    };

    /**
     * ⭐ 更新父子关系
     */
    GanttChart.prototype.updateParentRelationship = function(task, oldParentId, newParentId) {
        // 从旧父任务移除
        if (oldParentId) {
            const oldParent = this.tasks.find(t => t.id === oldParentId);
            if (oldParent && oldParent.children) {
                oldParent.children = oldParent.children.filter(cid => cid !== task.id);
                
                // 🤖 如果旧父任务没有子任务了，取消汇总状态
                if (oldParent.children.length === 0) {
                    oldParent.isSummary = false;
                    addLog(`   "${oldParent.name}" 已自动取消汇总任务状态`);
                } else {
                    // 重新计算旧父任务
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
                
                // 🤖 自动设置为汇总任务
                if (!newParent.isSummary) {
                    newParent.isSummary = true;
                    addLog(`   "${newParent.name}" 已自动设为汇总任务`);
                }
                
                // 🤖 自动更新层级深度
                task.outlineLevel = (newParent.outlineLevel || 1) + 1;
                
                // 🤖 递归更新所有子任务的层级
                this.updateChildrenOutlineLevel(task.id);
            }
        } else {
            // 🤖 设为顶级任务
            task.outlineLevel = 1;
            this.updateChildrenOutlineLevel(task.id);
        }

        task.parentId = newParentId;
    };

    /**
     * ⭐ 递归更新子任务的层级深度
     */
    GanttChart.prototype.updateChildrenOutlineLevel = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.children || task.children.length === 0) return;

        const parentLevel = task.outlineLevel || 1;
        
        task.children.forEach(childId => {
            const child = this.tasks.find(t => t.id === childId);
            if (child) {
                child.outlineLevel = parentLevel + 1;
                this.updateChildrenOutlineLevel(childId); // 递归
            }
        });
    };

    /**
     * ⭐ 重新计算汇总任务的时间范围
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

        // 遍历所有子任务
        task.children.forEach(childId => {
            const child = this.tasks.find(t => t.id === childId);
            if (!child) return;

            // 🤖 如果子任务也是汇总任务，先递归计算
            if (child.isSummary) {
                this.recalculateSummaryTask(childId);
            }

            const childStart = new Date(child.start);
            const childEnd = new Date(child.end);

            if (!minStart || childStart < minStart) minStart = childStart;
            if (!maxEnd || childEnd > maxEnd) maxEnd = childEnd;

            // 🤖 加权平均进度（按工期加权）
            const childDuration = child.duration || 1;
            totalProgress += (child.progress || 0) * childDuration;
            totalDuration += childDuration;
        });

        if (minStart && maxEnd) {
            task.start = formatDate(minStart);
            task.end = formatDate(maxEnd);
            task.duration = daysBetween(minStart, maxEnd) + 1;
            task.progress = totalDuration > 0 ? 
                Math.round(totalProgress / totalDuration) : 0;
        }
    };

    /**
     * ⭐ 更新所有父任务（递归向上）
     */
    GanttChart.prototype.updateParentTasks = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.parentId) return;

        this.recalculateSummaryTask(task.parentId);
        this.updateParentTasks(task.parentId); // 递归
    };

    /**
     * ⭐ 自动生成 WBS 编号
     */
    GanttChart.prototype.generateWBS = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return '';

        if (!task.parentId) {
            // 🤖 顶级任务：计算同级序号
            const topLevelTasks = this.tasks.filter(t => !t.parentId);
            const index = topLevelTasks.findIndex(t => t.id === taskId);
            return String(index + 1);
        } else {
            // 🤖 子任务：父WBS + 同级序号
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (!parent) return '';

            const parentWBS = parent.wbs || this.generateWBS(parent.id);
            const siblings = parent.children || [];
            const index = siblings.indexOf(taskId);
            
            return `${parentWBS}.${index + 1}`;
        }
    };

    /**
     * ⭐ 按 WBS 排序任务
     */
    GanttChart.prototype.sortTasksByWBS = function() {
        this.tasks.sort((a, b) => {
            const wbsA = a.wbs || '';
            const wbsB = b.wbs || '';
            
            if (!wbsA && !wbsB) return 0;
            if (!wbsA) return 1;
            if (!wbsB) return -1;
            
            const partsA = wbsA.split('.').map(n => parseInt(n));
            const partsB = wbsB.split('.').map(n => parseInt(n));
            
            for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                const numA = partsA[i] || 0;
                const numB = partsB[i] || 0;
                if (numA !== numB) return numA - numB;
            }
            
            return 0;
        });
    };

    /**
     * ⭐ 切换任务折叠状态
     */
    GanttChart.prototype.toggleTaskCollapse = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.isSummary) return;

        task.isCollapsed = !task.isCollapsed;
        this.render();

        const childrenCount = task.children ? task.children.length : 0;
        addLog(`${task.isCollapsed ? '📂' : '📁'} 任务 "${task.name}" 已${task.isCollapsed ? '折叠' : '展开'}（${childrenCount}个子任务）`);
    };

    /**
     * ⭐ 判断任务A是否是任务B的后代
     */
    GanttChart.prototype.isDescendantOf = function(taskAId, taskBId) {
        const taskA = this.tasks.find(t => t.id === taskAId);
        if (!taskA || !taskA.parentId) return false;
        
        if (taskA.parentId === taskBId) return true;
        
        return this.isDescendantOf(taskA.parentId, taskBId);
    };

    /**
     * ⭐ 获取下一个 UID
     */
    GanttChart.prototype.getNextUID = function() {
        const maxUID = this.tasks.reduce((max, task) => 
            Math.max(max, task.uid || 0), 0);
        return maxUID + 1;
    };

    /**
     * 更新选项
     * @param {Object} options - 新选项
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
     * @returns {Object|undefined} 任务对象
     */
    GanttChart.prototype.getSelectedTask = function() {
        return this.tasks.find(t => t.id === this.selectedTask);
    };

    /**
     * 切换任务名称栏的显示/隐藏
     * @param {boolean} show - 是否显示
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

    console.log('✅ gantt-operations.js loaded successfully (Epsilon4 - 层级任务支持)');

})();
