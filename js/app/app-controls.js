// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块                                                ▓▓
// ▓▓ 路径: js/app/app-controls.js                                    ▓▓
// ▓▓ 版本: Epsilon45-Unabridged                                     ▓▓
// ▓▓ 状态: 100% 完整代码，无省略，集成历史记录与锚点保存             ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    // 辅助：生成安全文件名
    function generateSafeFilename(originalName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeName = originalName.replace(/[^\w\-\u4e00-\u9fa5]/g, '_'); // 允许中文
        return `${safeName}_${timestamp}.json`;
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 app-controls.js: DOMReady, 开始绑定事件...');

        // ============================================================
        // 1. 历史记录控制 (Undo/Redo) - [新增集成]
        // ============================================================
        const btnUndo = document.getElementById('btnUndo');
        const btnRedo = document.getElementById('btnRedo');

        // 绑定撤销按钮
        if (btnUndo) {
            btnUndo.onclick = () => {
                if (window.historyManager) window.historyManager.undo();
            };
        }

        // 绑定重做按钮
        if (btnRedo) {
            btnRedo.onclick = () => {
                if (window.historyManager) window.historyManager.redo();
            };
        }

        // 绑定键盘快捷键 (Ctrl+Z / Ctrl+Y)
        document.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            // Ctrl + Z (撤销)
            if (isCtrl && key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (window.historyManager) window.historyManager.undo();
            }
            // Ctrl + Y 或 Ctrl + Shift + Z (重做)
            if (isCtrl && (key === 'y' || (e.shiftKey && key === 'z'))) {
                e.preventDefault();
                if (window.historyManager) window.historyManager.redo();
            }
        });

        // 初始化页面时的 UI 状态 (确保按钮灰显状态正确)
        if (window.historyManager) {
            window.historyManager.updateUI();
        }

        // ============================================================
        // 2. 顶部 Header 区域 (视图切换 / 登录) - [原有逻辑保留]
        // ============================================================

        // PERT 视图切换
        const btnHeaderTogglePert = document.getElementById('btnHeaderTogglePert');
        if (btnHeaderTogglePert) {
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
        }

        // 用户登录 (模拟)
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

        // ============================================================
        // 3. 项目菜单 (新建 / 重命名 / 副本) - [逻辑增强]
        // ============================================================

        // 新建项目
        const btnNewProject = document.getElementById('btnNewProject');
        if (btnNewProject) {
            btnNewProject.onclick = () => {
                if (confirm('新建项目将清空当前数据，是否继续？')) {
                    if (window.gantt) {
                        window.gantt.tasks = [];
                        window.gantt.calculateDateRange();
                        window.gantt.render();
                        window.gantt.switchToOverviewMode();
                        
                        // ⭐ 关键修复：新建项目立即分配文件名，确保历史记录有地方存
                        const newName = "新项目";
                        const newFileName = generateSafeFilename(newName);
                        document.getElementById('projectTitle').textContent = newName;
                        
                        // 重置并初始化历史
                        if (window.historyManager) {
                            window.historyManager.init(newFileName, null);
                        }
                    }
                    if(typeof addLog === 'function') addLog('✨ 已创建空白项目 (自动保存已启用)');
                }
            };
        }

        // 切换/加载项目 (逻辑由 app-file-manager.js 统一处理，但保留 ID 绑定以防万一)
        const btnSwitchProject = document.getElementById('btnSwitchProject');
        if (btnSwitchProject) {
            // 事件监听已在 app-file-manager.js 中处理，此处保留空位或做备用处理
        }

        // 重命名项目
        const btnRenameProject = document.getElementById('btnRenameProject');
        if (btnRenameProject) {
            btnRenameProject.onclick = () => {
                const titleEl = document.getElementById('projectTitle');
                const newName = prompt("新项目名称:", titleEl.textContent.trim());
                if (newName) {
                    titleEl.textContent = newName;
                    document.title = `${newName} - 云端甘特图`;
                    // 注意：单纯重命名不改变底层 KV 文件名，除非执行“另存为”或下次保存时生成新文件
                }
            };
        }

        // 建立副本
        const btnCopyProject = document.getElementById('btnCopyProject');
        if (btnCopyProject) {
            btnCopyProject.onclick = () => {
                if (!window.gantt) return;
                if (confirm("创建当前项目的副本？")) {
                    const tasksCopy = JSON.parse(JSON.stringify(window.gantt.tasks));
                    // 重置所有 ID，视为新任务
                    tasksCopy.forEach(t => t.id = `task-${Date.now()}-${Math.random().toString(36).substr(2,5)}`);
                    window.gantt.tasks = tasksCopy;
                    window.gantt.render();
                    
                    const oldTitle = document.getElementById('projectTitle').textContent;
                    const newTitle = oldTitle + " (副本)";
                    document.getElementById('projectTitle').textContent = newTitle;
                    
                    // ⭐ 副本是新文件，分配新文件名并初始化历史
                    const newFileName = generateSafeFilename(newTitle);
                    if (window.historyManager) {
                        window.historyManager.init(newFileName, null);
                    }
                    
                    if(typeof addLog === 'function') addLog('📑 项目副本已创建');
                }
            };
        }

        // ============================================================
        // 4. 悬浮工具栏 & 云端保存 - [核心集成点]
        // ============================================================

        // 添加任务快捷按钮
        const addTaskBtn = document.getElementById('addTask');
        if (addTaskBtn) {
            addTaskBtn.onclick = () => {
                if (window.gantt) {
                    // 调用 gantt-operations.js 中的 addTask
                    window.gantt.addTask({}); 
                }
            };
        }

        // 云端保存 (全量保存 + 锚点记录)
        const quickSaveBtn = document.getElementById('quickCloudSave');
        if (quickSaveBtn) {
            quickSaveBtn.onclick = async () => {
                if (typeof saveToKV !== 'function') { alert('存储模块未就绪'); return; }
                const name = document.getElementById('projectTitle').textContent.trim();
                
                // 如果 HistoryManager 已经有关联文件名，则复用；否则生成新文件名
                let filename = window.historyManager ? window.historyManager.filename : null;
                if (!filename) {
                    filename = generateSafeFilename(name);
                    // 首次保存，关联到 HistoryManager
                    if (window.historyManager) window.historyManager.filename = filename;
                }
                
                try {
                    quickSaveBtn.disabled = true;
                    quickSaveBtn.innerHTML = '⏳';
                    
                    // ⭐ 获取当前历史栈顶 ID 作为快照锚点
                    // 这是实现“未保存修改自动恢复”的关键：告诉系统全量数据截止到哪个历史节点
                    const currentActionId = window.historyManager ? window.historyManager.getLastActionId() : null;

                    // 1. 保存主文件 (全量数据 + lastActionId 锚点)
                    await saveToKV(filename, {
                        project: { 
                            name: name, 
                            updated: Date.now(),
                            lastActionId: currentActionId // 写入锚点
                        },
                        tasks: window.gantt.tasks
                    });
                    
                    // 2. 强制同步一次历史文件 (确保 _history.json 也是最新的)
                    if (window.historyManager) {
                        await window.historyManager.syncToCloud();
                    }

                    if(typeof addLog === 'function') addLog(`☁️ 全量保存成功 (锚点: ${currentActionId || 'init'})`);
                    quickSaveBtn.innerHTML = '✅';
                    
                    setTimeout(() => { 
                        quickSaveBtn.innerHTML = '<span class="btn-icon icon">☁️</span><span class="btn-text">云保存</span>'; 
                        quickSaveBtn.disabled = false; 
                    }, 1500);
                } catch (e) {
                    alert('保存失败: ' + e.message);
                    quickSaveBtn.disabled = false;
                    quickSaveBtn.innerHTML = '<span class="btn-icon icon">☁️</span><span class="btn-text">云保存</span>';
                }
            };
        }

        // ============================================================
        // 5. 智能工具 (冲突检测 / 修复 / 清除) - [原有逻辑保留]
        // ============================================================
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

        // ============================================================
        // 6. 工具栏 UI 交互 (展开/收起) - [原有逻辑保留]
        // ============================================================
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