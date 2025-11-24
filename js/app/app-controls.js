// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块 (精简版)                                        ▓▓
// ▓▓ 路径: js/app/app-controls.js                                    ▓▓
// ▓▓ 版本: Epsilon25                                                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    const today = new Date();

    // ==================== 1. 添加任务 ====================
    const addTaskBtn = document.getElementById('addTask');
    if (addTaskBtn) {
        addTaskBtn.onclick = () => {
            const newTask = {
                id: generateId(),
                name: '新任务',
                start: formatDate(today),
                duration: 1,
                durationType: 'days',
                progress: 0,
                dependencies: [],
                isMilestone: false,
                isSummary: false,
                priority: 'medium',
                outlineLevel: 1
            };
            gantt.addTask(newTask);
            gantt.selectTask(newTask.id);
            addLog('✅ 已添加新任务');
        };
    }

    // ==================== 2. 快捷云保存 ====================
    const quickSaveBtn = document.getElementById('quickCloudSave');
    if (quickSaveBtn) {
        quickSaveBtn.onclick = async () => {
            const now = new Date();
            const dateStr = formatDate(now);
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `Project_${dateStr}_${timeStr}.json`;

            const jsonData = {
                project: {
                    name: "项目快照",
                    updated: now.getTime()
                },
                tasks: gantt.tasks
            };

            try {
                quickSaveBtn.disabled = true;
                const icon = quickSaveBtn.querySelector('.btn-icon');
                const original = icon.textContent;
                icon.textContent = '⏳';

                await saveToKV(filename, jsonData);
                addLog(`✅ 云端保存成功：${filename}`);
                
                icon.textContent = '✅';
                setTimeout(() => { icon.textContent = original; quickSaveBtn.disabled = false; }, 1500);
            } catch (error) {
                alert(`保存失败: ${error.message}`);
                quickSaveBtn.disabled = false;
            }
        };
    }

    // ==================== 3. 智能工具 ====================
    const checkConflictsBtn = document.getElementById('checkConflicts');
    if (checkConflictsBtn) checkConflictsBtn.onclick = () => gantt.checkConflicts();

    const autoFixBtn = document.getElementById('autoFixConflicts');
    if (autoFixBtn) autoFixBtn.onclick = () => gantt.autoFixConflicts();

    const clearHighlightsBtn = document.getElementById('clearHighlights');
    if (clearHighlightsBtn) clearHighlightsBtn.onclick = () => gantt.clearConflictHighlights();

    // ==================== 4. 工具栏交互 ====================
    const toolbarCollapsed = document.getElementById('toolbarCollapsed');
    const toolbarExpanded = document.getElementById('floatingToolbarExpanded');
    let toolbarHoverTimer, toolbarLeaveTimer;

    if (toolbarCollapsed && toolbarExpanded) {
        toolbarCollapsed.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
            toolbarHoverTimer = setTimeout(() => toolbarExpanded.classList.add('active'), 150);
        });
        toolbarCollapsed.addEventListener('mouseleave', () => {
            clearTimeout(toolbarHoverTimer);
            toolbarLeaveTimer = setTimeout(() => {
                if (!toolbarExpanded.matches(':hover')) toolbarExpanded.classList.remove('active');
            }, 200);
        });
        toolbarExpanded.addEventListener('mouseenter', () => clearTimeout(toolbarLeaveTimer));
        toolbarExpanded.addEventListener('mouseleave', () => {
            toolbarLeaveTimer = setTimeout(() => toolbarExpanded.classList.remove('active'), 300);
        });
    }

    console.log('✅ app-controls.js loaded (Epsilon25)');
})();