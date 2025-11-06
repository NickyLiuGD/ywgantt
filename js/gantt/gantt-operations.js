// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图任务操作模块                                              ▓▓
// ▓▓ 路径: js/gantt/gantt-operations.js                             ▓▓
// ▓▓ 版本: Gamma11 - 修复版（恢复依赖关系显示）                     ▓▓
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
        this.container.querySelectorAll('.gantt-bar, .gantt-task-name, .gantt-bar-label-external').forEach(el => {
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
        const selectedBar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
        if (selectedBar) selectedBar.classList.add('selected');

        const selectedLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
        if (selectedLabel) selectedLabel.classList.add('selected');

        const selectedName = this.container.querySelector(`.gantt-task-name[data-task-id="${taskId}"]`);
        if (selectedName) selectedName.classList.add('selected');

        // ⭐ 获取并高亮所有依赖任务
        const deps = this.getAllDependencies(taskId);
        deps.forEach(depId => {
            const bar = this.container.querySelector(`.gantt-bar[data-task-id="${depId}"]`);
            if (bar) bar.classList.add('dep-highlight');
            
            const label = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${depId}"]`);
            if (label) label.classList.add('dep-highlight');
            
            const name = this.container.querySelector(`.gantt-task-name[data-task-id="${depId}"]`);
            if (name) name.classList.add('dep-highlight');
        });

        // ⭐ 高亮依赖箭头
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
     * 更新选择状态（已废弃，功能整合到selectTask中）
     * @deprecated 使用 selectTask 替代
     */
    GanttChart.prototype.updateSelectionState = function(taskId) {
        console.warn('updateSelectionState is deprecated, use selectTask instead');
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
        
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
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
        if (!task.name) task.name = '新任务';
        if (!task.start) task.start = formatDate(new Date());
        if (!task.end) task.end = formatDate(addDays(new Date(), 3));
        if (typeof task.progress !== 'number') task.progress = 0;
        if (!Array.isArray(task.dependencies)) task.dependencies = [];

        this.tasks.push(task);
        this.calculateDateRange();
        this.render();
    };

    /**
     * 删除任务
     * @param {string} taskId - 任务ID
     */
    GanttChart.prototype.deleteTask = function(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        
        this.tasks.forEach(task => {
            if (Array.isArray(task.dependencies)) {
                task.dependencies = task.dependencies.filter(dep => dep !== taskId);
            }
        });
        
        if (this.selectedTask === taskId) {
            this.selectedTask = null;
        }
        
        this.calculateDateRange();
        this.render();
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

    console.log('✅ gantt-operations.js loaded successfully (修复版 - 恢复依赖关系显示)');

})();
