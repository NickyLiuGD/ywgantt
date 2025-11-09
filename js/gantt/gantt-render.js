// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图渲染模块                                                  ▓▓
// ▓▓ 路径: js/gantt/gantt-render.js                                 ▓▓
// ▓▓ 版本: Epsilon5 - 支持里程碑/汇总任务/层级显示                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 渲染甘特图（完整版 + 全貌视图）
     */
    GanttChart.prototype.render = function() {
        if (!this.container) {
            console.error('GanttChart: Container not found, cannot render');
            return;
        }

        const dates = this.generateDates();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const isCollapsed = !this.options.showTaskNames;
        
        const html = `
            <div class="gantt-wrapper">
                <div class="gantt-sidebar ${isCollapsed ? 'collapsed' : ''}">
                    <div class="gantt-sidebar-header">任务名称</div>
                    <div class="gantt-sidebar-body" id="ganttSidebarBody">
                        ${this.renderTaskNames()}
                    </div>
                    <button class="sidebar-toggle-btn" id="sidebarToggleBtn" 
                            title="${isCollapsed ? '展开任务名称栏' : '折叠任务名称栏'}"
                            aria-label="${isCollapsed ? '展开' : '折叠'}任务名称栏">
                        <span class="sidebar-toggle-icon">${isCollapsed ? '▶' : '◀'}</span>
                    </button>
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

        const toggleBtn = document.getElementById('sidebarToggleBtn');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                this.toggleSidebar(isCollapsed);
                this.render();
            };
        }

        this.setupScrollSync();
        this.renderDependencies(dates);
        this.attachEvents();
        this.attachQuickMenus();
        
        setTimeout(() => {
            this.attachTimelineViewMenu();
        }, 100);

        this.updateHeight();
    };

    /**
     * 渲染任务名称列表（⭐ 支持层级和折叠）
     */
    GanttChart.prototype.renderTaskNames = function() {
        return this.tasks.map(task => {
            if (!task || !task.id) return '';
            
            // 跳过折叠的子任务
            if (task.parentId) {
                const parent = this.tasks.find(t => t.id === task.parentId);
                if (parent && parent.isCollapsed) {
                    return '';
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
                            ${task.isMilestone ? 'milestone-task' : ''}" 
                     data-task-id="${task.id}"
                     data-outline-level="${outlineLevel}"
                     role="button"
                     tabindex="0"
                     aria-label="任务: ${this.escapeHtml(task.name)}">
                    ${collapseBtn}
                    <span class="task-name-content">
                        ${indent}${icon} ${wbsPrefix}${this.escapeHtml(task.name)}
                    </span>
                </div>
            `;
        }).join('');
    };

    /**
     * 渲染日期表头（支持不同时间刻度）
     */
    GanttChart.prototype.renderDateHeaders = function(dates, weekdays) {
        const scale = this.options.timeScale || 'day';
        
        return dates.map(dateObj => {
            const date = dateObj.date;
            const isWeekendDay = isWeekend(date) && this.options.showWeekends;
            const isTodayDay = isToday(date);
            const classes = ['gantt-date-cell'];
            
            if (isWeekendDay) classes.push('weekend');
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
                     data-start="${formatDate(dateObj.startDate)}"
                     data-end="${formatDate(dateObj.endDate)}"
                     role="columnheader"
                     aria-label="${formatDate(date)}">
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
     * 渲染单个任务行（⭐ 支持里程碑和汇总任务）
     */
    GanttChart.prototype.renderRow = function(task, dates) {
        if (!task || !task.id) return '';
        
        // 跳过折叠的子任务
        if (task.parentId) {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (parent && parent.isCollapsed) {
                return '';
            }
        }

        const start = new Date(task.start);
        const end = new Date(task.end || task.start);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn(`Invalid date for task: ${task.name}`);
            return '';
        }
        
        const progress = Math.min(Math.max(task.progress || 0, 0), 100);
        const isSelected = this.selectedTask === task.id;
        
        const startDays = daysBetween(this.startDate, start);
        const durationDays = daysBetween(start, end) + 1;
        
        const left = startDays * this.options.cellWidth;
        const width = Math.max(durationDays * this.options.cellWidth, task.isMilestone ? 20 : 30);

        const startTimeLabel = formatDate(start);
        const endTimeLabel = formatDate(end);

        // 任务名称显示
        const outlineLevel = task.outlineLevel || 1;
        const indent = '　'.repeat(outlineLevel - 1);
        const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
        const wbsPrefix = task.wbs ? `[${task.wbs}] ` : '';
        const displayName = `${indent}${icon} ${wbsPrefix}${task.name}`;

        // 优先级标记
        const priorityAttr = task.priority ? `data-priority="${task.priority}"` : '';

        // 折叠按钮（仅汇总任务）
        const collapseToggle = (task.isSummary && task.children && task.children.length > 0) ? 
            `<span class="collapse-toggle" data-task-id="${task.id}" title="${task.isCollapsed ? '展开' : '折叠'}子任务">
                ${task.isCollapsed ? '▶' : '▼'}
            </span>` : '';

        return `
            <div class="gantt-row ${task.isSummary ? 'gantt-row-summary' : ''}" 
                 role="row" 
                 aria-label="任务行: ${this.escapeHtml(task.name)}">
                ${this.renderCells(dates)}
                
                <!-- 左侧双层时间标签 -->
                <div class="gantt-bar-label-start ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}"
                     style="right: calc(100% - ${left}px + 8px);"
                     role="button"
                     tabindex="0"
                     aria-label="时间范围: ${startTimeLabel} 至 ${endTimeLabel}">
                    <div class="time-label-row time-start" title="开始时间">
                        ${this.escapeHtml(startTimeLabel)}
                    </div>
                    <div class="time-label-row time-end" title="结束时间">
                        ${this.escapeHtml(endTimeLabel)}
                    </div>
                </div>
                
                ${task.isMilestone ? `
                    <!-- ⭐ 里程碑菱形 -->
                    <div class="gantt-milestone ${isSelected ? 'selected' : ''}" 
                         data-task-id="${task.id}"
                         style="left: ${left}px;"
                         role="button"
                         tabindex="0"
                         title="${this.escapeHtml(task.name)}">
                        <div class="milestone-diamond">
                            <span class="milestone-icon">🎯</span>
                        </div>
                    </div>
                ` : `
                    <!-- 任务条（普通/汇总） -->
                    <div class="gantt-bar ${task.isSummary ? 'gantt-bar-summary' : ''} ${isSelected ? 'selected' : ''}" 
                         data-task-id="${task.id}"
                         ${priorityAttr}
                         style="left: ${left}px; width: ${width}px;"
                         role="button"
                         tabindex="0"
                         aria-label="任务条: ${this.escapeHtml(task.name)}, 进度: ${progress}%">
                        <div class="gantt-bar-progress" style="width: ${progress}%" aria-hidden="true"></div>
                        ${this.options.enableResize && !task.isSummary ? '<div class="gantt-bar-handle left" role="button" aria-label="调整开始日期"></div>' : ''}
                        ${this.options.enableResize && !task.isSummary ? '<div class="gantt-bar-handle right" role="button" aria-label="调整结束日期"></div>' : ''}
                    </div>
                `}
                
                <!-- 右侧任务名称标签 -->
                <div class="gantt-bar-label-external ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}"
                     style="left: ${left + width + 8}px;"
                     role="button"
                     tabindex="0"
                     aria-label="任务标签: ${this.escapeHtml(task.name)}">
                    ${this.escapeHtml(displayName)} 
                    ${!task.isMilestone ? `<span class="task-progress-badge">${progress}%</span>` : ''}
                    ${collapseToggle}
                </div>
            </div>
        `;
    };

    /**
     * 渲染单元格
     */
    GanttChart.prototype.renderCells = function(dates) {
        const scale = this.options.timeScale || 'day';
        
        return dates.map(dateObj => {
            const date = dateObj.date;
            const isWeekendDay = isWeekend(date) && this.options.showWeekends;
            const isTodayDay = isToday(date);
            const classes = ['gantt-cell'];
            
            if (isWeekendDay) classes.push('weekend');
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

        if (!sidebarBody || !rowsContainer || !timelineHeader) {
            console.warn('GanttChart: Scroll sync elements not found');
            return;
        }

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
        
        if (!headerWrapper || !viewMenu) {
            console.warn('Timeline view menu elements not found');
            return;
        }

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
                    this.options.cellWidth = getRecommendedCellWidth(scale);
                    this.calculateDateRange();
                    this.render();
                    
                    const scaleNames = { 'day': '日', 'week': '周', 'month': '月' };
                    addLog(`✅ 已切换到${scaleNames[scale]}视图`);
                }
                
                viewMenu.classList.remove('show');
            };
        });

        console.log('✅ 时间轴视图菜单事件已绑定');
    };

    console.log('✅ gantt-render.js loaded successfully (Epsilon5 - 层级任务支持)');

})();
