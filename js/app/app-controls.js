// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块 (UI重构版)                                      ▓▓
// ▓▓ 路径: js/app/app-controls.js                                    ▓▓
// ▓▓ 版本: Epsilon28-HeaderUI                                       ▓▓
// ▓▓ 包含: 顶部菜单、工具栏恢复、PERT切换修复                       ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    const today = new Date();

    // ==================== 1. 顶部 Header 按钮组 ====================

    // [A] PERT 视图切换 (修复版)
    const btnHeaderTogglePert = document.getElementById('btnHeaderTogglePert');
    if (btnHeaderTogglePert) {
        btnHeaderTogglePert.onclick = () => {
            // 确保依赖的切换函数存在
            if (typeof window.switchToView !== 'function' || typeof window.getCurrentView !== 'function') {
                console.error('❌ app-view-switcher.js 未正确加载');
                alert('视图切换模块未加载，请刷新重试');
                return;
            }

            // 执行切换
            const currentView = window.getCurrentView();
            const newView = currentView === 'gantt' ? 'pert' : 'gantt';
            window.switchToView(newView);

            // 更新按钮样式
            const isPertNow = (newView === 'pert');
            btnHeaderTogglePert.classList.toggle('active', isPertNow);
            
            const icon = btnHeaderTogglePert.querySelector('.icon');
            const text = btnHeaderTogglePert.querySelector('.btn-text-pert');
            
            if (isPertNow) {
                btnHeaderTogglePert.classList.replace('btn-outline-secondary', 'btn-primary');
                if(text) text.textContent = "返回甘特图";
            } else {
                btnHeaderTogglePert.classList.replace('btn-primary', 'btn-outline-secondary');
                if(text) text.textContent = "PERT视图";
            }
        };
    }

    // [B] 用户登录 (模拟)
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.onclick = () => {
            const isLogin = btnLogin.classList.contains('btn-success');
            if (!isLogin) {
                const username = prompt("请输入用户名:", "Admin");
                if (username) {
                    btnLogin.innerHTML = `<span class="icon">👤</span> ${username}`;
                    btnLogin.classList.replace('btn-dark', 'btn-success');
                    addLog(`👋 欢迎回来，${username}`);
                }
            } else {
                if(confirm("确定要退出登录吗？")) {
                    btnLogin.innerHTML = `<span class="icon">👤</span> 登录`;
                    btnLogin.classList.replace('btn-success', 'btn-dark');
                    addLog(`👋 已退出登录`);
                }
            }
        };
    }

    // ==================== 2. 项目菜单 (悬停下拉) ====================

    // [A] 新建项目
    const btnNewProject = document.getElementById('btnNewProject');
    if (btnNewProject) {
        btnNewProject.onclick = () => {
            if (confirm('确定要新建空白项目吗？\n当前未保存的更改将会丢失。')) {
                // 重置数据
                if (window.gantt) {
                    window.gantt.tasks = [];
                    window.gantt.calculateDateRange();
                    window.gantt.render();
                    window.gantt.switchToOverviewMode(); // 新项目切到全貌
                }
                // 重置 UI
                document.getElementById('projectTitle').textContent = "新项目";
                document.getElementById('versionBadge').textContent = "v1.0";
                addLog('✨ 已创建空白项目');
            }
        };
    }

    // [B] 切换/加载项目 (联动 file-manager)
    const btnSwitchProject = document.getElementById('btnSwitchProject');
    if (btnSwitchProject) {
        btnSwitchProject.onclick = () => {
            // 尝试触发 file-manager 的逻辑
            // 由于 file-manager 之前绑定的是 id="manageFiles"
            // 我们在这里手动触发它，或者稍后修改 file-manager
            const originalBtn = document.getElementById('manageFiles');
            if (originalBtn) {
                originalBtn.click();
            } else {
                // 如果找不到原按钮，说明 file-manager 需要更新绑定逻辑
                console.warn('未找到 manageFiles 按钮，请确保 app-file-manager.js 已加载');
            }
        };
    }

    // [C] 重命名项目
    const btnRenameProject = document.getElementById('btnRenameProject');
    if (btnRenameProject) {
        btnRenameProject.onclick = () => {
            const titleEl = document.getElementById('projectTitle');
            const oldName = titleEl.textContent;
            const newName = prompt("请输入新项目名称:", oldName);
            
            if (newName && newName.trim() !== "") {
                titleEl.textContent = newName;
                document.title = `${newName} - 云端甘特图`;
                addLog(`✏️ 项目重命名为: ${newName}`);
            }
        };
    }

    // [D] 建立项目副本 (内存中复制)
    const btnCopyProject = document.getElementById('btnCopyProject');
    if (btnCopyProject) {
        btnCopyProject.onclick = () => {
            if (!window.gantt) return;
            
            const titleEl = document.getElementById('projectTitle');
            const currentName = titleEl.textContent;
            
            if (confirm(`确定要创建 "${currentName}" 的副本吗？\n这将在内存中创建一个新项目（未保存到云端）。`)) {
                // 深拷贝任务数据
                const tasksCopy = JSON.parse(JSON.stringify(window.gantt.tasks));
                // 重新生成 ID 以免冲突 (可选，如果作为新文件保存其实ID可以保留，但为了安全生成新的)
                tasksCopy.forEach(t => t.id = generateId()); // 简单重置ID
                
                window.gantt.tasks = tasksCopy;
                window.gantt.render();
                
                const newName = `${currentName} (副本)`;
                titleEl.textContent = newName;
                document.title = newName;
                
                addLog(`📑 已创建项目副本: ${newName}`);
            }
        };
    }

    // ==================== 3. 左侧浮动工具栏 (恢复原有交互) ====================
    
    // 任务操作
    const addTaskBtn = document.getElementById('addTask');
    if (addTaskBtn) {
        addTaskBtn.onclick = () => {
            const newTask = {
                id: generateId(),
                name: '新任务',
                start: formatDate(new Date()),
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

    const quickSaveBtn = document.getElementById('quickCloudSave');
    if (quickSaveBtn) {
        quickSaveBtn.onclick = async () => {
            // 调用 KV 保存逻辑
            if (typeof saveToKV === 'function') {
                const name = document.getElementById('projectTitle').textContent.trim();
                const filename = `${name}.json`;
                const data = {
                    project: { name: name, version: document.getElementById('versionBadge').textContent },
                    tasks: gantt.tasks
                };
                try {
                    quickSaveBtn.disabled = true;
                    await saveToKV(filename, data);
                    addLog(`☁️ 保存成功: ${filename}`);
                    alert(`保存成功: ${filename}`);
                } catch (e) {
                    alert('保存失败: ' + e.message);
                } finally {
                    quickSaveBtn.disabled = false;
                }
            }
        };
    }

    // 智能工具
    const checkConflictsBtn = document.getElementById('checkConflicts');
    if (checkConflictsBtn) checkConflictsBtn.onclick = () => gantt.checkConflicts();

    const autoFixBtn = document.getElementById('autoFixConflicts');
    if (autoFixBtn) autoFixBtn.onclick = () => gantt.autoFixConflicts();

    const clearHighlightsBtn = document.getElementById('clearHighlights');
    if (clearHighlightsBtn) clearHighlightsBtn.onclick = () => gantt.clearConflictHighlights();

    // 工具栏展开/折叠交互
    const toolbarCollapsed = document.getElementById('toolbarCollapsed');
    const toolbarExpanded = document.getElementById('floatingToolbarExpanded');
    let toolbarHoverTimer, toolbarLeaveTimer;

    if (toolbarCollapsed && toolbarExpanded) {
        // 鼠标移入折叠按钮 -> 展开
        toolbarCollapsed.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
            toolbarHoverTimer = setTimeout(() => toolbarExpanded.classList.add('active'), 150);
        });
        
        // 鼠标移出折叠按钮 -> 延迟收起
        toolbarCollapsed.addEventListener('mouseleave', () => {
            clearTimeout(toolbarHoverTimer);
            toolbarLeaveTimer = setTimeout(() => {
                if (!toolbarExpanded.matches(':hover')) toolbarExpanded.classList.remove('active');
            }, 300);
        });
        
        // 鼠标进入展开面板 -> 保持展开
        toolbarExpanded.addEventListener('mouseenter', () => clearTimeout(toolbarLeaveTimer));
        
        // 鼠标离开展开面板 -> 收起
        toolbarExpanded.addEventListener('mouseleave', () => {
            toolbarLeaveTimer = setTimeout(() => toolbarExpanded.classList.remove('active'), 300);
        });
    }

    console.log('✅ app-controls.js loaded (Epsilon28 - HeaderUI + PERT Fix)');
})();