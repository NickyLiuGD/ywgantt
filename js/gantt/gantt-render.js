// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图渲染模块                                                  ▓▓
// ▓▓ 路径: js/gantt/gantt-render.js                                 ▓▓
// ▓▓ 版本: Epsilon25 - 完整版 (含就绪高亮、锁定、隐藏完成)          ▓▓
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

        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        const prevScrollTop = rowsContainer ? rowsContainer.scrollTop : 0;
        // ... (生成 HTML) ...
        this.container.innerHTML = html;
        // ...
        const newRowsContainer = this.container.querySelector('.gantt-rows-container');
        if (newRowsContainer) {
            newRowsContainer.scrollTop = prevScrollTop;
        }
        
        // 构建基础 HTML 结构
        const html = `
            <div class="gantt-wrapper">
                <div class="gantt-sidebar" id="ganttSidebar">
                    <!-- 表头：移除硬编码按钮，交由悬停菜单处理 -->
                    <div class="gantt-sidebar-header" id="taskNameHeader">
                        <span>任务名称</span>
                    </div>
                    <div class="gantt-sidebar-body" id="ganttSidebarBody">
                        ${this.renderTaskNames()}
                    </div>
                    <!-- 拖拽调整宽度手柄 -->
                    <div class="sidebar-resize-handle" id="sidebarResizeHandle" 
                         title="拖拽调整宽度" 
                         aria-label="调整侧边栏宽度"></div>
                </div>
                <div class="gantt-timeline-wrapper">
                    <div class="gantt-timeline">
                        <div class="gantt-timeline-header-wrapper" id="ganttTimelineHeaderWrapper">
                            <div class="gantt-timeline-header" id="ganttTimelineHeader">
                                ${this.renderDateHeaders(dates, weekdays)}
                            </div>
                            
                            <!-- 时间轴视图切换菜单 -->
                            <div class="timeline-view-menu" id="timelineViewMenu">
                                <div class="view-menu-title">时间刻度</div>
                                <button class="view-menu-btn ${this.options.timeScale === 'day' && !this.options.isOverviewMode ? 'active' : ''}" 
                                        data-scale="day" title="按天显示">
                                    <span class="view-icon">📅</span>
                                    <span class="view-text">日视图</span>
                                </button>
                                <button class="view-menu-btn ${this.options.timeScale === 'week' && !this.options.isOverviewMode ? 'active' : ''}" 
                                        data-scale="week" title="按周显示">
                                    <span class="view-icon">📆</span>
                                    <span class="view-text">周视图</span>
                                </button>
                                <button class="view-menu-btn ${this.options.timeScale === 'month' && !this.options.isOverviewMode ? 'active' : ''}" 
                                        data-scale="month" title="按月显示">
                                    <span class="view-icon">🗓️</span>
                                    <span class="view-text">月视图</span>
                                </button>
                                
                                <div class="view-menu-divider"></div>
                                
                                <button class="view-menu-btn view-menu-overview ${this.options.isOverviewMode ? 'active' : ''}" 
                                        data-scale="overview" title="自适应显示整个项目">
                                    <span class="view-icon">🔭</span>
                                    <span class="view-text">全貌视图</span>
                                </button>
                            </div>
                        </div>
                        <div class="gantt-rows-container" id="ganttRowsContainer">
                            <div class="gantt-rows">
                                ${this.renderTaskRows(dates)}
                            </div>
                            <svg class="gantt-dependencies" style="position: absolute; top: 0; left: 0; pointer-events: none;"></svg>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // 绑定功能模块
        this.attachSidebarResize();
        this.setupScrollSync();
        
        console.log('🔄 开始渲染依赖箭头...');
        
        // ⭐ 获取可见任务列表，并应用"隐藏已完成"过滤
        // getVisibleTasks 来自 gantt-dependencies.js，只处理折叠
        const visibleTasks = typeof getVisibleTasks === 'function' ? getVisibleTasks(this.tasks) : this.tasks;
        
        const filteredTasks = this.options.hideCompleted ? 
            visibleTasks.filter(t => t.progress < 100) : 
            visibleTasks;

        this.renderDependencies(dates, filteredTasks);
        
        // 绑定事件
        this.attachEvents();
        this.attachQuickMenus();
        
        setTimeout(() => {
            this.attachTimelineViewMenu();
        }, 100);

        this.updateHeight();
    };

    /**
     * 递归检查任务是否应该隐藏 (支持多级折叠)
     */
    GanttChart.prototype.isTaskHidden = function(task) {
        if (!task.parentId) return false;
        
        let current = task;
        // 向上遍历所有祖先
        while (current.parentId) {
            const parent = this.tasks.find(t => t.id === current.parentId);
            if (!parent) break;
            
            // 如果任何一个祖先是折叠状态，则当前任务隐藏
            if (parent.isCollapsed) return true;
            
            current = parent;
        }
        return false;
    };

    /**
     * 绑定侧边栏拖拽调整宽度事件
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
            
            const finalWidth = sidebar.offsetWidth;
            if (typeof addLog === 'function') {
                // addLog(`✅ 任务名称栏宽度已调整为 ${finalWidth}px`);
            }
        };

        handle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    /**
     * 渲染任务名称列表
     */
    GanttChart.prototype.renderTaskNames = function() {
        return this.tasks.map(task => {
            if (!task || !task.id) return '';
            
            // 1. 递归检查折叠可见性
            if (this.isTaskHidden(task)) return '';
            
            // 2. ⭐ 检查"隐藏已完成"选项
            if (this.options.hideCompleted && task.progress >= 100) return '';

            // 3. ⭐ 判断任务是否"就绪" (无依赖 或 依赖全完成)
            let isReady = false;
            if (task.progress < 100 && !task.isSummary && !task.isMilestone) {
                if (!task.dependencies || task.dependencies.length === 0) {
                    isReady = true; // 无依赖
                } else {
                    // 检查依赖是否都已完成
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
                     role="button"
                     tabindex="0"
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
                     data-start="${typeof formatDate === 'function' ? formatDate(dateObj.startDate) : ''}"
                     data-end="${typeof formatDate === 'function' ? formatDate(dateObj.endDate) : ''}"
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
     * 渲染单个任务行
     */
    GanttChart.prototype.renderRow = function(task, dates) {
        if (!task || !task.id) return '';
        
        // 1. 折叠隐藏
        if (this.isTaskHidden(task)) return '';
        
        // 2. ⭐ 隐藏已完成任务
        if (this.options.hideCompleted && task.progress >= 100) return '';

        const start = new Date(task.start);
        const end = new Date(task.end || task.start);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
        
        const progress = Math.min(Math.max(task.progress || 0, 0), 100);
        const isSelected = this.selectedTask === task.id;
        
        // ⭐ 判断锁定状态 (100%完成)
        const isCompleted = progress >= 100;
        
        const startDays = typeof daysBetween === 'function' ? daysBetween(this.startDate, start) : 0;
        const durationDays = (typeof daysBetween === 'function' ? daysBetween(start, end) : 0) + 1;
        
        const left = startDays * this.options.cellWidth;
        const width = Math.max(durationDays * this.options.cellWidth, task.isMilestone ? 20 : 30);

        const startTimeLabel = typeof formatDate === 'function' ? formatDate(start) : '';
        const endTimeLabel = typeof formatDate === 'function' ? formatDate(end) : '';

        const outlineLevel = task.outlineLevel || 1;
        const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
        const wbsPrefix = task.wbs ? `[${task.wbs}] ` : '';
        const indent = '　'.repeat(outlineLevel - 1);
        const displayName = `${indent}${icon} ${wbsPrefix}${task.name}`;

        const priorityAttr = task.priority ? `data-priority="${task.priority}"` : '';
        const durationType = task.durationType || 'days';
        const durationTypeAttr = `data-duration-type="${durationType}"`;
        const durationTypeIcon = durationType === 'workdays' ? '💼' : '📅';
        const durationTypeTitle = durationType === 'workdays' ? '工作日' : '自然日';

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
                        
                        <!-- ⭐ 如果任务已完成，不渲染拖拽手柄 -->
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
     * 设置滚动同步
     */
    GanttChart.prototype.setupScrollSync = function() {
        const sidebarBody = document.getElementById('ganttSidebarBody');
        const rowsContainer = document.getElementById('ganttRowsContainer');
        const timelineHeader = document.getElementById('ganttTimelineHeader');

        if (!sidebarBody || !rowsContainer || !timelineHeader) return;

        let isSyncingScroll = false;

        rowsContainer.addEventListener('scroll', () => {
            if (isSyncingScroll) return;
            isSyncingScroll = true;
            
            sidebarBody.scrollTop = rowsContainer.scrollTop;
            timelineHeader.scrollLeft = rowsContainer.scrollLeft;
            
            requestAnimationFrame(() => {
                isSyncingScroll = false;
            });
        }, { passive: true });

        sidebarBody.addEventListener('scroll', () => {
            if (isSyncingScroll) return;
            isSyncingScroll = true;
            
            rowsContainer.scrollTop = sidebarBody.scrollTop;
            
            requestAnimationFrame(() => {
                isSyncingScroll = false;
            });
        }, { passive: true });
    };

    /**
     * 绑定时间轴视图切换菜单事件
     */
    GanttChart.prototype.attachTimelineViewMenu = function() {
        const headerWrapper = document.getElementById('ganttTimelineHeaderWrapper');
        const viewMenu = document.getElementById('timelineViewMenu');
        
        if (!headerWrapper || !viewMenu) return;

        let menuTimer = null;

        headerWrapper.addEventListener('mouseenter', (e) => {
            clearTimeout(menuTimer);
            menuTimer = setTimeout(() => {
                viewMenu.classList.add('show');
            }, 300);
        });

        headerWrapper.addEventListener('mouseleave', (e) => {
            clearTimeout(menuTimer);
            menuTimer = setTimeout(() => {
                if (!viewMenu.matches(':hover')) {
                    viewMenu.classList.remove('show');
                }
            }, 200);
        });

        viewMenu.addEventListener('mouseenter', () => {
            clearTimeout(menuTimer);
        });

        viewMenu.addEventListener('mouseleave', () => {
            menuTimer = setTimeout(() => {
                viewMenu.classList.remove('show');
            }, 200);
        });

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
                    
                    const scaleNames = { 'day': '日', 'week': '周', 'month': '月' };
                    if (typeof addLog === 'function') addLog(`✅ 已切换到${scaleNames[scale]}视图`);
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
        if (this._mouseMoveHandler) {
            document.removeEventListener('mousemove', this._mouseMoveHandler);
        }
        if (this._mouseUpHandler) {
            document.removeEventListener('mouseup', this._mouseUpHandler);
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.tasks = null;
        this.container = null;
        this._cachedElements = null;
        this._dateCache = null;
        console.log('GanttChart instance destroyed');
    };

    console.log('✅ gantt-render.js loaded successfully (Epsilon25 - 完整渲染逻辑)');

})();