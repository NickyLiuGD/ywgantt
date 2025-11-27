// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 云端文件管理模块                                                ▓▓
// ▓▓ 路径: js/app/app-file-manager.js                                ▓▓
// ▓▓ 版本: Epsilon60-TimestampSync                                  ▓▓
// ▓▓ 修复: 手动加载时传递快照时间戳，确保追赶逻辑生效                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    let _fileListCache = null;
    let _lastFetchTime = 0;
    const CACHE_DURATION = 30 * 1000; 

    const triggerButtonIds = ['manageFiles', 'btnSwitchProject'];
    triggerButtonIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = (e) => {
                if (e) e.stopPropagation();
                openFileManager();
            };
        }
    });

    function openFileManager() {
        const modal = createModalShell();
        const now = Date.now();
        if (_fileListCache && (now - _lastFetchTime < CACHE_DURATION)) {
            renderFileList(modal, _fileListCache);
        } else {
            renderSkeleton(modal);
            fetchAndRender(modal);
        }
    }

    async function fetchAndRender(modal) {
        try {
            const allFiles = await listKVFiles();
            
            // ⭐ 核心修改：调用 kv-storage.js 中的统一排序函数
            let sortedProjects = [];
            if (typeof processAndSortFiles === 'function') {
                sortedProjects = processAndSortFiles(allFiles);
            } else {
                // 降级处理 (理论上不会发生，除非 kv-storage 未加载)
                sortedProjects = allFiles.filter(f => !(f.key||f.name).endsWith('_history.json'));
            }
            
            _fileListCache = sortedProjects;
            _lastFetchTime = Date.now();
            renderFileList(modal, sortedProjects);
        } catch (error) {
            renderErrorState(modal, error.message);
        }
    }

    function createModalShell() {
        const old = document.querySelector('.dependency-selector-modal');
        if(old) old.remove();
        const modal = document.createElement('div');
        modal.className = 'dependency-selector-modal';
        modal.innerHTML = `
            <div class="dependency-selector-overlay"></div>
            <div class="dependency-selector-content" style="width: 650px; max-height: 80vh;">
                <div class="dependency-selector-header">
                    <div class="d-flex gap-2 align-items-center">
                        <h6 class="mb-0 fw-bold text-muted">☁️ 云端项目库</h6>
                        <span class="badge bg-light text-dark border" id="fileCountBadge">...</span>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <button class="btn-header-icon" id="refreshFilesBtn" title="刷新">🔄</button>
                        <button class="btn-header-icon btn-header-success" id="modalUploadBtn" title="上传">📤</button>
                        <button class="btn-header-icon btn-header-close" id="closeFileManager" title="关闭">✖</button>
                    </div>
                </div>
                <div class="dependency-selector-body" id="fileManagerBody" style="padding: 0; background: #f8f9fa; min-height: 300px;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        bindBaseEvents(modal);
        requestAnimationFrame(() => modal.classList.add('show'));
        return modal;
    }

    function renderFileList(modal, files) {
        const body = modal.querySelector('#fileManagerBody');
        const badge = modal.querySelector('#fileCountBadge');
        
        if (badge) badge.textContent = `${files.length} 个项目`;

        if (!body) return; // 安全检查

        if (files.length === 0) {
            body.innerHTML = `<div class="text-center py-5 text-muted">暂无云端存档</div>`;
            return;
        }

        const formatSize = b => b > 1048576 ? `${(b/1048576).toFixed(2)} MB` : `${(b/1024).toFixed(1)} KB`;
        
        body.innerHTML = `<div class="list-group list-group-flush fade-in">${files.map(f => {
            // 使用 processAndSortFiles 处理后的字段
            const fileKey = f.fileKey || f.key || f.name; 
            const displayName = f.displayName || f.name;
            
            // 标记未保存状态
            const unsavedBadge = f.hasUnsavedChanges 
                ? `<span class="badge bg-warning text-dark ms-2" style="font-size:0.6rem" title="有未保存的增量修改">未保存</span>` 
                : '';

            // 使用有效时间（可能是增量时间）
            const displayTime = new Date(f.effectiveTimestamp || f.timestamp).toLocaleString('zh-CN');

            return `
            <div class="list-group-item px-3 py-3 bg-white border-bottom">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3" style="flex:1;min-width:0;">
                        <div class="fs-4 text-primary opacity-75">📄</div>
                        <div style="min-width:0;">
                            <h6 class="mb-1 fw-bold text-truncate text-dark load-file-btn" 
                                data-key="${fileKey}" 
                                title="ID: ${fileKey}" 
                                style="cursor:pointer;">
                                ${displayName}
                                ${unsavedBadge}
                            </h6>
                            <div class="d-flex align-items-center gap-2 text-muted small">
                                <span>📅 ${displayTime}</span>
                                <span class="border-start ps-2">📊 ${f.taskCount} 任务</span>
                                <span class="border-start ps-2">💾 ${formatSize(f.size)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2 ms-3">
                        <button class="btn btn-sm btn-primary load-file-btn" data-key="${fileKey}">📂 打开</button>
                        <button class="btn btn-sm btn-outline-secondary download-file-btn" data-key="${fileKey}" title="下载JSON">⬇️</button>
                        <button class="btn btn-sm btn-outline-danger delete-file-btn" data-key="${fileKey}" title="删除">🗑️</button>
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
            
        bindListItemEvents(modal);
    }

    function bindListItemEvents(modal) {
        const closeModal = () => modal.querySelector('#closeFileManager').click();
        
        modal.querySelectorAll('.load-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const fileKey = btn.dataset.key; 
                try {
                    if(btn.tagName === 'BUTTON') { btn.disabled = true; btn.innerHTML = '⏳'; }
                    
                    const data = await loadFromKV(fileKey);
                    const tasksRaw = Array.isArray(data) ? data : (data.tasks || []);
                    
                    const projectInfo = data.project || { name: "未命名项目" };
                    const lastActionId = projectInfo.lastActionId || null;
                    // ⭐ 提取快照时间戳
                    const snapshotTimestamp = projectInfo.updated || 0;

                    if (window.gantt) {
                        window.gantt.tasks = tasksRaw.map(t => ({...t, id: t.id||generateId(), dependencies: t.dependencies||[]}));
                        document.getElementById('projectTitle').textContent = projectInfo.name;
                        
                        // ⭐ 更新 HistoryManager (传递时间戳)
                        if (window.historyManager) {
                            window.historyManager.filename = fileKey;
                            await window.historyManager.init(fileKey, lastActionId, snapshotTimestamp);
                        }

                        window.gantt.calculateDateRange();
                        window.gantt.switchToOverviewMode();
                        window.gantt.render();
                        
                        addLog(`✅ 已加载: ${projectInfo.name}`);
                    }
                    closeModal();
                } catch(e) { 
                    alert(e.message); 
                    if(btn.tagName === 'BUTTON') { btn.disabled=false; btn.innerHTML='📂 打开'; } 
                }
            };
        });

        modal.querySelectorAll('.download-file-btn').forEach(btn => {
            btn.onclick = async () => { 
                const fileKey = btn.dataset.key;
                try { 
                    const data = await loadFromKV(fileKey); 
                    const dlName = (data.project && data.project.name) ? `${data.project.name}.json` : fileKey;
                    downloadJSON(data, dlName); 
                } catch(e){ alert('下载失败'); } 
            };
        });

        modal.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.onclick = async () => {
                if(!confirm(`确定删除此项目?`)) return;
                try { 
                    const fileKey = btn.dataset.key;
                    await deleteFromKV(fileKey); 
                    deleteFromKV(fileKey.replace('.json', '_history.json')).catch(()=>{});
                    _fileListCache = null; 
                    btn.closest('.list-group-item').remove(); 
                } catch(e) { alert('删除失败'); }
            };
        });
    }
    
    function handleFileUpload(modal) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const uploadBtn = modal.querySelector('#modalUploadBtn');
            if(uploadBtn) { uploadBtn.innerHTML = '⏳'; uploadBtn.disabled = true; }

            try {
                const text = await file.text();
                let jsonData;
                try { jsonData = JSON.parse(text); } catch(err) { throw new Error('无效的 JSON 文件'); }

                // ⭐ 上传新文件，生成一个内部 Key，防止冲突
                const newKey = (typeof generateProjectInternalFilename === 'function') 
                    ? generateProjectInternalFilename() 
                    : `upload_${Date.now()}.json`;

                if (typeof saveToKV === 'function') {
                    // 确保 project.name 存在 (用文件名去掉后缀)
                    if (!jsonData.project) jsonData.project = {};
                    if (!jsonData.project.name) jsonData.project.name = file.name.replace('.json', '');
                    
                    // 保存到云端
                    await saveToKV(newKey, jsonData);
                    if(typeof addLog === 'function') addLog(`☁️ 文件已上传: ${jsonData.project.name}`);
                }

                // 加载数据到视图
                const tasksRaw = Array.isArray(jsonData) ? jsonData : (jsonData.tasks || []);
                const projectInfo = jsonData.project || { name: "导入项目" };
                
                if (window.gantt) {
                    window.gantt.tasks = tasksRaw.map(t => ({...t, id: t.id||generateId(), dependencies: t.dependencies||[]}));
                    
                    const titleEl = document.getElementById('projectTitle');
                    if (titleEl) titleEl.textContent = projectInfo.name;
                    
                    window.gantt.calculateDateRange();
                    window.gantt.switchToOverviewMode();
                    
                    if(typeof refreshPertViewIfActive === 'function') refreshPertViewIfActive();
                    
                    // 上传视为新起点，重置历史
                    if (window.historyManager) {
                        window.historyManager.init(newKey, null);
                    }
                }

                _fileListCache = null;
                modal.querySelector('#closeFileManager').click();
                openFileManager(); // 重新打开以刷新列表
                
            } catch (error) {
                alert(`加载失败: ${error.message}`);
            } finally {
                if(uploadBtn) { uploadBtn.innerHTML = '📤'; uploadBtn.disabled = false; }
            }
        };
        input.click();
    }

    function bindListItemEvents(modal) {
        const closeModal = () => modal.querySelector('#closeFileManager').click();
        
        // 加载
        modal.querySelectorAll('.load-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const fileKey = btn.dataset.key; // 使用 Key
                try {
                    if(btn.tagName === 'BUTTON') { btn.disabled = true; btn.innerHTML = '⏳'; }
                    
                    const data = await loadFromKV(fileKey);
                    const tasksRaw = Array.isArray(data) ? data : (data.tasks || []);
                    
                    // 优先使用 JSON 里的名字，其次回退
                    const projectInfo = data.project || { name: "未命名项目" };
                    const lastActionId = projectInfo.lastActionId || null;

                    if (window.gantt) {
                        window.gantt.tasks = tasksRaw.map(t => ({...t, id: t.id||generateId(), dependencies: t.dependencies||[]}));
                        
                        // 更新 UI 标题
                        const titleEl = document.getElementById('projectTitle');
                        if (titleEl) titleEl.textContent = projectInfo.name;
                        
                        // 更新 HistoryManager (使用 Key)
                        if (window.historyManager) {
                            await window.historyManager.init(fileKey, lastActionId);
                        }

                        window.gantt.calculateDateRange();
                        window.gantt.switchToOverviewMode();
                        window.gantt.render();
                        
                        if(typeof addLog === 'function') addLog(`✅ 加载成功：${projectInfo.name}`); 
                    }
                    closeModal();
                } catch(e) { 
                    alert(e.message); 
                    if(btn.tagName === 'BUTTON') { btn.disabled=false; btn.innerHTML='📂 打开'; } 
                }
            };
        });

        // 下载
        modal.querySelectorAll('.download-file-btn').forEach(btn => {
            btn.onclick = async () => { 
                const fileKey = btn.dataset.key;
                try { 
                    const data = await loadFromKV(fileKey); 
                    // 下载时使用显示名作为文件名，体验更好
                    const dlName = (data.project && data.project.name) ? `${data.project.name}.json` : fileKey;
                    downloadJSON(data, dlName); 
                } catch(e){ alert('下载失败'); } 
            };
        });

        // 删除
        modal.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.onclick = async () => {
                if(!confirm(`确定删除此项目?`)) return;
                const fileKey = btn.dataset.key;
                try { 
                    await deleteFromKV(fileKey); 
                    deleteFromKV(fileKey.replace('.json', '_history.json')).catch(()=>{});
                    _fileListCache = null; 
                    btn.closest('.list-group-item').remove(); 
                    if(typeof addLog === 'function') addLog(`🗑️ 已删除项目`); 
                } catch(e) { alert('删除失败'); }
            };
        });
    }

    // 辅助渲染函数
    function renderSkeleton(modal) {
        modal.querySelector('#fileManagerBody').innerHTML = `<div class="list-group list-group-flush">${`<div class="list-group-item px-3 py-3 bg-white border-bottom"><div class="d-flex gap-3 align-items-center"><div class="skeleton skeleton-badge" style="width:32px;height:32px;"></div><div style="width:70%;"><div class="skeleton skeleton-title"></div></div></div></div>`.repeat(5)}</div>`;
    }
    
    function renderErrorState(modal, msg) { 
        modal.querySelector('#fileManagerBody').innerHTML = `<div class="text-center py-5 text-danger">${msg}</div>`; 
    }

    function bindBaseEvents(modal) {
        const closeModal = () => { modal.classList.remove('show'); setTimeout(() => modal.remove(), 200); };
        modal.querySelector('#closeFileManager').onclick = closeModal;
        modal.querySelector('.dependency-selector-overlay').onclick = closeModal;
        modal.querySelector('#refreshFilesBtn').onclick = () => {
            _fileListCache = null; renderSkeleton(modal); fetchAndRender(modal);
        };
        modal.querySelector('#modalUploadBtn').onclick = () => handleFileUpload(modal);
    }

    console.log('✅ app-file-manager.js loaded (Epsilon51-Full-Restored)');
})();