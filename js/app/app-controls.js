// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块                                                ▓▓
// ▓▓ 路径: js/app/app-controls.js                                    ▓▓
// ▓▓ 版本: Epsilon31-FinalFix                                       ▓▓
// ▓▓ 修复: PERT按钮绑定、工具栏交互、DOM加载时序                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    // 辅助：生成安全文件名
    function generateSafeFilename(originalName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeName = originalName.replace(/[^\w\-]/g, '_');
        const base = safeName.length > 0 ? safeName : 'Project';
        return `${base}_${timestamp}.json`;
    }

    // 等待 DOM 加载完成 (关键修复)
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 app-controls.js: DOMReady, 开始绑定事件...');

        // ==================== 1. 顶部 Header 区域 ====================

        // [A] PERT 视图切换 (右上角)
        const btnHeaderTogglePert = document.getElementById('btnHeaderTogglePert');
        if (btnHeaderTogglePert) {
            console.log('✅ 找到 PERT 切换按钮');
            btnHeaderTogglePert.onclick = function(e) {
                e.preventDefault();
                
                // 检查视图切换模块
                if (typeof window.switchToView !== 'function') {
                    console.error('❌ app-view-switcher.js 未加载');
                    alert('功能组件加载中，请稍后点击...');
                    return;
                }

                const currentView = window.getCurrentView ? window.getCurrentView() : 'gantt';
                const newView = currentView === 'gantt' ? 'pert' : 'gantt';
                
                console.log(`🔄 切换视图: ${currentView} -> ${newView}`);
                window.switchToView(newView);

                // 更新按钮状态
                const isPertNow = (newView === 'pert');
                this.classList.toggle('active', isPertNow);
                this.classList.toggle('btn-primary', isPertNow);
                this.classList.toggle('btn-outline-secondary', !isPertNow);
                
                const textSpan = this.querySelector('.btn-text-pert') || this.querySelector('span:last-child');
                if (textSpan) textSpan.textContent = isPertNow ? "返回甘特图" : "PERT视图";
            };
        } else {
            console.warn('⚠️ 未找到 id="btnHeaderTogglePert" 的按钮');
        }

        // [B] 用户登录
        const btnLogin = document.getElementById('btnLogin');
        if (btnLogin) {
            btnLogin.onclick = function() {
                const isLogin = this.classList.contains('btn-success');
                if (!isLogin) {
                    const username = prompt("请输入用户名 (模拟):", "Admin");
                    if (username) {
                        this.innerHTML = `<span class="icon">👤</span> ${username}`;
                        this.classList.replace('btn-dark', 'btn-success');
                    }
                } else {
                    if(confirm("退出登录？")) {
                        this.innerHTML = `<span class="icon">👤</span> 登录`;
                        this.classList.replace('btn-success', 'btn-dark');
                    }
                }
            };
        }

        // ==================== 2. 项目下拉菜单 ====================

        // [A] 新建项目
        const btnNewProject = document.getElementById('btnNewProject');
        if (btnNewProject) {
            btnNewProject.onclick = () => {
                if (confirm('新建项目将清空当前数据，是否继续？')) {
                    if (window.gantt) {
                        window.gantt.tasks = [];
                        window.gantt.calculateDateRange();
                        window.gantt.render();
                        window.gantt.switchToOverviewMode();
                    }
                    document.getElementById('projectTitle').textContent = "新项目";
                    if(typeof addLog === 'function') addLog('✨ 已创建空白项目');
                }
            };
        }

        // [B] 切换/加载项目 (触发文件管理器)
        const btnSwitchProject = document.getElementById('btnSwitchProject');
        if (btnSwitchProject) {
            // 逻辑已由 app-file-manager.js 统一绑定，此处无需重复
            // 但为了保险，如果 app-file-manager 没绑上，这里补救一下
            btnSwitchProject.addEventListener('click', (e) => {
               // 这是一个空监听，主要依靠 file-manager 的逻辑
               console.log('📂 点击了切换项目');
            });
        }

        // [C] 重命名
        const btnRenameProject = document.getElementById('btnRenameProject');
        if (btnRenameProject) {
            btnRenameProject.onclick = () => {
                const titleEl = document.getElementById('projectTitle');
                const newName = prompt("新项目名称:", titleEl.textContent.trim());
                if (newName) {
                    titleEl.textContent = newName;
                    document.title = `${newName} - 云端甘特图`;
                }
            };
        }

        // [D] 复制项目
        const btnCopyProject = document.getElementById('btnCopyProject');
        if (btnCopyProject) {
            btnCopyProject.onclick = () => {
                if (!window.gantt) return;
                if (confirm("创建当前项目的副本？")) {
                    const tasksCopy = JSON.parse(JSON.stringify(window.gantt.tasks));
                    tasksCopy.forEach(t => t.id = `task-${Date.now()}-${Math.random().toString(36).substr(2,5)}`);
                    window.gantt.tasks = tasksCopy;
                    window.gantt.render();
                    const titleEl = document.getElementById('projectTitle');
                    titleEl.textContent += " (副本)";
                    if(typeof addLog === 'function') addLog('📑 项目副本已创建');
                }
            };
        }

        // ==================== 3. 左侧悬浮工具栏 ====================

        // 添加任务
        const addTaskBtn = document.getElementById('addTask');
        if (addTaskBtn) {
            addTaskBtn.onclick = () => {
                const newTask = {
                    id: `task-${Date.now()}`,
                    name: '新任务',
                    start: new Date().toISOString().split('T')[0],
                    duration: 1,
                    durationType: 'days',
                    progress: 0,
                    dependencies: [],
                    outlineLevel: 1
                };
                window.gantt.addTask(newTask);
                window.gantt.selectTask(newTask.id);
            };
        }

        // ==================== ⭐ 新增：历史记录控制 ====================
        const btnUndo = document.getElementById('btnUndo');
        const btnRedo = document.getElementById('btnRedo');

        if (btnUndo) {
            btnUndo.onclick = () => {
                if (window.historyManager) window.historyManager.undo();
            };
        }

        if (btnRedo) {
            btnRedo.onclick = () => {
                if (window.historyManager) window.historyManager.redo();
            };
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z / Command+Z
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (window.historyManager) window.historyManager.undo();
            }
            // Ctrl+Y / Command+Y / Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                if (window.historyManager) window.historyManager.redo();
            }
        });

        // ==================== 云端保存 (全量) ====================
        const quickSaveBtn = document.getElementById('quickCloudSave');
        if (quickSaveBtn) {
            quickSaveBtn.onclick = async () => {
                if (typeof saveToKV !== 'function') { alert('存储模块未就绪'); return; }
                const name = document.getElementById('projectTitle').textContent.trim();
                
                // 如果 HistoryManager 已经有关联文件名，则复用（覆盖主文件）
                // 否则生成新文件名
                let filename = window.historyManager ? window.historyManager.filename : null;
                if (!filename) {
                    filename = generateSafeFilename(name);
                    // 首次保存，关联到 HistoryManager
                    if (window.historyManager) window.historyManager.filename = filename;
                }
                
                try {
                    quickSaveBtn.disabled = true;
                    quickSaveBtn.innerHTML = '⏳';
                    
                    // 1. 保存主文件 (全量)
                    await saveToKV(filename, {
                        project: { name: name, updated: Date.now() },
                        tasks: window.gantt.tasks
                    });
                    
                    // 2. 触发一次历史同步 (确保 history 文件也存在)
                    if (window.historyManager) await window.historyManager.syncToCloud();

                    if(typeof addLog === 'function') addLog(`☁️ 全量保存成功: ${filename}`);
                    quickSaveBtn.innerHTML = '✅';
                    setTimeout(() => { 
                        quickSaveBtn.innerHTML = '<span class="btn-icon icon">☁️</span><span class="btn-text">云保存</span>'; 
                        quickSaveBtn.disabled = false; 
                    }, 1500);
                } catch (e) {
                    alert('保存失败: ' + e.message);
                    quickSaveBtn.disabled = false;
                }
            };
        }

        // 智能工具
        ['checkConflicts', 'autoFixConflicts', 'clearHighlights'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn && window.gantt) {
                btn.onclick = () => {
                    if (id === 'checkConflicts') window.gantt.checkConflicts();
                    if (id === 'autoFixConflicts') window.gantt.autoFixConflicts();
                    if (id === 'clearHighlights') window.gantt.clearConflictHighlights();
                };
            }
        });

        // 工具栏展开/收起交互
        const toolbarCollapsed = document.getElementById('toolbarCollapsed');
        const toolbarExpanded = document.getElementById('floatingToolbarExpanded');
        let toolbarTimer;

        if (toolbarCollapsed && toolbarExpanded) {
            // 移入展开
            toolbarCollapsed.addEventListener('mouseenter', () => {
                clearTimeout(toolbarTimer);
                toolbarExpanded.classList.add('active');
            });
            
            // 保持展开
            toolbarExpanded.addEventListener('mouseenter', () => clearTimeout(toolbarTimer));
            
            // 移出收起
            const hide = () => {
                toolbarTimer = setTimeout(() => toolbarExpanded.classList.remove('active'), 300);
            };
            
            toolbarCollapsed.addEventListener('mouseleave', hide);
            toolbarExpanded.addEventListener('mouseleave', hide);
        }
    });
})();