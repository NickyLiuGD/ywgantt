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

    // ==================== 导出文件（支持模板格式） ====================
    const saveDataBtn = document.getElementById('saveData');
    if (saveDataBtn) {
        saveDataBtn.onclick = () => {
            // 询问导出格式
            const exportTemplate = confirm(
                '选择导出格式：\n\n' +
                '✅ 确定 → JSON模板格式（包含项目信息，使用时间偏移）\n' +
                '❌ 取消 → 简单格式（仅任务数据，绝对日期）'
            );
            
            const timestamp = formatDate(new Date()).replace(/-/g, '');
            
            if (exportTemplate) {
                // 导出为JSON模板格式
                const baseDate = new Date();
                const jsonData = convertTasksToTemplate(gantt.tasks, baseDate);
                const filename = `gantt-template-${timestamp}.json`;
                downloadJSON(jsonData, filename);
                addLog(`✅ 已导出JSON模板：${filename}`);
            } else {
                // 导出为简单格式
                const filename = `gantt-${timestamp}.json`;
                downloadJSON(gantt.tasks, filename);
                addLog(`✅ 已导出简单格式：${filename}`);
            }
        };
    }

    /**
     * 将任务转换为JSON模板格式
     */
    function convertTasksToTemplate(tasks, baseDate) {
        const idToUidMap = {};
        
        const jsonTasks = tasks.map(task => {
            idToUidMap[task.id] = task.uid;
            
            const startDate = new Date(task.start);
            const startOffset = daysBetween(baseDate, startDate);
            
            return {
                uid: task.uid,
                name: task.name,
                startOffset: startOffset,
                duration: task.duration || 0,
                progress: task.progress || 0,
                isMilestone: task.isMilestone || false,
                isSummary: task.isSummary || false,
                parentId: task.parentId ? `temp-parent-${idToUidMap[task.parentId]}` : null,
                children: (task.children || []).map(cid => `temp-child-${idToUidMap[cid]}`),
                outlineLevel: task.outlineLevel || 1,
                wbs: task.wbs || '',
                priority: task.priority || 'medium',
                notes: task.notes || '',
                isCollapsed: task.isCollapsed || false,
                dependencies: (task.dependencies || []).map(dep => {
                    const depId = typeof dep === 'string' ? dep : dep.taskId;
                    return {
                        taskUid: idToUidMap[depId],
                        type: dep.type || 'FS',
                        lag: dep.lag || 0
                    };
                })
            };
        });
        
        return {
            project: {
                name: "导出的项目",
                version: "1.0",
                description: `导出于 ${formatDate(baseDate)}`,
                createdDate: new Date().toISOString()
            },
            tasks: jsonTasks
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

                        if (typeof refreshPertViewIfActive === 'function') {
                            refreshPertViewIfActive();
                        }
                        
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

    console.log('✅ app-controls.js loaded successfully (Delta8 - 全貌视图)');

})();
