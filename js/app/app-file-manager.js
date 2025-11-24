// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 云端文件管理模块                                                ▓▓
// ▓▓ 路径: js/app/app-file-manager.js                                ▓▓
// ▓▓ 版本: Epsilon19 - 优化UI布局 + 集成上传入口                    ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    const manageFilesBtn = document.getElementById('manageFiles');
    if (!manageFilesBtn) return;

    // 打开文件管理器
    manageFilesBtn.onclick = async () => {
        // 视觉反馈：按钮加载状态
        const originalHtml = manageFilesBtn.innerHTML;
        manageFilesBtn.innerHTML = '<span class="btn-icon icon">⏳</span><span class="btn-text">加载中...</span>';
        manageFilesBtn.disabled = true;

        try {
            const files = await listKVFiles();
            showFileManagerModal(files);
        } catch (error) {
            console.error('获取文件列表失败:', error);
            alert('无法连接到云端存储，请检查网络或配置。\n错误信息：' + error.message);
        } finally {
            // 恢复按钮状态
            manageFilesBtn.innerHTML = originalHtml;
            manageFilesBtn.disabled = false;
        }
    };

    /**
     * 显示文件管理对话框 (UI 优化版)
     */
    function showFileManagerModal(files) {
        // 移除可能存在的旧模态框
        const oldModal = document.querySelector('.dependency-selector-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.className = 'dependency-selector-modal';
        
        // 格式化辅助函数
        const formatSize = (bytes) => {
            if (!bytes) return '0 KB';
            const kb = bytes / 1024;
            return kb > 1024 ? `${(kb/1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
        };

        // 模态框 HTML 结构
        modal.innerHTML = `
            <div class="dependency-selector-overlay"></div>
            <div class="dependency-selector-content" style="width: 650px; max-height: 80vh;">
                <!-- 头部：标题 + 统计 + 上传按钮 -->
                <div class="dependency-selector-header">
                    <div class="d-flex gap-2 align-items-center">
                        <h6 class="mb-0 fw-bold text-muted">☁️ 云端文件库</h6>
                        <span class="badge bg-light text-dark border" id="fileCountBadge">${files.length} 个文件</span>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-success d-flex align-items-center gap-1" id="modalUploadBtn" title="上传本地文件">
                            <span style="font-size: 1rem;">📤</span> 上传新文件
                        </button>
                        <button type="button" class="btn-close" id="closeFileManager" aria-label="关闭"></button>
                    </div>
                </div>
                
                <!-- 主体：文件列表 -->
                <div class="dependency-selector-body" style="padding: 0; background: #f8f9fa;">
                    ${files.length === 0 ? `
                        <!-- 空状态 -->
                        <div class="text-center py-5 text-muted">
                            <div style="font-size: 3rem; opacity: 0.3; margin-bottom: 10px;">📭</div>
                            <p class="mb-2">云端暂无存档</p>
                            <small class="d-block mb-3">点击右上角或下方按钮上传您的第一个项目</small>
                            <button class="btn btn-outline-primary btn-sm" onclick="document.getElementById('modalUploadBtn').click()">
                                📤 立即上传
                            </button>
                        </div>
                    ` : `
                        <!-- 列表状态 -->
                        <div class="list-group list-group-flush" id="fileListContainer">
                            ${files.map(file => `
                                <div class="list-group-item px-3 py-3" data-filename="${file.name}" style="background: white; border-bottom: 1px solid #eee;">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <!-- 文件图标与信息 -->
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
                                        
                                        <!-- 操作按钮组 -->
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
                            `).join('')}
                        </div>
                    `}
                </div>
                
                <!-- 底部：提示信息 -->
                <div class="dependency-selector-footer bg-light border-top">
                    <small class="text-muted">💡 提示：加载文件将覆盖当前画板。建议先保存当前工作。</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        bindFileManagerEvents(modal);
        
        // 显示动画
        requestAnimationFrame(() => modal.classList.add('show'));
    }

    /**
     * 绑定文件管理器内部事件
     */
    function bindFileManagerEvents(modal) {
        const closeBtn = modal.querySelector('#closeFileManager');
        const overlay = modal.querySelector('.dependency-selector-overlay');
        const modalUploadBtn = modal.querySelector('#modalUploadBtn');
        
        // 关闭逻辑
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 200);
        };
        
        if (closeBtn) closeBtn.onclick = closeModal;
        if (overlay) overlay.onclick = closeModal;
        
        // ⭐ 模态框内上传按钮 -> 联动全局上传按钮
        if (modalUploadBtn) {
            modalUploadBtn.onclick = () => {
                const globalUploadBtn = document.getElementById('uploadToCloud');
                if (globalUploadBtn) {
                    closeModal(); // 先关闭模态框
                    // 延迟一点触发，让模态框消失动画更自然
                    setTimeout(() => globalUploadBtn.click(), 100); 
                } else {
                    alert("错误：未在工具栏找到上传功能组件 (ID: uploadToCloud)");
                }
            };
        }
        
        // 加载文件按钮
        modal.querySelectorAll('.load-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                
                try {
                    // UI loading
                    btn.disabled = true;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '⏳ 读取...';
                    
                    // 1. 从 KV 下载
                    const data = await loadFromKV(filename);
                    
                    // 2. 解析数据结构 (兼容纯数组和对象包装)
                    const tasksRaw = Array.isArray(data) ? data : (data.tasks || []);
                    
                    // 3. 数据标准化 (补全 ID, 依赖数组等)
                    const tasks = tasksRaw.map(t => ({
                        ...t,
                        id: t.id || generateId(),
                        dependencies: t.dependencies || []
                    }));
                    
                    if (tasks.length === 0) {
                        throw new Error("文件内容为空或格式不正确");
                    }
                    
                    // 4. 渲染视图
                    gantt.tasks = tasks;
                    gantt.calculateDateRange();
                    gantt.render();
                    
                    // 5. 如果处于 PERT 视图，刷新它
                    if (typeof refreshPertViewIfActive === 'function') {
                        refreshPertViewIfActive();
                    }
                    
                    addLog(`✅ 已从云端加载存档：${filename}（${tasks.length} 个任务）`);
                    closeModal();
                    
                } catch (error) {
                    console.error(error);
                    alert(`加载失败：${error.message}`);
                    btn.disabled = false;
                    btn.innerHTML = '📂 加载';
                }
            };
        });
        
        // 下载到本地按钮
        modal.querySelectorAll('.download-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                try {
                    btn.disabled = true;
                    const data = await loadFromKV(filename);
                    downloadJSON(data, filename);
                    addLog(`✅ 已下载到本地：${filename}`);
                    btn.disabled = false;
                } catch (error) {
                    alert('下载失败：' + error.message);
                    btn.disabled = false;
                }
            };
        });
        
        // 删除文件按钮
        modal.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                
                if (!confirm(`🔴 警告：确定要永久删除文件 \"${filename}\" 吗？\n\n此操作无法撤销！`)) {
                    return;
                }
                
                try {
                    btn.disabled = true;
                    btn.innerHTML = '⏳';
                    
                    await deleteFromKV(filename);
                    
                    // 移除 DOM 元素
                    const item = modal.querySelector(`.list-group-item[data-filename="${filename}"]`);
                    if (item) {
                        item.style.height = item.offsetHeight + 'px';
                        item.style.transition = 'all 0.3s ease';
                        item.style.opacity = 0;
                        item.style.transform = 'translateX(20px)';
                        
                        setTimeout(() => {
                            item.remove();
                            
                            // 更新计数
                            const list = modal.querySelector('#fileListContainer');
                            const remaining = list ? list.children.length : 0;
                            
                            const badge = modal.querySelector('#fileCountBadge');
                            if (badge) badge.textContent = `${remaining} 个文件`;
                            
                            // 如果删空了，刷新模态框显示空状态（重新拉取列表最简单）
                            if (remaining === 0) {
                                closeModal();
                                alert('所有文件已删除');
                            }
                        }, 300);
                    }
                    
                    addLog(`🗑️ 已删除云端文件：${filename}`);
                    
                } catch (error) {
                    alert('删除失败：' + error.message);
                    btn.disabled = false;
                    btn.innerHTML = '🗑️';
                }
            };
        });
    }

    console.log('✅ app-file-manager.js loaded successfully (Epsilon19)');

})();