// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用控制按钮模块                                                ▓▓
// ▓▓ 路径: js/app/app-controls.js                                    ▓▓
// ▓▓ 版本: Epsilon50-DualName-Fix                                   ▓▓
// ▓▓ 修复: 保存时严格分离 内部文件名(Key) 与 外部展示名(Name)        ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 app-controls.js: DOMReady');

        // ==================== 1. 历史记录控制 ====================
        const btnUndo = document.getElementById('btnUndo');
        const btnRedo = document.getElementById('btnRedo');
        const historyLabel = document.getElementById('historyLabel');

        if (btnUndo) btnUndo.onclick = () => window.historyManager && window.historyManager.undo();
        if (btnRedo) btnRedo.onclick = () => window.historyManager && window.historyManager.redo();

        // 历史回溯弹窗
        if (historyLabel) {
            historyLabel.onclick = () => {
                if (!window.historyManager || window.historyManager.stack.length === 0) {
                    alert('暂无历史记录'); return;
                }
                const old = document.querySelector('.history-modal');
                if(old) old.remove();

                const modal = document.createElement('div');
                modal.className = 'dependency-selector-modal history-modal show';
                const stack = window.historyManager.getHistoryStack().reverse();
                const currentIndex = window.historyManager.pointer;

                const listItems = stack.map((action, i) => {
                    const actualIndex = stack.length - 1 - i; 
                    const isCurrent = actualIndex === currentIndex;
                    const time = new Date(action.timestamp).toLocaleTimeString();
                    let btnHtml = isCurrent ? `<span class="badge bg-light text-dark">当前</span>` : `<button class="btn btn-sm btn-outline-primary restore-btn" data-index="${actualIndex}">回溯</button>`;
                    return `<div class="list-group-item d-flex justify-content-between align-items-center ${isCurrent?'bg-primary text-white':''}"><div><div class="fw-bold small">v:${actualIndex+1} - ${action.desc}</div><div class="small opacity-75">${time}</div></div><div>${btnHtml}</div></div>`;
                }).join('');

                modal.innerHTML = `<div class="dependency-selector-overlay"></div><div class="dependency-selector-content" style="width:500px;max-height:80vh;"><div class="dependency-selector-header"><h6 class="m-0">⏳ 历史时光机</h6><button class="btn-close" id="closeHistory"></button></div><div class="dependency-selector-body p-0"><div class="list-group list-group-flush">${listItems}</div></div></div>`;
                document.body.appendChild(modal);
                
                const close = () => modal.remove();
                modal.querySelector('#closeHistory').onclick = close;
                modal.querySelector('.dependency-selector-overlay').onclick = close;
                modal.querySelectorAll('.restore-btn').forEach(btn => {
                    btn.onclick = () => { window.historyManager.travelTo(parseInt(btn.dataset.index)); close(); };
                });
            };
        }

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); window.historyManager?.undo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); window.historyManager?.redo(); }
        });

        if (window.historyManager) window.historyManager.updateUI();

        // ==================== 2. 项目操作 (防重名/双名逻辑) ====================

        // 新建项目
        const btnNewProject = document.getElementById('btnNewProject');
        if (btnNewProject) {
            btnNewProject.onclick = () => {
                // 1. 先让用户输入外部名称 (可以重复，可以是中文)
                const newName = prompt("请输入新项目名称：", "我的新项目");
                if (!newName || newName.trim() === "") return;

                if (window.gantt && window.gantt.tasks.length > 0) {
                    if (!confirm("当前未保存的内容将被清空，确定创建吗？")) return;
                }

                // 2. ⭐ 生成唯一的内部文件名 (KV Key)，确保不冲突
                // 依赖 data-utils.js 中的 generateProjectInternalFilename
                const internalFilename = (typeof generateProjectInternalFilename === 'function') 
                    ? generateProjectInternalFilename() 
                    : `proj_${Date.now()}.json`;

                // 3. 初始化
                if (window.gantt) {
                    window.gantt.tasks = [];
                    window.gantt.calculateDateRange();
                    window.gantt.render();
                    window.gantt.switchToOverviewMode();
                    
                    // UI 显示中文名
                    document.getElementById('projectTitle').textContent = newName;
                    
                    // HistoryManager 绑定内部文件名
                    if (window.historyManager) {
                        window.historyManager.init(internalFilename, null);
                    }
                }
                addLog(`✨ 已创建项目: "${newName}"`);
            };
        }

        // 建立副本
        const btnCopyProject = document.getElementById('btnCopyProject');
        if (btnCopyProject) {
            btnCopyProject.onclick = () => {
                if (!window.gantt) return;
                
                const currentName = document.getElementById('projectTitle').textContent;
                const newName = prompt("请输入副本名称：", currentName + " (副本)");
                if (!newName || newName.trim() === "") return;

                const tasksCopy = JSON.parse(JSON.stringify(window.gantt.tasks));
                tasksCopy.forEach(t => t.id = `task-${Date.now()}-${Math.random().toString(36).substr(2,5)}`);
                
                window.gantt.tasks = tasksCopy;
                window.gantt.render();
                
                // UI 更新
                document.getElementById('projectTitle').textContent = newName;
                
                // ⭐ 生成新 ID
                const newFilename = (typeof generateProjectInternalFilename === 'function') 
                    ? generateProjectInternalFilename() 
                    : `proj_${Date.now()}.json`;

                if (window.historyManager) window.historyManager.init(newFilename, null);
                
                addLog(`📑 已创建副本: "${newName}"`);
            };
        }

        // 重命名 (仅修改 UI 显示，不改变内部 Key)
        const btnRenameProject = document.getElementById('btnRenameProject');
        if (btnRenameProject) {
            btnRenameProject.onclick = () => {
                const titleEl = document.getElementById('projectTitle');
                const newName = prompt("修改项目名称:", titleEl.textContent.trim());
                if (newName && newName.trim() !== "") {
                    titleEl.textContent = newName;
                    document.title = `${newName} - 云端甘特图`;
                    addLog(`✏️ 项目显示名称改为: "${newName}"`);
                }
            };
        }

        // ==================== 3. 云端保存 (关键修复) ====================
        const quickSaveBtn = document.getElementById('quickCloudSave');
        if (quickSaveBtn) {
            quickSaveBtn.onclick = async () => {
                if (typeof saveToKV !== 'function') { alert('存储模块未就绪'); return; }
                
                // 1. 获取 UI 上的中文名称
                const displayName = document.getElementById('projectTitle').textContent.trim();
                
                // 2. 获取内部文件名 (Key)
                // 优先从 historyManager 获取 (新建项目时已设置)
                let filename = window.historyManager ? window.historyManager.filename : null;
                
                // 3. 兜底：如果还没 Key (极少情况)，生成一个新的
                if (!filename) {
                    filename = (typeof generateProjectInternalFilename === 'function') 
                        ? generateProjectInternalFilename() 
                        : `proj_${Date.now()}.json`;
                        
                    if (window.historyManager) window.historyManager.filename = filename;
                }
                
                try {
                    quickSaveBtn.disabled = true;
                    quickSaveBtn.innerHTML = '⏳';
                    
                    const currentActionId = window.historyManager ? window.historyManager.getLastActionId() : null;

                    // ⭐⭐ 核心：Key 是 proj_xxx.json，Name 是 displayName ⭐⭐
                    await saveToKV(filename, {
                        project: { 
                            name: displayName, // 存入中文名
                            updated: Date.now(),
                            lastActionId: currentActionId 
                        },
                        tasks: window.gantt.tasks
                    });
                    
                    // 同步历史 (历史文件名为 proj_xxx_history.json)
                    if (window.historyManager) await window.historyManager.syncToCloud();

                    addLog(`☁️ 保存成功: "${displayName}"`);
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

        // ==================== 4. 其他逻辑 (PERT/登录/工具栏) ====================
        const addTaskBtn = document.getElementById('addTask');
        if (addTaskBtn) addTaskBtn.onclick = () => window.gantt && window.gantt.addTask({});

        const btnHeaderTogglePert = document.getElementById('btnHeaderTogglePert');
        if (btnHeaderTogglePert) {
            btnHeaderTogglePert.onclick = function(e) {
                e.preventDefault();
                if (typeof window.switchToView !== 'function') return;
                const newView = window.getCurrentView && window.getCurrentView() === 'gantt' ? 'pert' : 'gantt';
                window.switchToView(newView);
                const isPert = newView === 'pert';
                this.classList.toggle('active', isPert);
                this.classList.toggle('btn-primary', isPert);
                this.classList.toggle('btn-outline-secondary', !isPert);
                const span = this.querySelector('.btn-text-pert') || this.querySelector('span:last-child');
                if (span) span.textContent = isPert ? "返回甘特图" : "PERT视图";
            };
        }

        const btnLogin = document.getElementById('btnLogin');
        if (btnLogin) {
            btnLogin.onclick = function() {
                const isLogin = this.classList.contains('btn-success');
                if (!isLogin) {
                    const u = prompt("用户名:", "Admin");
                    if(u) { this.innerHTML=`<span class="icon">👤</span> ${u}`; this.classList.replace('btn-dark','btn-success'); }
                } else {
                    if(confirm("退出?")) { this.innerHTML=`<span class="icon">👤</span> 登录`; this.classList.replace('btn-success','btn-dark'); }
                }
            };
        }

        ['checkConflicts', 'autoFixConflicts', 'clearHighlights'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.onclick = () => {
                if (id==='checkConflicts') window.gantt.checkConflicts();
                if (id==='autoFixConflicts') window.gantt.autoFixConflicts();
                if (id==='clearHighlights') window.gantt.clearConflictHighlights();
            };
        });

        const tbCol = document.getElementById('toolbarCollapsed');
        const tbExp = document.getElementById('floatingToolbarExpanded');
        let tbTimer;
        if (tbCol && tbExp) {
            tbCol.addEventListener('mouseenter', () => { clearTimeout(tbTimer); tbExp.classList.add('active'); });
            tbExp.addEventListener('mouseenter', () => clearTimeout(tbTimer));
            const hide = () => tbTimer = setTimeout(() => tbExp.classList.remove('active'), 300);
            tbCol.addEventListener('mouseleave', hide);
            tbExp.addEventListener('mouseleave', hide);
        }
    });
})();