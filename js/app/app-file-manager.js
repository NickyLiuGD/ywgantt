// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 云端文件管理模块 (独立完整版)                                    ▓▓
// ▓▓ 路径: js/app/app-file-manager.js                                ▓▓
// ▓▓ 版本: Epsilon24 - 纯图标按钮 + 独立上传逻辑 + 模式统一          ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    // 简单的内存缓存，避免频繁请求 KV API
    let _fileListCache = null;
    let _lastFetchTime = 0;
    const CACHE_DURATION = 30 * 1000; // 30秒

    // 绑定主按钮入口
    const manageFilesBtn = document.getElementById('manageFiles');
    if (!manageFilesBtn) return;

    // 点击打开文件管理器
    manageFilesBtn.onclick = () => {
        // 1. 立即显示模态框外壳
        const modal = createModalShell();
        
        // 2. 检查缓存是否有效
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
     * 从网络获取文件列表并渲染
     */
    async function fetchAndRender(modal) {
        try {
            const files = await listKVFiles();
            
            // 更新缓存
            _fileListCache = files;
            _lastFetchTime = Date.now();
            
            renderFileList(modal, files);
        } catch (error) {
            console.error('文件列表加载失败:', error);
            renderErrorState(modal, error.message);
        }
    }

    /**
     * 创建模态框外壳 (Shell)
     * 包含头部图标按钮和底部提示，主体部分留空待填充
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
                <!-- 头部区域：统一图标风格 -->
                <div class="dependency-selector-header">
                    <div class="d-flex gap-2 align-items-center">
                        <h6 class="mb-0 fw-bold text-muted">☁️ 云端文件库</h6>
                        <span class="badge bg-light text-dark border" id="fileCountBadge">加载中...</span>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <!-- 刷新按钮 -->
                        <button class="btn-header-icon" id="refreshFilesBtn" title="刷新列表">
                            🔄
                        </button>
                        
                        <!-- 上传按钮 (纯图标) -->
                        <button class="btn-header-icon btn-header-success" id="modalUploadBtn" title="上传本地文件">
                            📤
                        </button>
                        
                        <!-- 关闭按钮 (图案化) -->
                        <button class="btn-header-icon btn-header-close" id="closeFileManager" title="关闭">
                            ✖
                        </button>
                    </div>
                </div>
                
                <!-- 主体内容区 (初始为空) -->
                <div class="dependency-selector-body" id="fileManagerBody" style="padding: 0; background: #f8f9fa; min-height: 300px;"></div>
                
                <!-- 底部提示 -->
                <div class="dependency-selector-footer bg-light border-top">
                    <small class="text-muted">💡 提示：点击 📤 可直接将本地 JSON 导入云端并打开。</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定基础事件 (关闭、刷新、上传)
        bindBaseEvents(modal);
        
        // 显示入场动画
        requestAnimationFrame(() => modal.classList.add('show'));
        
        return modal;
    }

    /**
     * 核心：独立上传处理逻辑
     * 不依赖任何外部按钮，完全自包含
     */
    function handleFileUpload(modal) {
        // 创建隐藏的文件输入框
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 视觉反馈
            const uploadBtn = modal.querySelector('#modalUploadBtn');
            if (uploadBtn) {
                uploadBtn.innerHTML = '⏳'; // 加载中图标
                uploadBtn.disabled = true;
            }

            try {
                // 1. 读取本地文件
                const text = await file.text();
                let jsonData;
                try {
                    jsonData = JSON.parse(text);
                } catch (err) {
                    throw new Error('文件格式错误，必须是有效的 JSON 文件');
                }

                // 2. 上传到 Cloudflare KV
                await saveToKV(file.name, jsonData);
                addLog(`☁️ 文件已上传: ${file.name}`);

                // 3. 直接加载数据到当前视图 (无需重新下载)
                const tasksRaw = Array.isArray(jsonData) ? jsonData : (jsonData.tasks || []);
                
                // 数据标准化 (补全ID等)
                const tasks = tasksRaw.map(t => ({
                    ...t,
                    id: t.id || generateId(),
                    dependencies: t.dependencies || []
                }));
                
                // 渲染甘特图
                gantt.tasks = tasks;
                gantt.calculateDateRange();
                gantt.render();
                
                // 如果在 PERT 视图，刷新 PERT
                if (typeof refreshPertViewIfActive === 'function') {
                    refreshPertViewIfActive();
                }

                // 4. 刷新列表缓存并提示成功
                _fileListCache = null; // 清除缓存以便下次打开看到新文件
                
                // 延迟关闭模态框
                const closeBtn = modal.querySelector('#closeFileManager');
                if (closeBtn) closeBtn.click();
                
                setTimeout(() => {
                    alert(`✅ 上传并加载成功: ${file.name}`);
                }, 300);

            } catch (error) {
                console.error('上传失败:', error);
                alert(`上传失败: ${error.message}`);
            } finally {
                // 恢复按钮状态
                if (uploadBtn) {
                    uploadBtn.innerHTML = '📤';
                    uploadBtn.disabled = false;
                }
            }
        };
        
        input.click(); // 触发文件选择
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

        // 空状态处理
        if (files.length === 0) {
            body.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <div style="font-size: 3rem; opacity: 0.3; margin-bottom: 10px;">📭</div>
                    <p class="mb-2">云端暂无存档</p>
                    <button class="btn btn-outline-primary btn-sm mt-2" onclick="document.getElementById('modalUploadBtn').click()">
                        📤 立即上传
                    </button>
                </div>
            `;
            return;
        }

        // 文件大小格式化
        const formatSize = (bytes) => {
            if (!bytes) return '0 KB';
            const kb = bytes / 1024;
            return kb > 1024 ? `${(kb/1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
        };

        // 生成列表 HTML
        const listHtml = files.map(file => `
            <div class="list-group-item px-3 py-3" data-filename="${file.name}" style="background: white; border-bottom: 1px solid #eee; transition: all 0.2s;">
                <div class="d-flex justify-content-between align-items-center">
                    <!-- 左侧信息 -->
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
                    
                    <!-- 右侧操作按钮 -->
                    <div class="d-flex gap-2 ms-3">
                        <button class="btn btn-sm btn-primary load-file-btn d-flex align-items-center gap-1" 
                                data-filename="${file.name}" title="加载此文件">
                            📂 加载
                        </button>
                        <button class="btn btn-sm btn-outline-secondary download-file-btn" 
                                data-filename="${file.name}" title="下载到本地">
                            ⬇️
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-file-btn" 
                                data-filename="${file.name}" title="删除">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        body.innerHTML = `<div class="list-group list-group-flush fade-in">${listHtml}</div>`;
        
        // 绑定列表项事件
        bindListItemEvents(modal);
    }

    /**
     * 渲染错误状态
     */
    function renderErrorState(modal, message) {
        const body = modal.querySelector('#fileManagerBody');
        body.innerHTML = `
            <div class="text-center py-5 text-danger">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                <p class="mb-2 fw-bold">无法获取文件列表</p>
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

        // 刷新按钮逻辑
        modal.querySelector('#refreshFilesBtn').onclick = () => {
            // 旋转动画
            const btn = modal.querySelector('#refreshFilesBtn');
            btn.style.transition = 'transform 0.5s ease';
            btn.style.transform = 'rotate(360deg)';
            setTimeout(() => btn.style.transform = 'none', 500);

            _fileListCache = null; // 强制清除缓存
            renderSkeleton(modal);
            fetchAndRender(modal);
        };

        // ⭐ 绑定上传按钮逻辑
        modal.querySelector('#modalUploadBtn').onclick = () => handleFileUpload(modal);
    }

    /**
     * 绑定列表项操作 (加载、下载、删除)
     */
    function bindListItemEvents(modal) {
        const closeModal = () => modal.querySelector('#closeFileManager').click();

        // 1. 加载文件
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

                    if (tasks.length === 0) throw new Error("文件内容为空");

                    gantt.tasks = tasks;
                    gantt.calculateDateRange();
                    gantt.render();
                    
                    if (typeof refreshPertViewIfActive === 'function') {
                        refreshPertViewIfActive();
                    }
                    
                    addLog(`✅ 已加载云端存档：${filename}`);
                    closeModal();
                    
                } catch (error) {
                    alert(`加载失败：${error.message}`);
                    btn.disabled = false;
                    btn.innerHTML = '📂 加载';
                }
            };
        });

        // 2. 下载到本地
        modal.querySelectorAll('.download-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                try {
                    const data = await loadFromKV(filename);
                    downloadJSON(data, filename);
                    addLog(`✅ 已下载：${filename}`);
                } catch (error) {
                    alert('下载失败：' + error.message);
                }
            };
        });

        // 3. 删除文件
        modal.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                
                if (!confirm(`🔴 确定永久删除 \"${filename}\" 吗？`)) return;

                try {
                    btn.innerHTML = '⏳';
                    btn.disabled = true;
                    
                    await deleteFromKV(filename);
                    
                    // 动画移除 DOM
                    const item = modal.querySelector(`.list-group-item[data-filename="${filename}"]`);
                    if (item) {
                        item.style.transition = 'all 0.3s ease';
                        item.style.opacity = 0;
                        item.style.transform = 'translateX(20px)';
                        setTimeout(() => item.remove(), 300);
                    }

                    // 更新缓存
                    if (_fileListCache) {
                        _fileListCache = _fileListCache.filter(f => f.name !== filename);
                        modal.querySelector('#fileCountBadge').textContent = `${_fileListCache.length} 个文件`;
                    }
                    
                    // 如果删空了
                    setTimeout(() => {
                        if (modal.querySelectorAll('.list-group-item').length === 0) {
                            renderFileList(modal, []);
                        }
                    }, 350);
                    
                    addLog(`🗑️ 已删除：${filename}`);
                    
                } catch (error) {
                    alert('删除失败：' + error.message);
                    btn.disabled = false;
                    btn.innerHTML = '🗑️';
                }
            };
        });
    }

    console.log('✅ app-file-manager.js loaded successfully (Epsilon24)');

})();