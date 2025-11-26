// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图渲染模块                                                  ▓▓
// ▓▓ 路径: js/gantt/gantt-render.js                                 ▓▓
// ▓▓ 版本: Epsilon34-FullRestore - 完整复原版 (含修复)              ▓▓
// ▓▓ 修复: 零延迟滚动同步 + 找回任务渲染的所有细节逻辑              ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 渲染甘特图（主入口）
     */
    GanttChart.prototype.render = function() {
        if (!this.container) {
            console.error('GanttChart: Container not found, cannot render');
            return;
        }

        const dates = this.generateDates();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

        // 1. 计算精确的总宽度 (避免浮点数累积误差导致上下宽度不一致)
        const totalWidth = calculateTotalWidth(dates, this.options.cellWidth);

        // 2. 记录滚动位置
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        const prevScrollTop = rowsContainer ? rowsContainer.scrollTop : 0;
        const prevScrollLeft = rowsContainer ? rowsContainer.scrollLeft : 0;
        
        // 3. 构建 HTML 结构
        // 注意：显式设置 gantt-timeline-header 和 gantt-rows 的宽度
        const html = `
            <div class="gantt-wrapper">
                <div class="gantt-sidebar" id="ganttSidebar">
                    <div class="gantt-sidebar-header" id="taskNameHeader">
                        <span>任务名称</span>
                    </div>
                    <div class="gantt-sidebar-body" id="ganttSidebarBody">
                        ${this.renderTaskNames()}
                    </div>
                    <div class="sidebar-resize-handle" id="sidebarResizeHandle" title="拖拽调整宽度"></div>
                </div>
                <div class="gantt-timeline-wrapper">
                    <div class="gantt-timeline">
                        <div class="gantt-timeline-header-wrapper" id="ganttTimelineHeaderWrapper">
                            <div class="gantt-timeline-header" id="ganttTimelineHeader">
                                <div style="width: ${totalWidth}px; height: 100%; display: flex;">
                                    ${this.renderDateHeaders(dates, weekdays)}
                                </div>
                            </div>
                            
                            <!-- 视图菜单 -->
                            <div class="timeline-view-menu" id="timelineViewMenu">
                                <div class="view-menu-title">时间刻度</div>
                                <button class="view-menu-btn ${this.options.timeScale === 'day' && !this.options.isOverviewMode ? 'active' : ''}" data-scale="day"><span class="view-icon">📅</span><span class="view-text">日视图</span></button>
                                <button class="view-menu-btn ${this.options.timeScale === 'week' && !this.options.isOverviewMode ? 'active' : ''}" data-scale="week"><span class="view-icon">📆</span><span class="view-text">周视图</span></button>
                                <button class="view-menu-btn ${this.options.timeScale === 'month' && !this.options.isOverviewMode ? 'active' : ''}" data-scale="month"><span class="view-icon">🗓️</span><span class="view-text">月视图</span></button>
                                <div class="view-menu-divider"></div>
                                <button class="view-menu-btn view-menu-overview ${this.options.isOverviewMode ? 'active' : ''}" data-scale="overview"><span class="view-icon">🔭</span><span class="view-text">全貌视图</span></button>
                            </div>
                        </div>
                        <div class="gantt-rows-container" id="ganttRowsContainer">
                            <div class="gantt-rows" style="width: ${totalWidth}px;">
                                ${this.renderTaskRows(dates)}
                            </div>
                            <svg class="gantt-dependencies" style="position: absolute; top: 0; left: 0; pointer-events: none;"></svg>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // 4. 恢复滚动位置
        const newRowsContainer = this.container.querySelector('.gantt-rows-container');
        const newHeader = this.container.querySelector('.gantt-timeline-header');
        
        if (newRowsContainer) {
            newRowsContainer.scrollTop = prevScrollTop;
            newRowsContainer.scrollLeft = prevScrollLeft;
            if (newHeader) newHeader.scrollLeft = prevScrollLeft;
        }

        // 5. 绑定功能模块
        this.attachSidebarResize();
        this.setupScrollSync(); // ⭐ 零延迟同步
        
        // 6. 渲染依赖
        const visibleTasks = typeof getVisibleTasks === 'function' ? getVisibleTasks(this.tasks) : this.tasks;
        const filteredTasks = this.options.hideCompleted ? 
            visibleTasks.filter(t => t.progress < 100) : visibleTasks;

        this.renderDependencies(dates, filteredTasks);
        
        // 7. 事件绑定
        this.attachEvents();
        this.attachQuickMenus();
        
        setTimeout(() => {
            this.attachTimelineViewMenu();
        }, 100);

        this.updateHeight();
    };

    /**
     * 递归检查任务是否应该隐藏
     */
    GanttChart.prototype.isTaskHidden = function(task) {
        if (!task.parentId) return false;
        let current = task;
        while (current.parentId) {
            const parent = this.tasks.find(t => t.id === current.parentId);
            if (!parent) break;
            if (parent.isCollapsed) return true;
            current = parent;
        }
        return false;
    };

    /**
     * 侧边栏调整
     */
    GanttChart.prototype.attachSidebarResize = function() {
        const handle = document.getElementById('sidebarResizeHandle');
        const sidebar = document.getElementById('ganttSidebar');
        if (!handle || !sidebar) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        const onMouseDown = (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            sidebar.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isResizing) return;
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(100, Math.min(400, startWidth + deltaX));
            sidebar.style.width = newWidth + 'px';
            sidebar.style.minWidth = newWidth + 'px';
        };

        const onMouseUp = () => {
            if (!isResizing) return;
            isResizing = false;
            sidebar.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        handle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    /**
     * 渲染任务名称列表 (完整逻辑回归)
     */
    GanttChart.prototype.renderTaskNames = function() {
        return this.tasks.map(task => {
            if (!task || !task.id) return '';
            if (this.isTaskHidden(task)) return '';
            if (this.options.hideCompleted && task.progress >= 100) return '';

            // 检查就绪状态
            let isReady = false;
            if (task.progress < 100 && !task.isSummary && !task.isMilestone) {
                if (!task.dependencies || task.dependencies.length === 0) {
                    isReady = true;
                } else {
                    const allDepsCompleted = task.dependencies.every(dep => {
                        const depId = typeof dep === 'string' ? dep : dep.taskId;
                        const depTask = this.tasks.find(t => t.id === depId);
                        return depTask && depTask.progress >= 100;
                    });
                    if (allDepsCompleted) isReady = true;
                }
            }

            const outlineLevel = task.outlineLevel || 1;
            const indent = '　'.repeat(outlineLevel - 1);
            const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
            const wbsPrefix = task.wbs ? `<span class="wbs-badge">[${task.wbs}]</span> ` : '';
            
            const collapseBtn = (task.isSummary && task.children && task.children.length > 0) ? 
                `<span class="task-collapse-btn" data-task-id="${task.id}" title="${task.isCollapsed ? '展开' : '折叠'}子任务">
                    ${task.isCollapsed ? '▶' : '▼'}
                </span>` : '';

            return `
                <div class="gantt-task-name ${this.selectedTask === task.id ? 'selected' : ''} 
                            ${task.isSummary ? 'summary-task' : ''} 
                            ${task.isMilestone ? 'milestone-task' : ''}
                            ${isReady ? 'task-ready' : ''}" 
                     data-task-id="${task.id}"
                     data-outline-level="${outlineLevel}"
                     role="button" tabindex="0"
                     aria-label="任务: ${this.escapeHtml(task.name)}">
                    ${collapseBtn}
                    <span class="task-name-content" title="${isReady ? '✅ 前置就绪，可以开始' : ''}">
                        ${indent}${icon} ${wbsPrefix}${this.escapeHtml(task.name)}
                    </span>
                </div>
            `;
        }).join('');
    };

    /**
     * 渲染日期表头
     */
    GanttChart.prototype.renderDateHeaders = function(dates, weekdays) {
        const scale = this.options.timeScale || 'day';
        
        return dates.map(dateObj => {
            const date = dateObj.date;
            const isWeekendDay = typeof isWeekend === 'function' ? isWeekend(date) : false;
            const isTodayDay = typeof isToday === 'function' ? isToday(date) : false;
            
            const classes = ['gantt-date-cell'];
            if (isWeekendDay && this.options.showWeekends) classes.push('weekend');
            if (isTodayDay) classes.push('today');
            
            const cellWidth = this.options.cellWidth * dateObj.span;
            let content = '';
            
            switch (scale) {
                case 'day':
                    content = `
                        <div class="gantt-date-day">${date.getDate()}</div>
                        <div class="gantt-date-weekday">${weekdays[date.getDay()]}</div>
                    `;
                    break;
                case 'week':
                    const weekLabel = dateObj.label.split('\n');
                    content = `
                        <div class="gantt-date-week">${weekLabel[0]}</div>
                        <div class="gantt-date-range">${weekLabel[1]}</div>
                    `;
                    break;
                case 'month':
                    const monthLabel = dateObj.label.split('\n');
                    content = `
                        <div class="gantt-date-year">${monthLabel[0]}</div>
                        <div class="gantt-date-month">${monthLabel[1]}</div>
                    `;
                    break;
            }
            
            return `
                <div class="${classes.join(' ')}" 
                     style="width: ${cellWidth}px; min-width: ${cellWidth}px;"
                     data-scale="${scale}"
                     role="columnheader">
                    ${content}
                </div>
            `;
        }).join('');
    };

    /**
     * 渲染所有任务行
     */
    GanttChart.prototype.renderTaskRows = function(dates) {
        return this.tasks.map(task => this.renderRow(task, dates)).join('');
    };

    /**
     * 渲染单个任务行 (完整逻辑回归)
     */
    GanttChart.prototype.renderRow = function(task, dates) {
        if (!task || !task.id) return '';
        if (this.isTaskHidden(task)) return '';
        if (this.options.hideCompleted && task.progress >= 100) return '';

        const start = new Date(task.start);
        const end = new Date(task.end || task.start);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
        
        const progress = Math.min(Math.max(task.progress || 0, 0), 100);
        const isSelected = this.selectedTask === task.id;
        const isCompleted = progress >= 100;
        
        const startDays = typeof daysBetween === 'function' ? daysBetween(this.startDate, start) : 0;
        const durationDays = (typeof daysBetween === 'function' ? daysBetween(start, end) : 0) + 1;
        
        const left = startDays * this.options.cellWidth;
        const width = Math.max(durationDays * this.options.cellWidth, task.isMilestone ? 20 : 30);

        const startTimeLabel = typeof formatDate === 'function' ? formatDate(start) : '';
        const endTimeLabel = typeof formatDate === 'function' ? formatDate(end) : '';

        const outlineLevel = task.outlineLevel || 1;
        const indent = '　'.repeat(outlineLevel - 1);
        const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
        const wbsPrefix = task.wbs ? `[${task.wbs}] ` : '';
        const displayName = `${indent}${icon} ${wbsPrefix}${task.name}`;

        const priorityAttr = task.priority ? `data-priority="${task.priority}"` : '';
        const durationType = task.durationType || 'days';
        const durationTypeAttr = `data-duration-type="${durationType}"`;
        const durationTypeIcon = durationType === 'workdays' ? '💼' : '📅';

        const collapseToggle = (task.isSummary && task.children && task.children.length > 0) ? 
            `<span class="collapse-toggle" data-task-id="${task.id}" title="${task.isCollapsed ? '展开' : '折叠'}子任务">
                ${task.isCollapsed ? '▶' : '▼'}
            </span>` : '';

        return `
            <div class="gantt-row ${task.isSummary ? 'gantt-row-summary' : ''}" role="row">
                ${this.renderCells(dates)}
                
                <div class="gantt-bar-label-start ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}"
                     style="right: calc(100% - ${left}px + 8px);">
                    <div class="time-label-row time-start">${this.escapeHtml(startTimeLabel)}</div>
                    <div class="time-label-row time-end">
                        ${this.escapeHtml(endTimeLabel)}
                        ${!task.isMilestone && !task.isSummary ? `<span class="duration-type-icon">${durationTypeIcon}</span>` : ''}
                    </div>
                </div>
                
                ${task.isMilestone ? `
                    <div class="gantt-milestone ${isSelected ? 'selected' : ''} ${isCompleted ? 'locked' : ''}" 
                         data-task-id="${task.id}" style="left: ${left}px;">
                        <div class="milestone-diamond"><span class="milestone-icon">🎯</span></div>
                    </div>
                ` : `
                    <div class="gantt-bar ${task.isSummary ? 'gantt-bar-summary' : ''} 
                                ${isSelected ? 'selected' : ''} 
                                ${isCompleted ? 'locked' : ''}" 
                         data-task-id="${task.id}" ${priorityAttr} ${durationTypeAttr}
                         style="left: ${left}px; width: ${width}px;"
                         ${isCompleted ? 'title="已完成 (100%) - 锁定"' : ''}>
                        <div class="gantt-bar-progress" style="width: ${progress}%"></div>
                        
                        ${this.options.enableResize && !task.isSummary && !isCompleted ? `
                            <div class="gantt-bar-handle left"></div>
                            <div class="gantt-bar-handle right"></div>
                        ` : ''}
                    </div>
                `}
                
                <div class="gantt-bar-label-external ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}" style="left: ${left + width + 8}px;">
                    ${this.escapeHtml(displayName)} 
                    ${!task.isMilestone ? `<span class="task-progress-badge" style="${isCompleted ? 'background:#10b981;color:white;' : ''}">${progress}%</span>` : ''}
                    ${collapseToggle}
                </div>
            </div>
        `;
    };

    /**
     * 渲染单元格（背景网格）
     */
    GanttChart.prototype.renderCells = function(dates) {
        const scale = this.options.timeScale || 'day';
        return dates.map(dateObj => {
            const date = dateObj.date;
            const isWeekendDay = typeof isWeekend === 'function' ? isWeekend(date) : false;
            const isTodayDay = typeof isToday === 'function' ? isToday(date) : false;
            
            const classes = ['gantt-cell'];
            if (isWeekendDay && this.options.showWeekends) classes.push('weekend');
            if (isTodayDay) classes.push('today');
            
            const cellWidth = this.options.cellWidth * dateObj.span;
            
            return `
                <div class="${classes.join(' ')}" 
                     style="width: ${cellWidth}px; min-width: ${cellWidth}px;"
                     data-scale="${scale}"
                     role="gridcell"></div>
            `;
        }).join('');
    };

    /**
     * ⭐⭐⭐ 零延迟同步滚动 (关键修复) ⭐⭐⭐
     */
    GanttChart.prototype.setupScrollSync = function() {
        const sidebarBody = document.getElementById('ganttSidebarBody');
        const rowsContainer = document.getElementById('ganttRowsContainer');
        const timelineHeader = document.getElementById('ganttTimelineHeader');

        if (!sidebarBody || !rowsContainer || !timelineHeader) return;

        // 移除 rAF 延迟，直接同步
        // 使用标志位防止循环触发
        let isSyncing = false;

        rowsContainer.addEventListener('scroll', () => {
            if (isSyncing) return;
            isSyncing = true;
            
            sidebarBody.scrollTop = rowsContainer.scrollTop;
            timelineHeader.scrollLeft = rowsContainer.scrollLeft;
            
            isSyncing = false;
        }, { passive: true });

        sidebarBody.addEventListener('scroll', () => {
            if (isSyncing) return;
            isSyncing = true;
            
            rowsContainer.scrollTop = sidebarBody.scrollTop;
            
            isSyncing = false;
        }, { passive: true });
        
        // 初始对齐
        timelineHeader.scrollLeft = rowsContainer.scrollLeft;
    };

    /**
     * 绑定时间轴视图菜单
     */
    GanttChart.prototype.attachTimelineViewMenu = function() {
        const headerWrapper = document.getElementById('ganttTimelineHeaderWrapper');
        const viewMenu = document.getElementById('timelineViewMenu');
        if (!headerWrapper || !viewMenu) return;

        let menuTimer = null;
        headerWrapper.addEventListener('mouseenter', () => { clearTimeout(menuTimer); menuTimer = setTimeout(() => viewMenu.classList.add('show'), 300); });
        headerWrapper.addEventListener('mouseleave', () => { clearTimeout(menuTimer); menuTimer = setTimeout(() => { if (!viewMenu.matches(':hover')) viewMenu.classList.remove('show'); }, 200); });
        viewMenu.addEventListener('mouseenter', () => clearTimeout(menuTimer));
        viewMenu.addEventListener('mouseleave', () => { menuTimer = setTimeout(() => viewMenu.classList.remove('show'), 200); });

        viewMenu.querySelectorAll('.view-menu-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const scale = btn.dataset.scale;
                if (scale === 'overview') {
                    this.switchToOverviewMode();
                } else {
                    this.options.isOverviewMode = false;
                    this.options.timeScale = scale;
                    this.options.cellWidth = typeof getRecommendedCellWidth === 'function' ? getRecommendedCellWidth(scale) : 50;
                    this.calculateDateRange();
                    this.render();
                    if (typeof addLog === 'function') addLog(`✅ 已切换到${scale}视图`);
                }
                viewMenu.classList.remove('show');
            };
        });
    };

    /**
     * HTML 转义
     */
    GanttChart.prototype.escapeHtml = function(text) {
        if (typeof text !== 'string') return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    };

    /**
     * 销毁实例
     */
    GanttChart.prototype.destroy = function() {
        if (this._mouseMoveHandler) document.removeEventListener('mousemove', this._mouseMoveHandler);
        if (this._mouseUpHandler) document.removeEventListener('mouseup', this._mouseUpHandler);
        if (this.container) this.container.innerHTML = '';
        this.tasks = null;
        this.container = null;
        this._cachedElements = null;
        this._dateCache = null;
        console.log('GanttChart instance destroyed');
    };

    console.log('✅ gantt-render.js loaded successfully (Epsilon34-FullRestore)');

})();