// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 云端文件管理模块                                                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    const manageFilesBtn = document.getElementById('manageFiles');
    if (!manageFilesBtn) return;

    manageFilesBtn.onclick = async () => {
        try {
            const files = await listKVFiles();
            
            if (!files || files.length === 0) {
                alert('云端暂无文件');
                return;
            }
            
            showFileManagerModal(files);
            
        } catch (error) {
            alert('获取文件列表失败：' + error.message);
        }
    };

    /**
     * 显示文件管理对话框
     */
    function showFileManagerModal(files) {
        const modal = document.createElement('div');
        modal.className = 'dependency-selector-modal';
        
        modal.innerHTML = `
            <div class="dependency-selector-overlay"></div>
            <div class="dependency-selector-content" style="width: 600px; max-height: 70vh;">
                <div class="dependency-selector-header">
                    <div class="d-flex gap-2">
                        <h6 class="mb-0 fw-bold text-muted">☁️ 云端文件管理</h6>
                    </div>
                    <button type="button" class="btn-close" id="closeFileManager"></button>
                </div>
                
                <div class="dependency-selector-body">
                    <div class="list-group" id="fileListContainer">
                        ${files.map(file => `
                            <div class="list-group-item" data-filename="${file.name}">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div style="flex: 1;">
                                        <h6 class="mb-1 fw-bold">📄 ${file.name}</h6>
                                        <small class="text-muted d-block">
                                            🕒 ${new Date(file.timestamp).toLocaleString('zh-CN')}<br>
                                            📊 ${file.taskCount} 个任务 | 💾 ${(file.size / 1024).toFixed(1)}KB
                                        </small>
                                    </div>
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-sm btn-primary load-file-btn" 
                                                data-filename="${file.name}" 
                                                title="加载此文件">
                                            📂 加载
                                        </button>
                                        <button class="btn btn-sm btn-outline-secondary download-file-btn" 
                                                data-filename="${file.name}" 
                                                title="下载到本地">
                                            ⬇️
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger delete-file-btn" 
                                                data-filename="${file.name}" 
                                                title="删除">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="dependency-selector-footer">
                    <div class="text-muted small">
                        共 <strong>${files.length}</strong> 个文件
                    </div>
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
     * 绑定文件管理器事件
     */
    function bindFileManagerEvents(modal) {
        // 关闭按钮
        const closeBtn = modal.querySelector('#closeFileManager');
        const overlay = modal.querySelector('.dependency-selector-overlay');
        
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 200);
        };
        
        if (closeBtn) closeBtn.onclick = closeModal;
        if (overlay) overlay.onclick = closeModal;
        
        // 加载按钮
        modal.querySelectorAll('.load-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                
                try {
                    btn.disabled = true;
                    btn.textContent = '⏳ 加载中...';
                    
                    const data = await loadFromKV(filename);
                    const tasks = Array.isArray(data) ? data : data.tasks;
                    
                    tasks.forEach(t => {
                        t.id = t.id || generateId();
                        if (!t.dependencies) t.dependencies = [];
                    });
                    
                    gantt.tasks = tasks;
                    gantt.calculateDateRange();
                    gantt.render();
                    
                    if (typeof refreshPertViewIfActive === 'function') {
                        refreshPertViewIfActive();
                    }
                    
                    addLog(`✅ 已从云端加载：${filename}（${tasks.length} 个任务）`);
                    closeModal();
                    
                } catch (error) {
                    alert('加载失败：' + error.message);
                    btn.disabled = false;
                    btn.textContent = '📂 加载';
                }
            };
        });
        
        // 下载按钮
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
        
        // 删除按钮
        modal.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.onclick = async () => {
                const filename = btn.dataset.filename;
                
                if (!confirm(`确定删除文件 "${filename}"？\n\n此操作不可撤销！`)) {
                    return;
                }
                
                try {
                    btn.disabled = true;
                    btn.textContent = '⏳';
                    
                    await deleteFromKV(filename);
                    
                    // 移除列表项
                    const item = modal.querySelector(`[data-filename="${filename}"]`);
                    if (item) item.remove();
                    
                    // 更新计数
                    const remaining = modal.querySelectorAll('.list-group-item').length;
                    const footer = modal.querySelector('.dependency-selector-footer strong');
                    if (footer) footer.textContent = remaining;
                    
                    addLog(`✅ 已删除：${filename}`);
                    
                    if (remaining === 0) {
                        closeModal();
                        alert('所有文件已删除');
                    }
                    
                } catch (error) {
                    alert('删除失败：' + error.message);
                    btn.disabled = false;
                    btn.textContent = '🗑️';
                }
            };
        });
    }

    console.log('✅ app-file-manager.js loaded successfully');

})();
