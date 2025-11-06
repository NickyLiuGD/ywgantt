// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图渲染模块                                                  ▓▓
// ▓▓ 路径: js/gantt/gantt-render.js                                 ▓▓
// ▓▓ 版本: Gamma11                                                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 渲染甘特图（完整版）
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
                        <div class="gantt-timeline-header" id="ganttTimelineHeader">
                            ${this.renderDateHeaders(dates, weekdays)}
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
        
        this.updateHeight();
    };

    /**
     * 渲染任务名称列表
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderTaskNames = function() {
        return this.tasks.map(task => `
            <div class="gantt-task-name ${this.selectedTask === task.id ? 'selected' : ''}" 
                 data-task-id="${task.id}"
                 role="button"
                 tabindex="0"
                 aria-label="任务: ${this.escapeHtml(task.name)}">
                ${this.escapeHtml(task.name)}
            </div>
        `).join('');
    };

    /**
     * 渲染日期表头
     * @param {Array<Date>} dates - 日期数组
     * @param {Array<string>} weekdays - 星期名称数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderDateHeaders = function(dates, weekdays) {
        return dates.map(date => {
            const isWeekendDay = isWeekend(date) && this.options.showWeekends;
            const isTodayDay = isToday(date);
            const classes = ['gantt-date-cell'];
            
            if (isWeekendDay) classes.push('weekend');
            if (isTodayDay) classes.push('today');
            
            return `
                <div class="${classes.join(' ')}" 
                     style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;"
                     role="columnheader"
                     aria-label="${formatDate(date)}">
                    <div class="gantt-date-day">${date.getDate()}</div>
                    <div class="gantt-date-weekday">${weekdays[date.getDay()]}</div>
                </div>
            `;
        }).join('');
    };

    /**
     * 渲染所有任务行
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderTaskRows = function(dates) {
        return this.tasks.map(task => this.renderRow(task, dates)).join('');
    };

    /**
     * 渲染单个任务行
     * @param {Object} task - 任务对象
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderRow = function(task, dates) {
        const start = new Date(task.start);
        const end = new Date(task.end || task.start);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn(`Invalid date for task: ${task.name}`);
            return '';
        }
        
        const startOffset = daysBetween(this.startDate, start);
        const duration = daysBetween(start, end) + 1;
        
        const left = startOffset * this.options.cellWidth;
        const width = Math.max(duration * this.options.cellWidth, 60);
        const progress = Math.min(Math.max(task.progress || 0, 0), 100);

        const isSelected = this.selectedTask === task.id;

        return `
            <div class="gantt-row" role="row" aria-label="任务行: ${this.escapeHtml(task.name)}">
                ${this.renderCells(dates)}
                <div class="gantt-bar ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}"
                     style="left: ${left}px; width: ${width}px;"
                     role="button"
                     tabindex="0"
                     aria-label="任务条: ${this.escapeHtml(task.name)}, 进度: ${progress}%">
                    <div class="gantt-bar-progress" style="width: ${progress}%" aria-hidden="true"></div>
                    ${this.options.enableResize ? '<div class="gantt-bar-handle left" role="button" aria-label="调整开始日期"></div>' : ''}
                    ${this.options.enableResize ? '<div class="gantt-bar-handle right" role="button" aria-label="调整结束日期"></div>' : ''}
                </div>
                <div class="gantt-bar-label-external ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}"
                     style="left: ${left + width + 8}px;"
                     role="button"
                     tabindex="0"
                     aria-label="任务标签: ${this.escapeHtml(task.name)}">
                    ${this.escapeHtml(task.name)} (${progress}%)
                </div>
            </div>
        `;
    };

    /**
     * 渲染单元格
     * @param {Array<Date>} dates - 日期数组
     * @returns {string} HTML字符串
     */
    GanttChart.prototype.renderCells = function(dates) {
        return dates.map(date => {
            const isWeekendDay = isWeekend(date) && this.options.showWeekends;
            const isTodayDay = isToday(date);
            const classes = ['gantt-cell'];
            
            if (isWeekendDay) classes.push('weekend');
            if (isTodayDay) classes.push('today');
            
            return `
                <div class="${classes.join(' ')}" 
                     style="width: ${this.options.cellWidth}px; min-width: ${this.options.cellWidth}px;"
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

    console.log('✅ gantt-render.js loaded successfully');

})();
