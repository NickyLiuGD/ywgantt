// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块                                                ▓▓
// ▓▓ 路径: js/app/app-controls.js                                   ▓▓
// ▓▓ 版本: Delta8 - 添加全貌视图按钮                                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    const today = new Date();

    // 添加任务
    const addTaskBtn = document.getElementById('addTask');
    if (addTaskBtn) {
        addTaskBtn.onclick = () => {
            const newTask = {
                id: generateId(),
                name: '新任务',
                start: formatDate(today),
                end: formatDate(addDays(today, 3)),
                progress: 0,
                dependencies: []
            };
            gantt.addTask(newTask);
            gantt.selectTask(newTask.id);
            addLog('✅ 已添加新任务');
        };
    }

    // 删除任务
    const deleteTaskBtn = document.getElementById('deleteTask');
    if (deleteTaskBtn) {
        deleteTaskBtn.onclick = () => {
            const task = gantt.getSelectedTask();
            if (task && confirm(`确定删除任务 "${task.name}"?`)) {
                gantt.deleteTask(task.id);
                addLog(`✅ 已删除任务 "${task.name}"`);
            } else if (!task) {
                alert('请先选择一个任务');
            }
        };
    }

    // 导出文件
    const saveDataBtn = document.getElementById('saveData');
    if (saveDataBtn) {
        saveDataBtn.onclick = () => {
            const filename = `gantt-${formatDate(new Date()).replace(/-/g, '')}.json`;
            downloadJSON(gantt.tasks, filename);
            addLog(`✅ 已导出文件：${filename}`);
        };
    }

    // 加载文件
    const loadDataBtn = document.getElementById('loadData');
    if (loadDataBtn) {
        loadDataBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const tasks = JSON.parse(ev.target.result);
                        if (!Array.isArray(tasks)) {
                            alert('文件格式错误：期望JSON数组');
                            return;
                        }
                        tasks.forEach(t => {
                            t.id = t.id || generateId();
                            if (!t.dependencies) t.dependencies = [];
                        });
                        gantt.tasks = tasks;
                        gantt.calculateDateRange();
                        gantt.render();
                        addLog(`✅ 已从 ${file.name} 加载 ${tasks.length} 个任务`);
                    } catch (err) {
                        console.error('Load error:', err);
                        alert('加载失败：' + err.message);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        };
    }

    // 冲突检测
    const checkConflictsBtn = document.getElementById('checkConflicts');
    if (checkConflictsBtn) {
        checkConflictsBtn.onclick = () => gantt.checkConflicts();
    }

    // 自动修复
    const autoFixBtn = document.getElementById('autoFixConflicts');
    if (autoFixBtn) {
        autoFixBtn.onclick = () => gantt.autoFixConflicts();
    }

    // 清除高亮
    const clearHighlightsBtn = document.getElementById('clearHighlights');
    if (clearHighlightsBtn) {
        clearHighlightsBtn.onclick = () => gantt.clearConflictHighlights();
    }

    // ⭐ 时间刻度切换
    const timeScaleDayBtn = document.getElementById('timeScaleDay');
    const timeScaleWeekBtn = document.getElementById('timeScaleWeek');
    const timeScaleMonthBtn = document.getElementById('timeScaleMonth');

    if (timeScaleDayBtn) {
        timeScaleDayBtn.onclick = () => {
            gantt.options.isOverviewMode = false;
            gantt.options.timeScale = 'day';
            gantt.options.cellWidth = getRecommendedCellWidth('day');
            gantt.calculateDateRange();
            gantt.render();
            addLog('✅ 已切换到日视图');
            updateTimeScaleButtons('day');
        };
    }

    if (timeScaleWeekBtn) {
        timeScaleWeekBtn.onclick = () => {
            gantt.options.isOverviewMode = false;
            gantt.options.timeScale = 'week';
            gantt.options.cellWidth = getRecommendedCellWidth('week');
            gantt.calculateDateRange();
            gantt.render();
            addLog('✅ 已切换到周视图');
            updateTimeScaleButtons('week');
        };
    }

    if (timeScaleMonthBtn) {
        timeScaleMonthBtn.onclick = () => {
            gantt.options.isOverviewMode = false;
            gantt.options.timeScale = 'month';
            gantt.options.cellWidth = getRecommendedCellWidth('month');
            gantt.calculateDateRange();
            gantt.render();
            addLog('✅ 已切换到月视图');
            updateTimeScaleButtons('month');
        };
    }

    /**
     * 更新时间刻度按钮的激活状态
     * @param {string} activeScale - 当前激活的刻度
     */
    function updateTimeScaleButtons(activeScale) {
        const buttons = {
            'day': timeScaleDayBtn,
            'week': timeScaleWeekBtn,
            'month': timeScaleMonthBtn
        };
        
        Object.keys(buttons).forEach(scale => {
            const btn = buttons[scale];
            if (btn) {
                if (scale === activeScale) {
                    btn.classList.add('active');
                    btn.style.background = 'rgba(102, 126, 234, 0.2)';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = '';
                }
            }
        });
    }

    // 初始化按钮状态
    updateTimeScaleButtons('day');

    // 工具栏悬停展开
    const toolbarCollapsed = document.getElementById('toolbarCollapsed');
    const toolbarExpanded = document.getElementById('floatingToolbarExpanded');
    let toolbarHoverTimer = null;
    let toolbarLeaveTimer = null;

    if (toolbarCollapsed && toolbarExpanded) {
        toolbarCollapsed.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
            toolbarHoverTimer = setTimeout(() => {
                toolbarExpanded.classList.add('active');
                addLog('✅ 工具栏已展开');
            }, 150);
        });

        toolbarCollapsed.addEventListener('mouseleave', () => {
            clearTimeout(toolbarHoverTimer);
            toolbarLeaveTimer = setTimeout(() => {
                if (!toolbarExpanded.matches(':hover')) {
                    toolbarExpanded.classList.remove('active');
                    addLog('✅ 工具栏已收起');
                }
            }, 200);
        });

        toolbarExpanded.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
        });

        toolbarExpanded.addEventListener('mouseleave', () => {
            toolbarLeaveTimer = setTimeout(() => {
                toolbarExpanded.classList.remove('active');
                addLog('✅ 工具栏已收起');
            }, 300);
        });
    }

    // ⭐ 修改所有数据操作，添加 PERT 刷新

    // 加载文件后刷新
    const originalLoadHandler = loadDataBtn?.onclick;
    if (loadDataBtn) {
        loadDataBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const tasks = JSON.parse(ev.target.result);
                        if (!Array.isArray(tasks)) {
                            alert('文件格式错误');
                            return;
                        }
                        tasks.forEach(t => {
                            t.id = t.id || generateId();
                            if (!t.dependencies) t.dependencies = [];
                        });
                        
                        gantt.tasks = tasks;
                        gantt.calculateDateRange();
                        gantt.render();
                        
                        // ⭐ 刷新 PERT
                        if (typeof refreshPertView === 'function') {
                            refreshPertView();
                        }
                        
                        addLog(`✅ 已加载 ${tasks.length} 个任务`);
                    } catch (err) {
                        alert('加载失败：' + err.message);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        };
    }

    console.log('✅ app-controls.js loaded successfully (Delta8 - 全貌视图)');

})();
