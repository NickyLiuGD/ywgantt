// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块                                                ▓▓
// ▓▓ 路径: js/app/app-controls.js                                   ▓▓
// ▓▓ 版本: Gamma8                                                   ▓▓
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

    console.log('✅ app-controls.js loaded successfully');

})();
