// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 云端文件管理模块 (高性能版)                                      ▓▓
// ▓▓ 路径: js/app/app-file-manager.js                                ▓▓
// ▓▓ 版本: Epsilon20 - 骨架屏加载 + 本地缓存优化                     ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    // 简单的内存缓存
    let _fileListCache = null;
    let _lastFetchTime = 0;
    const CACHE_DURATION = 30 * 1000; // 缓存有效期 30 秒

    const manageFilesBtn = document.getElementById('manageFiles');
    if (!manageFilesBtn) return;

    // 打开文件管理器 (立即打开，异步加载)
    manageFilesBtn.onclick = () => {
        // 1. 立即显示模态框外壳
        const modal = createModalShell();
        
        // 2. 判断是否使用缓存
        const now = Date.now();
        if (_fileListCache && (now - _lastFetchTime < CACHE_DURATION)) {
            console.log('🚀 使用缓存的文件列表');
            renderFileList(modal, _fileListCache);
        } else {
            // 3. 无缓存：先显示骨架屏，再请求网络
            renderSkeleton(modal);
            fetchAndRender(modal);
        }
    };

    /**
     * 从网络获取并渲染
     */
    async function fetchAndRender(modal) {
        try {
            // 获取数据
            const files = await listKVFiles();
            
            // 更新缓存
            _fileListCache = files;
            _lastFetchTime = Date.now();
            
            // 渲染真实数据
            renderFileList(modal, files);
            
        } catch (error) {
            console.error('文件列表加载失败:', error);
            renderErrorState(modal, error.message);
        }
    }

    /**
     * 创建模态框外壳 (Shell)
     */
    function createModalShell() {
        // 移除旧模态框
        const oldModal = document.querySelector('.dependency-selector-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.className = 'dependency-selector-modal';
        
        modal.innerHTML = `
            <div class="dependency-selector-overlay"></div>
            <div class="dependency-selector-content" style="width: 650px; max-height: 80vh;">
                <!-- 头部 -->
                <div class="dependency-selector-header">
                    <div class="d-flex gap-2 align-items-center">
                        <h6 class="mb-0 fw-bold text-muted">☁️ 云端文件库</h6>
                        <span class="badge bg-light text-dark border" id="fileCountBadge">加载中...</span>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" id="refreshFilesBtn" title="刷新列表">🔄</button>
                        <button class="btn btn-sm btn-success d-flex align-items-center gap-1" id="modalUploadBtn">
                            <span>📤</span> 上传
                        </button>
                        <button type="button" class="btn-close" id="closeFileManager"></button>
                    </div>
                </div>
                
                <!-- 主体内容区 (初始为空) -->
                <div class="dependency-selector-body" id="fileManagerBody" style="padding: 0; background: #f8f9fa; min-height: 300px;"></div>
                
                <!-- 底部 -->
                <div class="dependency-selector-footer bg-light border-top">
                    <small class="text-muted">💡 提示：点击"上传"可直接导入本地 JSON。</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        bindBaseEvents(modal);
        requestAnimationFrame(() => modal.classList.add('show'));
        return modal;
    }

    /**
     * 渲染骨架屏 (Loading State)
     */
    function renderSkeleton(modal) {
        const body = modal.querySelector('#fileManagerBody');
        const badge = modal.querySelector('#fileCountBadge');
        if (badge) badge.textContent = '...';

        // 生成 5 个骨架占位项
        const skeletonItem = `
            <div class="list-group-item px-3 py-3" style="background: white; border-bottom: 1px solid #eee;">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3" style="flex: 1;">
                        <div class="skeleton skeleton-badge" style="width: 32px; height: 32px; border-radius: 4px;"></div>
                        <div style="width: 70%;">
                            <div class="skeleton skeleton-title"></div>
                            <div class="skeleton skeleton-text" style="width: 40%;"></div>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <div class="skeleton skeleton-btn"></div>
                        <div class="skeleton skeleton-btn" style="width: 30px;"></div>
                    </div>
                </div>
            </div>
        `;
        
        body.innerHTML = `<div class="list-group list-group-flush">${skeletonItem.repeat(5)}</div>`;
    }

    /**
     * 渲染真实文件列表
     */
    function renderFileList(modal, files) {
        const body = modal.querySelector('#fileManagerBody');
        const badge = modal.querySelector('#fileCountBadge');
        
        if (badge) badge.textContent = `${files.length} 个文件`;

        if (files.length === 0) {
            body.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <div style="font-size: 3rem; opacity: 0.3; margin-bottom: 10px;">📭</div>
                    <p class="mb-2">云端暂无存档</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="document.getElementById('modalUploadBtn').click()">
                        📤 立即上传
                    </button>
                </div>
            `;
            return;
        }

        const formatSize = (bytes) => {
            if (!bytes) return '0 KB';
            const kb = bytes / 1024;
            return kb > 1024 ? `${(kb/1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
        };

        const listHtml = files.map(file => `
            <div class="list-group-item px-3 py-3 file-item" data-filename="${file.name}" style="background: white; border-bottom: 1px solid #eee; transition: all 0.2s;">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3" style="flex: 1; min-width: 0;">
                        <div class="fs-4 text-primary opacity-75">📄</div>
                        <div style="min-width: 0;">
                            <h6 class="mb-1 fw-bold text-truncate text-dark" title="${file.name}">${file.name}</h6>
                            <div class="d-flex align-items-center gap-2 text-muted small">
                                <span>📅 ${new Date(file.timestamp).toLocaleString('zh-CN')}</span>
                                <span class="border-start ps-2">📊 <span class="text-info fw-semibold">${file.taskCount}</span> 任务</span>
                                <span class="border-start ps-2">💾 ${formatSize(file.size)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2 ms-3">
                        <button class="btn btn-sm btn-primary load-file-btn" data-filename="${file.name}">📂 加载</button>
                        <button class="btn btn-sm btn-outline-secondary download-file-btn" data-filename="${file.name}" title="下载">⬇️</button>
                        <button class="btn btn-sm btn-outline-danger delete-file-btn" data-filename="${file.name}" title="删除">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');

        body.innerHTML = `<div class="list-group list-group-flush fade-in">${listHtml}</div>`;
        
        // 简单的淡入动画
        body.querySelector('.fade-in').animate([
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 300, easing: 'ease-out' });

        // 绑定列表项事件
        bindListItemEvents(modal);
    }

    /**
     * 渲染错误状态
     */
    function renderErrorState(modal, message) {
        const body = modal.querySelector('#fileManagerBody');
        const badge = modal.querySelector('#fileCountBadge');
        if (badge) badge.textContent = '错误';

        body.innerHTML = `
            <div class="text-center py-5 text-danger">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                <p class="mb-2 fw-bold">加载失败</p>
                <small class="d-block text-muted mb-3" style="max-width: 80%; margin: 0 auto;">${message}</small>
                <button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('refreshFilesBtn').click()">
                    🔄 重试
                </button>
            </div>
        `;
    }

    /**
     * 绑定基础事件 (关闭、刷新、上传)
     */
    function bindBaseEvents(modal) {
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('#closeFileManager').onclick = closeModal;
        modal.querySelector('.dependency-selector-overlay').onclick = closeModal;

        // 刷新按钮
        modal.querySelector('#refreshFilesBtn').onclick = () => {
            _fileListCache = null; // 清除缓存
            renderSkeleton(modal);
            fetchAndRender(modal);
        };

        // 上传按钮联动
        modal.querySelector('#modalUploadBtn').onclick = () => {
            const globalUploadBtn = document.getElementById('uploadToCloud');
            if (globalUploadBtn) {
                closeModal();
                setTimeout(() => globalUploadBtn.click(), 100);
            } else {
                alert("未找到上传组件");
            }
        };
    }

    /**
     * 绑定列表项的具体操作事件
     */
    function bindListItemEvents(modal) {
        // 加载
        modal.querySelectorAll('.load-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                try {
                    btn.disabled = true;
                    btn.innerHTML = '⏳';
                    
                    const data = await loadFromKV(filename);
                    const tasksRaw = Array.isArray(data) ? data : (data.tasks || []);
                    const tasks = tasksRaw.map(t => ({
                        ...t, 
                        id: t.id || generateId(), 
                        dependencies: t.dependencies || [] 
                    }));

                    if (tasks.length === 0) throw new Error("文件为空");

                    gantt.tasks = tasks;
                    gantt.calculateDateRange();
                    gantt.render();
                    
                    if (typeof refreshPertViewIfActive === 'function') refreshPertViewIfActive();
                    
                    addLog(`✅ 加载成功：${filename}`);
                    modal.querySelector('#closeFileManager').click();
                } catch (err) {
                    alert('加载失败: ' + err.message);
                    btn.disabled = false;
                    btn.innerHTML = '📂 加载';
                }
            };
        });

        // 下载
        modal.querySelectorAll('.download-file-btn').forEach(btn => {
            btn.onclick = async () => {
                try {
                    const data = await loadFromKV(btn.dataset.filename);
                    downloadJSON(data, btn.dataset.filename);
                } catch (err) {
                    alert('下载失败');
                }
            };
        });

        // 删除
        modal.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                if (!confirm(`确定永久删除 \"${filename}\" 吗？`)) return;

                try {
                    btn.innerHTML = '⏳';
                    await deleteFromKV(filename);
                    
                    // 移除DOM并更新缓存
                    const row = modal.querySelector(`.list-group-item[data-filename="${filename}"]`);
                    if (row) row.remove();
                    
                    if (_fileListCache) {
                        _fileListCache = _fileListCache.filter(f => f.name !== filename);
                        modal.querySelector('#fileCountBadge').textContent = `${_fileListCache.length} 个文件`;
                    }
                    
                    if (modal.querySelectorAll('.list-group-item').length === 0) {
                        // 如果删空了，重新渲染空状态
                        renderFileList(modal, []); 
                    }
                    
                    addLog(`🗑️ 已删除：${filename}`);
                } catch (err) {
                    alert('删除失败');
                    btn.innerHTML = '🗑️';
                }
            };
        });
    }

    console.log('✅ app-file-manager.js loaded (Epsilon20 - Optimized)');
})();