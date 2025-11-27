// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块                                                ▓▓
// ▓▓ 路径: js/app/app-controls.js                                    ▓▓
// ▓▓ 版本: Epsilon46-HistoryUI                                      ▓▓
// ▓▓ 修复: 增加历史回溯管理界面                                      ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    function generateSafeFilename(originalName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeName = originalName.replace(/[^\w\-\u4e00-\u9fa5]/g, '_'); 
        return `${safeName}_${timestamp}.json`;
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 app-controls.js: DOMReady');

        // ==================== 1. 历史记录控制 ====================
        const btnUndo = document.getElementById('btnUndo');
        const btnRedo = document.getElementById('btnRedo');
        const historyLabel = document.getElementById('historyLabel');

        if (btnUndo) btnUndo.onclick = () => window.historyManager && window.historyManager.undo();
        if (btnRedo) btnRedo.onclick = () => window.historyManager && window.historyManager.redo();

        // ⭐⭐ 新增：点击版本号打开历史管理界面 ⭐⭐
        if (historyLabel) {
            historyLabel.onclick = showHistoryModal;
        }

        function showHistoryModal() {
            if (!window.historyManager || window.historyManager.stack.length === 0) {
                alert('暂无历史记录');
                return;
            }

            // 移除旧弹窗
            const old = document.querySelector('.history-modal');
            if(old) old.remove();

            const modal = document.createElement('div');
            modal.className = 'dependency-selector-modal history-modal show'; // 复用弹窗样式
            
            const stack = window.historyManager.getHistoryStack().reverse(); // 倒序显示，最新的在上面
            const currentIndex = window.historyManager.pointer;

            const listItems = stack.map((action, i) => {
                // stack index 是反转前的索引
                const actualIndex = stack.length - 1 - i; 
                const isCurrent = actualIndex === currentIndex;
                const isFuture = actualIndex > currentIndex;
                const time = new Date(action.timestamp).toLocaleTimeString();
                
                let statusClass = isCurrent ? 'bg-primary text-white' : (isFuture ? 'text-muted' : '');
                let btnHtml = isCurrent 
                    ? `<span class="badge bg-light text-dark">当前</span>` 
                    : `<button class="btn btn-sm btn-outline-${isFuture ? 'secondary' : 'primary'} restore-btn" data-index="${actualIndex}">回溯</button>`;

                return `
                    <div class="list-group-item d-flex justify-content-between align-items-center ${statusClass}">
                        <div>
                            <div class="fw-bold small">v:${actualIndex + 1} - ${action.desc}</div>
                            <div class="small opacity-75">${time}</div>
                        </div>
                        <div>${btnHtml}</div>
                    </div>
                `;
            }).join('');

            modal.innerHTML = `
                <div class="dependency-selector-overlay"></div>
                <div class="dependency-selector-content" style="width: 500px; max-height: 80vh;">
                    <div class="dependency-selector-header">
                        <h6 class="m-0">⏳ 历史时光机</h6>
                        <button class="btn-close" id="closeHistory"></button>
                    </div>
                    <div class="dependency-selector-body p-0">
                        <div class="list-group list-group-flush">${listItems}</div>
                    </div>
                    <div class="dependency-selector-footer bg-light">
                        <small class="text-muted">点击“回溯”将项目状态恢复到该操作之后。</small>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 绑定事件
            modal.querySelector('#closeHistory').onclick = () => modal.remove();
            modal.querySelector('.dependency-selector-overlay').onclick = () => modal.remove();
            
            modal.querySelectorAll('.restore-btn').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.dataset.index);
                    window.historyManager.travelTo(idx);
                    modal.remove();
                };
            });
        }

        // 快捷键
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (window.historyManager) window.historyManager.undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                if (window.historyManager) window.historyManager.redo();
            }
        });

        if (window.historyManager) window.historyManager.updateUI();

        // ... (Header 视图切换、登录逻辑保持不变) ...
        const btnHeaderTogglePert = document.getElementById('btnHeaderTogglePert');
        if (btnHeaderTogglePert) {
            btnHeaderTogglePert.onclick = function(e) {
                e.preventDefault();
                if (typeof window.switchToView !== 'function') return;
                const currentView = window.getCurrentView ? window.getCurrentView() : 'gantt';
                const newView = currentView === 'gantt' ? 'pert' : 'gantt';
                window.switchToView(newView);
                const isPertNow = (newView === 'pert');
                this.classList.toggle('active', isPertNow);
                this.classList.toggle('btn-primary', isPertNow);
                this.classList.toggle('btn-outline-secondary', !isPertNow);
                const textSpan = this.querySelector('.btn-text-pert') || this.querySelector('span:last-child');
                if (textSpan) textSpan.textContent = isPertNow ? "返回甘特图" : "PERT视图";
            };
        }

        const btnLogin = document.getElementById('btnLogin');
        if (btnLogin) {
            btnLogin.onclick = function() {
                const isLogin = this.classList.contains('btn-success');
                if (!isLogin) {
                    const username = prompt("请输入用户名:", "Admin");
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

        // ... (项目菜单逻辑保持不变) ...
        const btnNewProject = document.getElementById('btnNewProject');
        if (btnNewProject) {
            btnNewProject.onclick = () => {
                if (confirm('新建项目将清空当前数据，是否继续？')) {
                    if (window.gantt) {
                        window.gantt.tasks = [];
                        window.gantt.calculateDateRange();
                        window.gantt.render();
                        window.gantt.switchToOverviewMode();
                        const newName = "新项目";
                        const newFileName = generateSafeFilename(newName);
                        document.getElementById('projectTitle').textContent = newName;
                        if (window.historyManager) window.historyManager.init(newFileName, null);
                    }
                    addLog('✨ 已创建空白项目');
                }
            };
        }
        
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

        const btnCopyProject = document.getElementById('btnCopyProject');
        if (btnCopyProject) {
            btnCopyProject.onclick = () => {
                if (!window.gantt) return;
                if (confirm("创建当前项目的副本？")) {
                    const tasksCopy = JSON.parse(JSON.stringify(window.gantt.tasks));
                    tasksCopy.forEach(t => t.id = `task-${Date.now()}-${Math.random().toString(36).substr(2,5)}`);
                    window.gantt.tasks = tasksCopy;
                    window.gantt.render();
                    const oldTitle = document.getElementById('projectTitle').textContent;
                    const newTitle = oldTitle + " (副本)";
                    document.getElementById('projectTitle').textContent = newTitle;
                    const newFileName = generateSafeFilename(newTitle);
                    if (window.historyManager) window.historyManager.init(newFileName, null);
                    if(typeof addLog === 'function') addLog('📑 项目副本已创建');
                }
            };
        }

        // ... (悬浮工具栏保持不变) ...
        const addTaskBtn = document.getElementById('addTask');
        if (addTaskBtn) {
            addTaskBtn.onclick = () => {
                if (window.gantt) window.gantt.addTask({});
            };
        }

        const quickSaveBtn = document.getElementById('quickCloudSave');
        if (quickSaveBtn) {
            quickSaveBtn.onclick = async () => {
                if (typeof saveToKV !== 'function') { alert('存储模块未就绪'); return; }
                const name = document.getElementById('projectTitle').textContent.trim();
                
                let filename = window.historyManager ? window.historyManager.filename : null;
                if (!filename) {
                    filename = generateSafeFilename(name);
                    if (window.historyManager) window.historyManager.filename = filename;
                }
                
                try {
                    quickSaveBtn.disabled = true;
                    quickSaveBtn.innerHTML = '⏳';
                    
                    const currentActionId = window.historyManager ? window.historyManager.getLastActionId() : null;

                    await saveToKV(filename, {
                        project: { name: name, updated: Date.now(), lastActionId: currentActionId },
                        tasks: window.gantt.tasks
                    });
                    
                    if (window.historyManager) await window.historyManager.syncToCloud();

                    addLog(`☁️ 全量保存成功 (锚点: ${currentActionId || 'init'})`);
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

        const toolbarCollapsed = document.getElementById('toolbarCollapsed');
        const toolbarExpanded = document.getElementById('floatingToolbarExpanded');
        let toolbarTimer;

        if (toolbarCollapsed && toolbarExpanded) {
            toolbarCollapsed.addEventListener('mouseenter', () => {
                clearTimeout(toolbarTimer);
                toolbarExpanded.classList.add('active');
            });
            toolbarExpanded.addEventListener('mouseenter', () => clearTimeout(toolbarTimer));
            const hide = () => {
                toolbarTimer = setTimeout(() => toolbarExpanded.classList.remove('active'), 300);
            };
            toolbarCollapsed.addEventListener('mouseleave', hide);
            toolbarExpanded.addEventListener('mouseleave', hide);
        }
    });
})();