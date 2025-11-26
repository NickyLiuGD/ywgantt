// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图渲染模块                                                  ▓▓
// ▓▓ 路径: js/gantt/gantt-render.js                                 ▓▓
// ▓▓ 版本: Epsilon35-Decompressed - 逻辑完整还原版                  ▓▓
// ▓▓ 特性: 零延迟同步 + 完整HTML构建 + 详细注释                     ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 渲染甘特图（主入口）
     * 负责 DOM 结构的生成、样式的应用及核心事件的绑定
     */
    GanttChart.prototype.render = function() {
        if (!this.container) {
            console.error('GanttChart: Container not found, cannot render');
            return;
        }

        console.log('🎨 开始渲染甘特图...');

        const dates = this.generateDates();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

        // 1. 计算精确的总宽度 (避免浮点数累积误差导致上下宽度不一致)
        const totalWidth = calculateTotalWidth(dates, this.options.cellWidth);

        // 2. 记录当前滚动位置，以便重新渲染后恢复
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        const prevScrollTop = rowsContainer ? rowsContainer.scrollTop : 0;
        const prevScrollLeft = rowsContainer ? rowsContainer.scrollLeft : 0;
        
        // 3. 构建基础 HTML 结构
        // 显式设置 gantt-timeline-header 和 gantt-rows 的宽度，确保对齐
        const html = `
            <div class="gantt-wrapper">
                <!-- 左侧：任务名称栏 -->
                <div class="gantt-sidebar" id="ganttSidebar">
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

                <!-- 右侧：时间轴与任务条 -->
                <div class="gantt-timeline-wrapper">
                    <div class="gantt-timeline">
                        <!-- 时间轴表头 -->
                        <div class="gantt-timeline-header-wrapper" id="ganttTimelineHeaderWrapper">
                            <div class="gantt-timeline-header" id="ganttTimelineHeader">
                                <div style="width: ${totalWidth}px; height: 100%; display: flex;">
                                    ${this.renderDateHeaders(dates, weekdays)}
                                </div>
                            </div>
                            
                            <!-- 悬停视图切换菜单 -->
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

                        <!-- 任务行容器 -->
                        <div class="gantt-rows-container" id="ganttRowsContainer">
                            <div class="gantt-rows" style="width: ${totalWidth}px;">
                                ${this.renderTaskRows(dates)}
                            </div>
                            <!-- 依赖关系 SVG 层 -->
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
            // 立即同步表头位置
            if (newHeader) newHeader.scrollLeft = prevScrollLeft;
        }

        // 5. 绑定交互功能模块
        this.attachSidebarResize();
        this.setupScrollSync(); // ⭐ 使用零延迟同步
        
        // 6. 渲染依赖关系箭头
        // 获取可见任务并应用过滤
        const visibleTasks = typeof getVisibleTasks === 'function' ? getVisibleTasks(this.tasks) : this.tasks;
        const filteredTasks = this.options.hideCompleted ? 
            visibleTasks.filter(t => t.progress < 100) : 
            visibleTasks;

        this.renderDependencies(dates, filteredTasks);
        
        // 7. 绑定事件监听器
        this.attachEvents();
        this.attachQuickMenus();
        
        // 延迟绑定视图菜单，确保 DOM 就绪
        setTimeout(() => {
            this.attachTimelineViewMenu();
        }, 100);

        // 更新整体高度
        this.updateHeight();
    };

    /**
     * 递归检查任务是否应该隐藏 (处理多级折叠)
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
        };

        handle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    /**
     * 渲染左侧任务名称列表
     */
    GanttChart.prototype.renderTaskNames = function() {
        return this.tasks.map(task => {
            if (!task || !task.id) return '';
            
            // 检查折叠状态
            if (this.isTaskHidden(task)) return '';
            
            // 检查隐藏已完成选项
            if (this.options.hideCompleted && task.progress >= 100) return '';

            // 判断任务就绪状态 (无依赖或依赖已完成)
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

            // 样式类构建
            const classes = ['gantt-task-name'];
            if (this.selectedTask === task.id) classes.push('selected');
            if (task.isSummary) classes.push('summary-task');
            if (task.isMilestone) classes.push('milestone-task');
            if (isReady) classes.push('task-ready');

            const outlineLevel = task.outlineLevel || 1;
            const indent = '　'.repeat(outlineLevel - 1);
            const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
            const wbsPrefix = task.wbs ? `<span class="wbs-badge">[${task.wbs}]</span> ` : '';
            
            // 折叠按钮
            const collapseBtn = (task.isSummary && task.children && task.children.length > 0) ? 
                `<span class="task-collapse-btn" data-task-id="${task.id}" title="${task.isCollapsed ? '展开' : '折叠'}子任务">
                    ${task.isCollapsed ? '▶' : '▼'}
                </span>` : '';

            return `
                <div class="${classes.join(' ')}" 
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
     * 渲染时间轴表头
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
     * 渲染单个任务行 (包含任务条、里程碑、标签)
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

        // 标签文本
        const startTimeLabel = typeof formatDate === 'function' ? formatDate(start) : '';
        const endTimeLabel = typeof formatDate === 'function' ? formatDate(end) : '';

        // 显示名称构建
        const outlineLevel = task.outlineLevel || 1;
        const indent = '　'.repeat(outlineLevel - 1);
        const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
        const wbsPrefix = task.wbs ? `[${task.wbs}] ` : '';
        const displayName = `${indent}${icon} ${wbsPrefix}${task.name}`;

        // 属性准备
        const priorityAttr = task.priority ? `data-priority="${task.priority}"` : '';
        const durationType = task.durationType || 'days';
        const durationTypeAttr = `data-duration-type="${durationType}"`;
        const durationTypeIcon = durationType === 'workdays' ? '💼' : '📅';

        // 折叠按钮 (右侧)
        const collapseToggle = (task.isSummary && task.children && task.children.length > 0) ? 
            `<span class="collapse-toggle" data-task-id="${task.id}" title="${task.isCollapsed ? '展开' : '折叠'}子任务">
                ${task.isCollapsed ? '▶' : '▼'}
            </span>` : '';

        // 类名构建
        let barClasses = ['gantt-bar'];
        if (task.isSummary) barClasses.push('gantt-bar-summary');
        if (isSelected) barClasses.push('selected');
        if (isCompleted) barClasses.push('locked');

        let labelStartClasses = ['gantt-bar-label-start'];
        if (isSelected) labelStartClasses.push('selected');

        let labelExtClasses = ['gantt-bar-label-external'];
        if (isSelected) labelExtClasses.push('selected');

        // 构建 HTML
        return `
            <div class="gantt-row ${task.isSummary ? 'gantt-row-summary' : ''}" role="row">
                ${this.renderCells(dates)}
                
                <!-- 左侧双层时间标签 -->
                <div class="${labelStartClasses.join(' ')}" 
                     data-task-id="${task.id}"
                     style="right: calc(100% - ${left}px + 8px);">
                    <div class="time-label-row time-start">${this.escapeHtml(startTimeLabel)}</div>
                    <div class="time-label-row time-end">
                        ${this.escapeHtml(endTimeLabel)}
                        ${!task.isMilestone && !task.isSummary ? `<span class="duration-type-icon">${durationTypeIcon}</span>` : ''}
                    </div>
                </div>
                
                <!-- 任务条 / 里程碑 -->
                ${task.isMilestone ? `
                    <div class="gantt-milestone ${isSelected ? 'selected' : ''} ${isCompleted ? 'locked' : ''}" 
                         data-task-id="${task.id}" style="left: ${left}px;">
                        <div class="milestone-diamond"><span class="milestone-icon">🎯</span></div>
                    </div>
                ` : `
                    <div class="${barClasses.join(' ')}" 
                         data-task-id="${task.id}" ${priorityAttr} ${durationTypeAttr}
                         style="left: ${left}px; width: ${width}px;"
                         ${isCompleted ? 'title="已完成 (100%) - 锁定"' : ''}>
                        <div class="gantt-bar-progress" style="width: ${progress}%"></div>
                        
                        <!-- 拖拽手柄 (未完成且非汇总任务) -->
                        ${this.options.enableResize && !task.isSummary && !isCompleted ? `
                            <div class="gantt-bar-handle left"></div>
                            <div class="gantt-bar-handle right"></div>
                        ` : ''}
                    </div>
                `}
                
                <!-- 右侧标签 -->
                <div class="${labelExtClasses.join(' ')}" 
                     data-task-id="${task.id}" style="left: ${left + width + 8}px;">
                    ${this.escapeHtml(displayName)} 
                    ${!task.isMilestone ? `<span class="task-progress-badge" style="${isCompleted ? 'background:#10b981;color:white;' : ''}">${progress}%</span>` : ''}
                    ${collapseToggle}
                </div>
            </div>
        `;
    };

    /**
     * 渲染背景网格单元格
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
     * ⭐⭐⭐ 零延迟同步滚动 (硬核同步版) ⭐⭐⭐
     * 移除 requestAnimationFrame，消除缩放时的标尺错位
     */
    GanttChart.prototype.setupScrollSync = function() {
        const sidebarBody = document.getElementById('ganttSidebarBody');
        const rowsContainer = document.getElementById('ganttRowsContainer');
        const timelineHeader = document.getElementById('ganttTimelineHeader');

        if (!sidebarBody || !rowsContainer || !timelineHeader) return;

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
     * 绑定时间轴视图切换菜单
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

    console.log('✅ gantt-render.js loaded successfully (Epsilon35-Decompressed)');

})();