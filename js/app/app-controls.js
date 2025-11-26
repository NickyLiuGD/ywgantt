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

    // ==================== ⭐ 新增：顶部导航栏事件 ====================

    // 1. 新建项目
    const btnNewProject = document.getElementById('btnNewProject');
    if (btnNewProject) {
        btnNewProject.onclick = () => {
            if (confirm('确定要新建项目吗？当前未保存的内容将会丢失。')) {
                // 清空数据
                const emptyProject = {
                    project: { name: "新项目", version: "1.0" },
                    tasks: []
                };
                // 重新初始化（假设 app-init.js 里有暴露，或者直接刷新页面）
                // 这里简单处理：重置 gantt 实例
                gantt.tasks = [];
                gantt.calculateDateRange();
                gantt.render();
                
                // 更新标题
                document.getElementById('projectTitle').textContent = "新项目";
                document.getElementById('versionBadge').textContent = "v1.0";
                
                addLog('✨ 已新建空白项目');
            }
        };
    }

    // 2. 切换项目 (复用 app-file-manager.js 的逻辑)
    const btnSwitchProject = document.getElementById('btnSwitchProject');
    // 获取原有的隐藏的文件管理按钮 (如果 html 里还保留的话)，或者直接触发逻辑
    // 这里假设 app-file-manager.js 绑定的是 id="manageFiles"
    // 我们让这个新按钮去模拟点击那个逻辑，或者你也可以在 file-manager 里绑定这个 ID
    if (btnSwitchProject) {
        btnSwitchProject.onclick = () => {
            // 触发原本的文件管理逻辑
            const originalBtn = document.getElementById('manageFiles');
            if (originalBtn) {
                originalBtn.click();
            } else {
                // 如果原按钮被删了，需要在 app-file-manager.js 里把绑定 ID 改为 btnSwitchProject
                // 临时兼容方案：
                alert('请确保 app-file-manager.js 已加载');
            }
        };
    }

    // 3. PERT 视图切换 (顶部)
    const btnTopTogglePert = document.getElementById('btnTopTogglePert');
    if (btnTopTogglePert) {
        btnTopTogglePert.onclick = () => {
            // 调用全局切换函数 (来自 app-view-switcher.js)
            if (typeof window.switchToView === 'function' && typeof window.getCurrentView === 'function') {
                const current = window.getCurrentView();
                window.switchToView(current === 'gantt' ? 'pert' : 'gantt');
                
                // 更新按钮状态
                const isPert = (current === 'gantt'); // 切换后
                btnTopTogglePert.classList.toggle('active', isPert);
                if(isPert) {
                    btnTopTogglePert.classList.replace('btn-outline-primary', 'btn-primary');
                } else {
                    btnTopTogglePert.classList.replace('btn-primary', 'btn-outline-primary');
                }
            }
        };
    }

    // 4. 用户登录 (模拟)
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.onclick = () => {
            const isLogin = btnLogin.classList.contains('btn-success');
            if (!isLogin) {
                // 模拟登录
                const username = prompt("请输入用户名 (模拟登录):", "Admin");
                if (username) {
                    btnLogin.innerHTML = `<span class="icon">👤</span> ${username}`;
                    btnLogin.classList.replace('btn-dark', 'btn-success');
                    addLog(`👋 欢迎回来，${username}`);
                }
            } else {
                // 模拟登出
                if(confirm("确定要退出登录吗？")) {
                    btnLogin.innerHTML = `<span class="icon">👤</span> 用户登录`;
                    btnLogin.classList.replace('btn-success', 'btn-dark');
                    addLog(`👋 已退出登录`);
                }
            }
        };
    }
    
    // 5. 标题重命名
    const projectTitle = document.getElementById('projectTitle');
    if (projectTitle) {
        projectTitle.onclick = () => {
            const oldName = projectTitle.textContent;
            const newName = prompt("重命名项目:", oldName);
            if (newName && newName.trim() !== "") {
                projectTitle.textContent = newName;
                document.title = `${newName} - 云端甘特图`;
                addLog(`✏️ 项目重命名为: ${newName}`);
            }
        };
    }

    console.log('✅ app-controls.js updated (Header events bound)');
})();