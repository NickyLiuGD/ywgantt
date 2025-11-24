// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块 (精简版)                                        ▓▓
// ▓▓ 路径: js/app/app-controls.js                                    ▓▓
// ▓▓ 版本: Epsilon24 - 移除了冗余功能                                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    const today = new Date();

    // ==================== 1. 添加任务 ====================
    const addTaskBtn = document.getElementById('addTask');
    if (addTaskBtn) {
        addTaskBtn.onclick = () => {
            // 构造完整的初始任务对象
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
                outlineLevel: 1,
                priority: 'medium'
            };
            
            // 调用核心方法
            gantt.addTask(newTask);
            
            // 选中并居中
            gantt.selectTask(newTask.id);
            addLog('✅ 已添加新任务');
        };
    }

    // ==================== 2. 快捷云保存 ====================
    const quickSaveBtn = document.getElementById('quickCloudSave');
    if (quickSaveBtn) {
        quickSaveBtn.onclick = async () => {
            const now = new Date();
            
            // 生成时间戳文件名: Project_2025-11-24_14-30-05.json
            const dateStr = formatDate(now);
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `Project_${dateStr}_${timeStr}.json`;

            // 准备数据结构 (包含项目元数据)
            const jsonData = {
                project: {
                    name: "项目快照",
                    version: "1.0",
                    description: `自动保存于 ${dateStr} ${now.toLocaleTimeString()}`,
                    updated: now.getTime()
                },
                tasks: gantt.tasks
            };

            try {
                // UI 状态反馈
                quickSaveBtn.disabled = true;
                const icon = quickSaveBtn.querySelector('.btn-icon');
                const originalIcon = icon.textContent;
                icon.textContent = '⏳';

                // 调用 KV 存储 API
                await saveToKV(filename, jsonData);
                
                addLog(`✅ 云端保存成功：${filename}`);
                
                // 成功提示
                icon.textContent = '✅';
                setTimeout(() => { 
                    icon.textContent = originalIcon; 
                    quickSaveBtn.disabled = false; 
                }, 1500);

            } catch (error) {
                console.error('云保存失败:', error);
                alert(`保存失败: ${error.message}`);
                
                // 恢复状态
                quickSaveBtn.disabled = false;
                quickSaveBtn.querySelector('.btn-icon').textContent = '☁️';
            }
        };
    }

    // ==================== 3. 智能工具 ====================
    
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

    // ==================== 4. 工具栏悬停交互逻辑 ====================
    const toolbarCollapsed = document.getElementById('toolbarCollapsed');
    const toolbarExpanded = document.getElementById('floatingToolbarExpanded');
    let toolbarHoverTimer = null;
    let toolbarLeaveTimer = null;

    if (toolbarCollapsed && toolbarExpanded) {
        // 鼠标进入折叠按钮 -> 展开
        toolbarCollapsed.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
            toolbarHoverTimer = setTimeout(() => {
                toolbarExpanded.classList.add('active');
                // addLog('✅ 工具栏已展开'); // 可选日志
            }, 150);
        });

        // 鼠标离开折叠按钮 -> 准备收起 (除非进入展开区域)
        toolbarCollapsed.addEventListener('mouseleave', () => {
            clearTimeout(toolbarHoverTimer);
            toolbarLeaveTimer = setTimeout(() => {
                if (!toolbarExpanded.matches(':hover')) {
                    toolbarExpanded.classList.remove('active');
                }
            }, 200);
        });

        // 鼠标进入展开区域 -> 保持展开
        toolbarExpanded.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
        });

        // 鼠标离开展开区域 -> 收起
        toolbarExpanded.addEventListener('mouseleave', () => {
            toolbarLeaveTimer = setTimeout(() => {
                toolbarExpanded.classList.remove('active');
            }, 300);
        });
    }

    console.log('✅ app-controls.js loaded successfully (Epsilon24)');
})();