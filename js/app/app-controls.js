// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块                                                ▓▓
// ▓▓ 路径: js/app/app-controls.js                                   ▓▓
// ▓▓ 版本: Epsilon16 - UI重构版（精简工具栏+独立文件操作）          ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    const today = new Date();

    // ==================== 添加任务 ====================
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

    // ==================== 保存到云端 ====================
    const saveDataBtn = document.getElementById('saveData');
    if (saveDataBtn) {
        saveDataBtn.onclick = async () => {
            const exportTemplate = confirm(
                '选择导出格式：\n\n' +
                '✅ 确定 → JSON模板格式（包含项目信息）\n' +
                '❌ 取消 → 简单格式（仅任务数据）'
            );
            
            // 让用户输入文件名
            const defaultName = `gantt-${formatDate(new Date()).replace(/-/g, '')}`;
            const userFilename = prompt('请输入文件名（不含.json）:', defaultName);
            
            if (!userFilename) {
                addLog('❌ 已取消保存');
                return;
            }
            
            const filename = userFilename.endsWith('.json') ? userFilename : `${userFilename}.json`;
            
            let jsonData;
            if (exportTemplate) {
                const baseDate = new Date();
                jsonData = convertTasksToTemplate(gantt.tasks, baseDate);
            } else {
                jsonData = gantt.tasks;
            }
            
            // 保存到 KV
            try {
                saveDataBtn.disabled = true;
                const btnIcon = saveDataBtn.querySelector('.btn-icon');
                const btnText = saveDataBtn.querySelector('.btn-text');
                
                if (btnIcon) btnIcon.textContent = '⏳';
                if (btnText) btnText.textContent = '保存中...';
                
                await saveToKV(filename, jsonData);
                
                addLog(`✅ 已保存到云端：${filename}`);
                alert(`✅ 保存成功！\n\n文件名：${filename}\n\n可通过"加载文件"按钮读取`);
                
            } catch (error) {
                console.error('保存失败:', error);
                addLog(`❌ 云端保存失败：${error.message}`);
                
                // 降级：下载到本地
                if (confirm('云端保存失败，是否下载到本地？')) {
                    downloadJSON(jsonData, filename);
                    addLog(`✅ 已下载到本地：${filename}`);
                }
                
            } finally {
                saveDataBtn.disabled = false;
                const btnIcon = saveDataBtn.querySelector('.btn-icon');
                const btnText = saveDataBtn.querySelector('.btn-text');
                if (btnIcon) btnIcon.textContent = '💾';
                if (btnText) btnText.textContent = '导出文件';
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
                durationType: task.durationType || 'days',
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

    // ==================== 从云端加载 ====================
    const loadDataBtn = document.getElementById('loadData');
    if (loadDataBtn) {
        loadDataBtn.onclick = async () => {
            try {
                loadDataBtn.disabled = true;
                const btnIcon = loadDataBtn.querySelector('.btn-icon');
                const btnText = loadDataBtn.querySelector('.btn-text');
                
                if (btnIcon) btnIcon.textContent = '⏳';
                if (btnText) btnText.textContent = '加载中...';
                
                // 获取文件列表
                const files = await listKVFiles();
                
                if (!files || files.length === 0) {
                    throw new Error('云端暂无文件');
                }
                
                // 生成文件选择列表
                const fileList = files.map((file, i) => {
                    const date = new Date(file.timestamp).toLocaleString('zh-CN');
                    const size = `${(file.size / 1024).toFixed(1)}KB`;
                    const tasks = file.taskCount > 0 ? `${file.taskCount}个任务` : '';
                    return `${i + 1}. ${file.name}\n   ${date} | ${size} ${tasks ? '| ' + tasks : ''}`;
                }).join('\n\n');
                
                const choice = prompt(
                    `📁 云端文件列表（共${files.length}个）：\n\n${fileList}\n\n` +
                    `请输入序号（1-${files.length}），或输入 0 从本地加载`,
                    '1'
                );
                
                if (!choice) {
                    addLog('❌ 已取消加载');
                    return;
                }
                
                const index = parseInt(choice) - 1;
                
                // 从本地加载
                if (index === -1) {
                    loadFromLocalFile();
                    return;
                }
                
                if (index < 0 || index >= files.length) {
                    alert('❌ 无效的序号');
                    return;
                }
                
                const selectedFile = files[index];
                
                // 从 KV 加载
                const data = await loadFromKV(selectedFile.name);
                
                const tasks = Array.isArray(data) ? data : data.tasks;
                
                if (!Array.isArray(tasks)) {
                    throw new Error('数据格式错误');
                }
                
                // 补全任务数据
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
                
                addLog(`✅ 已从云端加载：${selectedFile.name}（${tasks.length} 个任务）`);
                
            } catch (error) {
                console.error('加载失败:', error);
                addLog(`❌ 云端加载失败：${error.message}`);
                
                if (confirm('云端加载失败，是否从本地文件加载？')) {
                    loadFromLocalFile();
                }
                
            } finally {
                loadDataBtn.disabled = false;
                const btnIcon = loadDataBtn.querySelector('.btn-icon');
                const btnText = loadDataBtn.querySelector('.btn-text');
                if (btnIcon) btnIcon.textContent = '📂';
                if (btnText) btnText.textContent = '加载文件';
            }
        };
    }

    /**
     * 从本地文件加载（降级方案）
     */
    function loadFromLocalFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    const tasks = Array.isArray(data) ? data : data.tasks;
                    
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
                    
                    addLog(`✅ 已从本地加载：${file.name}（${tasks.length} 个任务）`);
                } catch (err) {
                    console.error('Load error:', err);
                    alert('加载失败：' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
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

// 在 app-controls.js 中添加以下逻辑

    // ==================== ⭐ 新增：一键云保存 (快捷保存) ====================
    const quickSaveBtn = document.getElementById('quickCloudSave');
    if (quickSaveBtn) {
        quickSaveBtn.onclick = async () => {
            const now = new Date();
            // 生成时间戳文件名: Project_2025-11-24_14-30-05.json
            const dateStr = formatDate(now);
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `Project_${dateStr}_${timeStr}.json`;

            // 准备数据 (使用模板格式以包含项目信息)
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
                const btnIcon = quickSaveBtn.querySelector('.btn-icon');
                const originalIcon = btnIcon.textContent;
                btnIcon.textContent = '⏳';

                // 调用 KV 存储接口
                await saveToKV(filename, jsonData);

                addLog(`✅ 云端保存成功：${filename}`);
                
                // 短暂的成功提示
                btnIcon.textContent = '✅';
                setTimeout(() => {
                    btnIcon.textContent = originalIcon;
                    quickSaveBtn.disabled = false;
                }, 1500);

            } catch (error) {
                console.error('云保存失败:', error);
                addLog(`❌ 云保存失败：${error.message}`);
                alert(`保存失败: ${error.message}`);
                
                quickSaveBtn.disabled = false;
                quickSaveBtn.querySelector('.btn-icon').textContent = '☁️';
            }
        };
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

    console.log('✅ app-controls.js loaded successfully (Epsilon16 - UI重构版)');

})();
