// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 云端文件管理模块                                                ▓▓
// ▓▓ 路径: js/app/app-file-manager.js                                ▓▓
// ▓▓ 版本: Epsilon30-FixRefError                                    ▓▓
// ▓▓ 修复: 解决 manageFilesBtn 未定义错误 + 支持多按钮触发          ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    let _fileListCache = null;
    let _lastFetchTime = 0;
    const CACHE_DURATION = 30 * 1000;

    // 定义所有可能触发文件管理的按钮 ID
    const triggerButtonIds = ['manageFiles', 'btnSwitchProject'];

    // 遍历绑定事件
    triggerButtonIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = (e) => {
                if (e) e.stopPropagation(); // 防止冒泡关闭菜单
                openFileManager();
            };
        }
    });

    /**
     * 打开文件管理器主逻辑
     */
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
            const files = await listKVFiles();
            _fileListCache = files;
            _lastFetchTime = Date.now();
            renderFileList(modal, files);
        } catch (error) {
            renderErrorState(modal, error.message);
        }
    }

    function createModalShell() {
        const oldModal = document.querySelector('.dependency-selector-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.className = 'dependency-selector-modal';
        modal.innerHTML = `
            <div class="dependency-selector-overlay"></div>
            <div class="dependency-selector-content" style="width: 650px; max-height: 80vh;">
                <div class="dependency-selector-header">
                    <div class="d-flex gap-2 align-items-center">
                        <h6 class="mb-0 fw-bold text-muted">☁️ 云端文件库</h6>
                        <span class="badge bg-light text-dark border" id="fileCountBadge">加载中...</span>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <button class="btn-header-icon" id="refreshFilesBtn" title="刷新列表">🔄</button>
                        <button class="btn-header-icon btn-header-success" id="modalUploadBtn" title="上传本地文件">📤</button>
                        <button class="btn-header-icon btn-header-close" id="closeFileManager" title="关闭">✖</button>
                    </div>
                </div>
                <div class="dependency-selector-body" id="fileManagerBody" style="padding: 0; background: #f8f9fa; min-height: 300px;"></div>
                <div class="dependency-selector-footer bg-light border-top">
                    <small class="text-muted">💡 提示：点击 📤 可直接将本地 JSON 导入云端并打开。</small>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindBaseEvents(modal);
        requestAnimationFrame(() => modal.classList.add('show'));
        return modal;
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

                // 尝试调用 KV 保存，如果未配置 KV 则仅本地加载
                if (typeof saveToKV === 'function') {
                    await saveToKV(file.name, jsonData);
                    addLog(`☁️ 文件已上传: ${file.name}`);
                }

                // 加载数据到甘特图
                const tasksRaw = Array.isArray(jsonData) ? jsonData : (jsonData.tasks || []);
                const projectInfo = jsonData.project || { name: file.name.replace('.json', '') };
                
                const tasks = tasksRaw.map(t => ({
                    ...t, 
                    id: t.id || generateId(), 
                    dependencies: t.dependencies || []
                }));
                
                if (window.gantt) {
                    // 更新数据
                    window.gantt.tasks = tasks;
                    
                    // 更新标题
                    const titleEl = document.getElementById('projectTitle');
                    if (titleEl) titleEl.textContent = projectInfo.name;
                    
                    // 切换视图
                    window.gantt.switchToOverviewMode();
                    if(typeof refreshPertViewIfActive === 'function') refreshPertViewIfActive();
                }

                _fileListCache = null; // 清除缓存以显示新文件
                modal.querySelector('#closeFileManager').click();
                
            } catch (error) {
                alert(`加载失败: ${error.message}`);
            } finally {
                if(uploadBtn) { uploadBtn.innerHTML = '📤'; uploadBtn.disabled = false; }
            }
        };
        input.click();
    }

    function renderSkeleton(modal) {
        const body = modal.querySelector('#fileManagerBody');
        body.innerHTML = `<div class="list-group list-group-flush">${
            `<div class="list-group-item px-3 py-3" style="background:white;border-bottom:1px solid #eee;">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3" style="flex:1;">
                        <div class="skeleton skeleton-badge" style="width:32px;height:32px;border-radius:4px;"></div>
                        <div style="width:70%;"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width:40%;"></div></div>
                    </div>
                </div>
            </div>`.repeat(5)}</div>`;
    }

    function renderFileList(modal, files) {
        const body = modal.querySelector('#fileManagerBody');
        const badge = modal.querySelector('#fileCountBadge');
        if (badge) badge.textContent = `${files.length} 个文件`;

        if (files.length === 0) {
            body.innerHTML = `<div class="text-center py-5 text-muted"><div style="font-size:3rem;opacity:0.3;margin-bottom:10px;">📭</div><p class="mb-2">云端暂无存档</p><button class="btn btn-outline-primary btn-sm mt-2" onclick="document.getElementById('modalUploadBtn').click()">📤 立即上传</button></div>`;
            return;
        }

        const formatSize = b => b > 1048576 ? `${(b/1048576).toFixed(2)} MB` : `${(b/1024).toFixed(1)} KB`;
        
        body.innerHTML = `<div class="list-group list-group-flush fade-in">${files.map(f => `
            <div class="list-group-item px-3 py-3" data-filename="${f.name}" style="background:white;border-bottom:1px solid #eee;">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3" style="flex:1;min-width:0;">
                        <div class="fs-4 text-primary opacity-75">📄</div>
                        <div style="min-width:0;">
                            <h6 class="mb-1 fw-bold text-truncate text-dark" title="${f.name}" style="cursor:pointer;" onclick="this.closest('.list-group-item').querySelector('.load-file-btn').click()">${f.name}</h6>
                            <div class="d-flex align-items-center gap-2 text-muted small">
                                <span>📅 ${new Date(f.timestamp).toLocaleString('zh-CN')}</span>
                                <span class="border-start ps-2">📊 ${f.taskCount} 任务</span>
                                <span class="border-start ps-2">💾 ${formatSize(f.size)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2 ms-3">
                        <button class="btn btn-sm btn-primary load-file-btn" data-filename="${f.name}">📂 加载</button>
                        <button class="btn btn-sm btn-outline-secondary download-file-btn" data-filename="${f.name}" title="下载">⬇️</button>
                        <button class="btn btn-sm btn-outline-danger delete-file-btn" data-filename="${f.name}" title="删除">🗑️</button>
                    </div>
                </div>
            </div>`).join('')}</div>`;
            
        bindListItemEvents(modal);
    }

    function renderErrorState(modal, msg) { 
        modal.querySelector('#fileManagerBody').innerHTML = `<div class="text-center py-5 text-danger"><p>${msg}</p><button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('refreshFilesBtn').click()">🔄 重试</button></div>`; 
    }

    function bindBaseEvents(modal) {
        const closeModal = () => { modal.classList.remove('show'); setTimeout(() => modal.remove(), 200); };
        modal.querySelector('#closeFileManager').onclick = closeModal;
        modal.querySelector('.dependency-selector-overlay').onclick = closeModal;
        
        modal.querySelector('#refreshFilesBtn').onclick = () => {
            const btn = modal.querySelector('#refreshFilesBtn');
            btn.style.transform = 'rotate(360deg)'; setTimeout(() => btn.style.transform = 'none', 500);
            _fileListCache = null; renderSkeleton(modal); fetchAndRender(modal);
        };
        modal.querySelector('#modalUploadBtn').onclick = () => handleFileUpload(modal);
    }

    function bindListItemEvents(modal) {
        const closeModal = () => modal.querySelector('#closeFileManager').click();
        
        modal.querySelectorAll('.load-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                try {
                    btn.disabled = true; btn.innerHTML = '⏳';
                    const data = await loadFromKV(filename);
                    const tasksRaw = Array.isArray(data) ? data : (data.tasks || []);
                    const projectInfo = data.project || { name: filename.replace('.json', '') };
                    
                    const tasks = tasksRaw.map(t => ({...t, id: t.id||generateId(), dependencies: t.dependencies||[]}));
                    
                    if (window.gantt) {
                        window.gantt.tasks = tasks;
                        
                        // 更新标题
                        const titleEl = document.getElementById('projectTitle');
                        if (titleEl) titleEl.textContent = projectInfo.name;

                        // ⭐ 加载成功后自动切换全貌
                        window.gantt.switchToOverviewMode();
                        
                        if(typeof refreshPertViewIfActive === 'function') refreshPertViewIfActive();
                        addLog(`✅ 加载成功：${filename}`); 
                    }
                    closeModal();
                } catch(e) { alert(e.message); btn.disabled=false; btn.innerHTML='📂 加载'; }
            };
        });

        modal.querySelectorAll('.download-file-btn').forEach(btn => {
            btn.onclick = async () => { try { const data = await loadFromKV(btn.dataset.filename); downloadJSON(data, btn.dataset.filename); } catch(e){ alert('下载失败'); } };
        });

        modal.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.onclick = async () => {
                if(!confirm(`确定删除 ${btn.dataset.filename}?`)) return;
                try { await deleteFromKV(btn.dataset.filename); _fileListCache=null; btn.closest('.list-group-item').remove(); addLog(`🗑️ 已删除: ${btn.dataset.filename}`); } catch(e) { alert('删除失败'); }
            };
        });
    }

    console.log('✅ app-file-manager.js loaded (Epsilon30-FixRefError)');
})();