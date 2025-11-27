// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 云端文件管理模块                                                ▓▓
// ▓▓ 路径: js/app/app-file-manager.js                                ▓▓
// ▓▓ 版本: Epsilon49-DisplayName                                    ▓▓
// ▓▓ 修复: 列表显示后端返回的中文项目名                              ▓▓
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
            // 过滤掉历史文件 (根据 Key 判断)
            // 注意：后端返回的结构现在是 { key: "proj_123.json", name: "我的项目", ... }
            // 或者如果后端没改，我们要在前端兼容。
            // 为了稳妥，这里兼容两种情况：
            // 1. 如果后端返回了 key 字段，用 key 过滤。
            // 2. 如果只返回 name (旧版)，用 name 过滤。
            
            const projectFiles = allFiles.filter(f => {
                const filename = f.key || f.name; 
                return !filename.endsWith('_history.json');
            });
            
            _fileListCache = projectFiles;
            _lastFetchTime = Date.now();
            renderFileList(modal, projectFiles);
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
                        <h6 class="mb-0 fw-bold text-muted">☁️ 云端项目列表</h6>
                        <span class="badge bg-light text-dark border" id="fileCountBadge">加载中...</span>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <button class="btn-header-icon" id="refreshFilesBtn" title="刷新">🔄</button>
                        <button class="btn-header-icon btn-header-success" id="modalUploadBtn" title="上传本地文件">📤</button>
                        <button class="btn-header-icon btn-header-close" id="closeFileManager" title="关闭">✖</button>
                    </div>
                </div>
                <div class="dependency-selector-body" id="fileManagerBody" style="padding: 0; background: #f8f9fa; min-height: 300px;"></div>
                <div class="dependency-selector-footer bg-light border-top">
                    <small class="text-muted">💡 列表显示的是项目外部名称，内部存储使用唯一 ID。</small>
                </div>
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

        if (files.length === 0) {
            body.innerHTML = `<div class="text-center py-5 text-muted">暂无云端存档</div>`;
            return;
        }

        const formatSize = b => b > 1048576 ? `${(b/1048576).toFixed(2)} MB` : `${(b/1024).toFixed(1)} KB`;
        
        body.innerHTML = `<div class="list-group list-group-flush fade-in">${files.map(f => {
            // ⭐ 兼容处理：
            // f.key 是实际文件名 (proj_xx.json)
            // f.name 是显示名称 (我的项目)
            // 如果后端还没生效，f.key 可能不存在，则 fallback 到 f.name
            const fileKey = f.key || f.name; 
            const displayName = f.name; 
            
            return `
            <div class="list-group-item px-3 py-3 bg-white border-bottom">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3" style="flex:1;min-width:0;">
                        <div class="fs-4 text-primary opacity-75">📄</div>
                        <div style="min-width:0;">
                            <!-- 显示中文名称 -->
                            <h6 class="mb-1 fw-bold text-truncate text-dark load-file-btn" 
                                data-filename="${fileKey}" 
                                title="加载: ${displayName}" 
                                style="cursor:pointer;">
                                ${displayName}
                            </h6>
                            <div class="d-flex align-items-center gap-2 text-muted small">
                                <span>📅 ${new Date(f.timestamp).toLocaleString('zh-CN')}</span>
                                <span class="border-start ps-2">📊 ${f.taskCount} 任务</span>
                                <span class="border-start ps-2">💾 ${formatSize(f.size)}</span>
                                <!-- 调试用：显示内部文件名 -->
                                <span class="border-start ps-2 text-black-50" style="font-size:0.6rem">${fileKey}</span>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2 ms-3">
                        <button class="btn btn-sm btn-primary load-file-btn" data-filename="${fileKey}">📂 加载</button>
                        <button class="btn btn-sm btn-outline-secondary download-file-btn" data-filename="${fileKey}" title="下载JSON">⬇️</button>
                        <button class="btn btn-sm btn-outline-danger delete-file-btn" data-filename="${fileKey}" title="删除">🗑️</button>
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
            
        bindListItemEvents(modal);
    }

    // ... (bindBaseEvents, handleFileUpload, renderErrorState, renderSkeleton 保持不变) ...
    // 为节省篇幅，这部分通用逻辑未变动。
    
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

    function handleFileUpload(modal) {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file) return;
            // ... (上传逻辑，与之前一致) ...
            // 重点：如果是新上传，分配一个内部ID
            try {
                const text = await file.text();
                const jsonData = JSON.parse(text);
                
                // ⭐ 本地上传时，如果还没有内部 ID，这里需要生成
                // 但因为是前端直传，我们暂时用文件名作为 ID，或者生成新的
                // 建议：将 file.name 转为 safe name
                // (此处逻辑较复杂，暂时沿用旧逻辑，上传后作为新项目处理)
                if (typeof saveToKV === 'function') {
                    await saveToKV(file.name, jsonData); 
                }
                // ...
                modal.querySelector('#closeFileManager').click();
                openFileManager(); // 重新打开刷新列表
            } catch(e) { alert(e.message); }
        };
        input.click();
    }

    function bindListItemEvents(modal) {
        const closeModal = () => modal.querySelector('#closeFileManager').click();
        
        modal.querySelectorAll('.load-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                try {
                    if(btn.tagName === 'BUTTON') { btn.disabled = true; btn.innerHTML = '⏳'; }
                    
                    const data = await loadFromKV(filename);
                    const tasksRaw = Array.isArray(data) ? data : (data.tasks || []);
                    const projectInfo = data.project || { name: filename.replace('.json', '') };
                    const lastActionId = projectInfo.lastActionId || null;

                    if (window.gantt) {
                        window.gantt.tasks = tasksRaw.map(t => ({...t, id: t.id||generateId(), dependencies: t.dependencies||[]}));
                        
                        // 更新标题
                        const titleEl = document.getElementById('projectTitle');
                        if (titleEl) titleEl.textContent = projectInfo.name;
                        
                        // 更新 historyManager 的 filename 为当前的内部 Key
                        if (window.historyManager) {
                            window.historyManager.filename = filename;
                            await window.historyManager.init(filename, lastActionId);
                        }

                        window.gantt.calculateDateRange();
                        window.gantt.switchToOverviewMode();
                        window.gantt.render();
                    }
                    closeModal();
                } catch(e) { alert(e.message); if(btn.tagName === 'BUTTON') { btn.disabled=false; btn.innerHTML='📂 加载'; } }
            };
        });

        modal.querySelectorAll('.download-file-btn').forEach(btn => {
            btn.onclick = async () => { 
                try { 
                    const data = await loadFromKV(btn.dataset.filename); 
                    downloadJSON(data, btn.dataset.filename); 
                } catch(e){ alert('下载失败'); } 
            };
        });

        modal.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.onclick = async () => {
                if(!confirm(`确定删除此项目?`)) return;
                try { 
                    const filename = btn.dataset.filename;
                    await deleteFromKV(filename); 
                    deleteFromKV(filename.replace('.json', '_history.json')).catch(()=>{});
                    _fileListCache = null; 
                    btn.closest('.list-group-item').remove(); 
                } catch(e) { alert('删除失败'); }
            };
        });
    }

    console.log('✅ app-file-manager.js loaded (Epsilon49-DisplayName)');
})();