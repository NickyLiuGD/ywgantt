// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图编辑表单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-form.js                           ▓▓
// ▓▓ 版本: Epsilon7 - 完整版（逐行核对，确保无遗漏）                ▓▓
// ▓▓ 行数: ~550行（原280行 + 新增270行）                            ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 在甘特图内部显示编辑表单（完整版）
     * ⭐ 原有功能保留 + 新增里程碑/层级/备注支持
     */
    GanttChart.prototype.showInlineTaskForm = function(task) {
        // ==================== 原有代码：移除旧表单 ====================
        const oldForm = this.container.querySelector('.inline-task-form');
        if (oldForm) oldForm.remove();

        // ==================== 原有代码：查找任务条 ====================
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`) ||
                    this.container.querySelector(`.gantt-milestone[data-task-id="${task.id}"]`); // ⭐ 新增里程碑支持
        if (!bar) return;

        // ==================== 原有代码：创建表单容器 ====================
        const form = document.createElement('div');
        form.className = 'inline-task-form';
        form.dataset.taskId = task.id;

        // ⭐ 新增：获取可选父任务
        const availableParents = this.tasks.filter(t => 
            t.id !== task.id && 
            !this.isDescendantOf(t.id, task.id) &&
            !t.isMilestone
        );
        
        // ==================== 原有代码：获取可选依赖任务 ====================
        const availableTasks = this.tasks.filter(t => t.id !== task.id);
        const availableDeps = availableTasks; // 保持兼容
        
        // ==================== 原有代码：计算当前工期 ====================
        const currentDuration = task.isMilestone ? 0 : (task.duration || daysBetween(task.start, task.end) + 1); // ⭐ 新增里程碑判断
        
        // ⭐ 新增：获取当前父任务
        const currentParent = task.parentId ? this.tasks.find(t => t.id === task.parentId) : null;
        
        // ⭐ 新增：自动判断任务类型
        const autoTaskType = task.isMilestone ? '里程碑' : 
                            (task.children && task.children.length > 0) ? '汇总任务' : 
                            '普通任务';
        const autoWBS = task.wbs || this.generateWBS(task.id);
        const autoOutlineLevel = task.outlineLevel || 1;

        // ==================== 表单 HTML（完整版） ====================
        form.innerHTML = `
            <!-- ==================== 原有代码：表单标题 ==================== -->
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0 fw-bold">
                    <span class="task-form-icon">${task.isMilestone ? '🎯' : (task.children?.length > 0 ? '📁' : '📋')}</span>
                    编辑任务
                </h6>
                <button type="button" class="btn-close btn-close-sm" id="closeForm"></button>
            </div>

            <!-- ==================== 原有代码：任务名称 ==================== -->
            <div class="mb-2">
                <label class="form-label fw-semibold">任务名称</label>
                <input type="text" class="form-control form-control-sm" id="editName" 
                       value="${this.escapeHtml(task.name)}">
            </div>

            <!-- ⭐⭐⭐ 新增区域1：层级关系选择 ⭐⭐⭐ -->
            <div class="mb-3">
                <label class="form-label fw-semibold d-flex justify-content-between align-items-center">
                    <span>层级关系</span>
                    <small class="text-muted">选择父任务</small>
                </label>
                <select class="form-select form-select-sm" id="editParent">
                    <option value="">无（顶级任务）</option>
                    ${availableParents.map(p => `
                        <option value="${p.id}" ${task.parentId === p.id ? 'selected' : ''}>
                            ${'├─ '.repeat((p.outlineLevel || 1) - 1)}${p.wbs ? '[' + p.wbs + '] ' : ''}${p.name}
                        </option>
                    `).join('')}
                </select>
                ${currentParent ? `
                    <small class="text-success mt-1 d-block">
                        ✓ 当前属于：${currentParent.wbs ? '[' + currentParent.wbs + '] ' : ''}${currentParent.name}
                    </small>
                ` : ''}
            </div>

            <!-- ⭐⭐⭐ 新增区域2：里程碑开关 ⭐⭐⭐ -->
            <div class="mb-3">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="editMilestone" 
                           ${task.isMilestone ? 'checked' : ''}
                           ${task.children && task.children.length > 0 ? 'disabled' : ''}>
                    <label class="form-check-label fw-semibold" for="editMilestone">
                        🎯 标记为里程碑
                        ${task.children && task.children.length > 0 ? 
                            '<span class="badge bg-warning text-dark ms-2" style="font-size:0.65rem">有子任务，不可设为里程碑</span>' : ''}
                    </label>
                </div>
                <small class="text-muted d-block ms-4">
                    ${task.children && task.children.length > 0 ? 
                        '⚠️ 有子任务的任务不能设为里程碑' : 
                        '里程碑用于标记项目关键节点，工期为0'}
                </small>
            </div>

            <!-- ⭐⭐⭐ 新增区域3：自动计算信息显示 ⭐⭐⭐ -->
            <div class="alert alert-info py-2 mb-3" style="font-size: 0.85rem;">
                <div class="d-flex justify-content-between mb-1">
                    <span>WBS编号：</span>
                    <strong id="autoWBS" class="text-primary">${autoWBS}</strong>
                </div>
                <div class="d-flex justify-content-between mb-1">
                    <span>层级深度：</span>
                    <strong id="autoLevel" class="text-info">第 ${autoOutlineLevel} 级</strong>
                </div>
                <div class="d-flex justify-content-between">
                    <span>任务类型：</span>
                    <strong id="autoType" class="text-success">${autoTaskType}</strong>
                </div>
                ${task.children && task.children.length > 0 ? `
                    <div class="mt-2 pt-2 border-top">
                        <small class="text-muted">
                            📊 包含 <strong>${task.children.length}</strong> 个子任务，时间和进度自动计算
                        </small>
                    </div>
                ` : ''}
            </div>

            <!-- ==================== 原有代码：时间设置区域 ==================== -->
            <div class="row g-2">
                <div class="col-6">
                    <label class="form-label fw-semibold">开始日期</label>
                    <input type="date" class="form-control form-control-sm" id="editStart" 
                           value="${task.start}"
                           ${task.children && task.children.length > 0 ? 'disabled' : ''}> <!-- ⭐ 新增禁用逻辑 -->
                </div>
                <div class="col-6">
                    <label class="form-label fw-semibold">工期（天）</label>
                    <input type="number" class="form-control form-control-sm" id="editDuration" 
                           value="${currentDuration}" 
                           min="0" max="365" step="1" <!-- ⭐ 修改：min从1改为0 -->
                           ${task.isMilestone || (task.children && task.children.length > 0) ? 'disabled' : ''}> <!-- ⭐ 新增禁用逻辑 -->
                </div>
            </div>
            
            <!-- ==================== 原有代码：结束日期显示 ==================== -->
            <div class="mb-2">
                ${task.children && task.children.length > 0 ? 
                    `<small class="text-warning">⚠️ 汇总任务的时间由子任务自动计算</small>` : 
                    `<small class="text-muted">结束日期：<span id="calculatedEndDate" class="fw-semibold text-success">${task.end}</span></small>`}
            </div>

            <!-- ==================== 原有代码：进度条 ==================== -->
            <div class="mb-3" id="progressSection" 
                 ${task.children?.length > 0 || task.isMilestone ? 'style="display:none"' : ''}> <!-- ⭐ 新增隐藏逻辑 -->
                <label class="form-label fw-semibold d-flex justify-content-between align-items-center">
                    完成进度: <span id="progressVal" class="badge bg-primary">${task.progress || 0}%</span> <!-- ⭐ 修改：badge样式 -->
                </label>
                <input type="range" class="form-range" id="editProgress" 
                       value="${task.progress || 0}" 
                       min="0" max="100" step="5">
            </div>

            <!-- ⭐⭐⭐ 新增区域4：优先级选择 ⭐⭐⭐ -->
            <div class="mb-3">
                <label class="form-label fw-semibold">优先级</label>
                <div class="btn-group w-100" role="group">
                    <input type="radio" class="btn-check" name="priority" id="priorityLow" value="low" 
                           ${task.priority === 'low' ? 'checked' : ''}>
                    <label class="btn btn-outline-secondary btn-sm" for="priorityLow">
                        <span style="color: #6c757d;">●</span> 低
                    </label>

                    <input type="radio" class="btn-check" name="priority" id="priorityMedium" value="medium"
                           ${!task.priority || task.priority === 'medium' ? 'checked' : ''}>
                    <label class="btn btn-outline-primary btn-sm" for="priorityMedium">
                        <span style="color: #667eea;">●</span> 中
                    </label>

                    <input type="radio" class="btn-check" name="priority" id="priorityHigh" value="high"
                           ${task.priority === 'high' ? 'checked' : ''}>
                    <label class="btn btn-outline-danger btn-sm" for="priorityHigh">
                        <span style="color: #dc3545;">●</span> 高
                    </label>
                </div>
            </div>

            <!-- ==================== 原有代码：依赖任务列表 ==================== -->
            <div class="mb-3">
                <label class="form-label fw-semibold">依赖任务（前置任务）</label> <!-- ⭐ 修改：添加"前置任务"说明 -->
                <div id="depList" class="border rounded p-2" 
                     style="max-height:120px;overflow-y:auto;background:#f8f9fa;"> <!-- ⭐ 修改：max-height从100px改为120px -->
                    ${availableTasks.length > 0 ? availableTasks.map(t => {
                        const isChecked = Array.isArray(task.dependencies) ? 
                            task.dependencies.some(dep => 
                                typeof dep === 'string' ? dep === t.id : dep.taskId === t.id
                            ) : false;
                        
                        // ⭐ 新增：层级缩进和图标
                        const indent = '├─ '.repeat((t.outlineLevel || 1) - 1);
                        const icon = t.isMilestone ? '🎯' : (t.children?.length > 0 ? '📁' : '📋');
                        
                        return `
                            <div class="form-check mb-1"> <!-- ⭐ 原有：form-check-inline 改为 form-check -->
                                <input class="form-check-input" type="checkbox" 
                                       value="${t.id}" 
                                       id="dep_${t.id}"
                                       ${isChecked ? 'checked' : ''}>
                                <label class="form-check-label small d-flex justify-content-between align-items-center" 
                                       for="dep_${t.id}"> <!-- ⭐ 新增：d-flex 布局 -->
                                    <span>${indent}${icon} ${t.wbs ? '[' + t.wbs + '] ' : ''}${t.name}</span> <!-- ⭐ 新增：缩进、图标、WBS -->
                                    ${t.isMilestone ? 
                                        '<span class="badge bg-warning text-dark ms-1" style="font-size:0.6rem">里程碑</span>' : ''} <!-- ⭐ 新增：里程碑标记 -->
                                </label>
                            </div>
                        `;
                    }).join('') : '<small class="text-muted">无其他任务</small>'}
                </div>
                <small class="text-muted">提示：点击其他任务条可快速切换依赖</small>
            </div>

            <!-- ⭐⭐⭐ 新增区域5：任务备注 ⭐⭐⭐ -->
            <div class="mb-3">
                <label class="form-label fw-semibold">任务备注</label>
                <textarea class="form-control form-control-sm" id="editNotes" 
                          rows="3" 
                          placeholder="输入任务说明、注意事项、相关文档链接等..."
                          maxlength="500">${this.escapeHtml(task.notes || '')}</textarea>
                <small class="text-muted" id="notesCounter">${(task.notes || '').length}/500 字符</small>
            </div>

            <!-- ==================== 原有代码：操作按钮 ==================== -->
            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm flex-fill" id="saveTask">
                    <span>💾</span> 保存 <!-- ⭐ 新增：图标 -->
                </button>
                <button class="btn btn-secondary btn-sm flex-fill" id="cancelEdit">
                    <span>❌</span> 取消 <!-- ⭐ 新增：图标 -->
                </button>
            </div>

            <!-- ⭐⭐⭐ 新增区域6：高级操作按钮 ⭐⭐⭐ -->
            <div class="mt-2 pt-2" style="border-top: 1px dashed #dee2e6;">
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-success btn-sm flex-fill" id="addSubTask">
                        <span>➕</span> 添加子任务
                    </button>
                    <button class="btn btn-outline-danger btn-sm flex-fill" id="deleteTask">
                        <span>🗑️</span> 删除任务
                    </button>
                </div>
            </div>
        `;

        // ==================== 原有代码：添加到容器 ====================
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        if (!rowsContainer) return;
        
        rowsContainer.appendChild(form);
        this.updateFormPosition(form, bar, rowsContainer);

        // ==================== 原有代码：绑定事件 ====================
        this.bindFormEvents(form, task, bar, rowsContainer);
    };

    /**
     * 绑定表单事件（完整版 - 包含所有原有事件 + 新增事件）
     */
    GanttChart.prototype.bindFormEvents = function(form, task, bar, rowsContainer) {
        // ==================== 原有代码：滚动监听 ====================
        let rafId = null;
        const updatePosition = () => {
            rafId = null;
            const currentBar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`) ||
                              this.container.querySelector(`.gantt-milestone[data-task-id="${task.id}"]`); // ⭐ 新增里程碑支持
            if (currentBar && form.parentElement) {
                this.updateFormPosition(form, currentBar, rowsContainer);
            }
        };

        const scrollHandler = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(updatePosition);
        };

        rowsContainer.addEventListener('scroll', scrollHandler, { passive: true });
        form._scrollListener = scrollHandler;
        form._scrollContainer = rowsContainer;
        form._rafId = rafId;

        // ==================== 原有代码：进度条同步 ====================
        const progressInput = form.querySelector('#editProgress');
        const progressVal = form.querySelector('#progressVal');
        if (progressInput && progressVal) {
            progressInput.oninput = () => progressVal.textContent = progressInput.value + '%';
        }

        // ⭐⭐⭐ 新增事件1：备注字符计数 ⭐⭐⭐
        const notesInput = form.querySelector('#editNotes');
        const notesCounter = form.querySelector('#notesCounter');
        if (notesInput && notesCounter) {
            notesInput.oninput = () => {
                const length = notesInput.value.length;
                notesCounter.textContent = `${length}/500 字符`;
                notesCounter.style.color = length > 450 ? '#dc3545' : '#6c757d';
            };
        }

        // ⭐⭐⭐ 新增事件2：里程碑开关切换 ⭐⭐⭐
        const milestoneSwitch = form.querySelector('#editMilestone');
        const durationInput = form.querySelector('#editDuration');
        const progressSection = form.querySelector('#progressSection');
        const autoTypeDisplay = form.querySelector('#autoType');

        if (milestoneSwitch) {
            milestoneSwitch.onchange = () => {
                if (milestoneSwitch.checked) {
                    // 切换为里程碑
                    durationInput.value = 0;
                    durationInput.disabled = true;
                    if (progressSection) progressSection.style.display = 'none';
                    if (autoTypeDisplay) {
                        autoTypeDisplay.textContent = '里程碑';
                        autoTypeDisplay.className = 'text-warning fw-bold';
                    }
                    updateEndDate();
                } else {
                    // 切换为普通任务
                    durationInput.value = 1;
                    durationInput.disabled = false;
                    if (progressSection) progressSection.style.display = 'block';
                    if (autoTypeDisplay) {
                        autoTypeDisplay.textContent = '普通任务';
                        autoTypeDisplay.className = 'text-success';
                    }
                    updateEndDate();
                }
            };
        }

        // ⭐⭐⭐ 新增事件3：父任务选择变更（实时预览） ⭐⭐⭐
        const parentSelect = form.querySelector('#editParent');
        const autoWBSDisplay = form.querySelector('#autoWBS');
        const autoLevelDisplay = form.querySelector('#autoLevel');

        if (parentSelect) {
            parentSelect.onchange = () => {
                const newParentId = parentSelect.value;
                
                if (newParentId) {
                    const newParent = this.tasks.find(t => t.id === newParentId);
                    if (newParent) {
                        // 🤖 自动更新层级深度
                        const newLevel = (newParent.outlineLevel || 1) + 1;
                        if (autoLevelDisplay) {
                            autoLevelDisplay.textContent = `第 ${newLevel} 级`;
                            autoLevelDisplay.style.color = '#10b981';
                        }
                        
                        // 🤖 自动预览 WBS
                        const parentWBS = newParent.wbs || this.generateWBS(newParent.id);
                        const siblingCount = (newParent.children || []).length;
                        const previewWBS = `${parentWBS}.${siblingCount + 1}`;
                        if (autoWBSDisplay) {
                            autoWBSDisplay.textContent = previewWBS;
                            autoWBSDisplay.style.color = '#06b6d4';
                        }
                    }
                } else {
                    // 顶级任务
                    if (autoLevelDisplay) {
                        autoLevelDisplay.textContent = '第 1 级';
                        autoLevelDisplay.style.color = '#667eea';
                    }
                    const topLevelCount = this.tasks.filter(t => !t.parentId).length;
                    if (autoWBSDisplay) {
                        autoWBSDisplay.textContent = String(topLevelCount);
                        autoWBSDisplay.style.color = '#667eea';
                    }
                }
            };
        }

        // ==================== 原有代码：自动计算结束日期 ====================
        const startInput = form.querySelector('#editStart');
        const endDateDisplay = form.querySelector('#calculatedEndDate');
        
        const updateEndDate = () => {
            const start = startInput.value;
            const duration = parseInt(durationInput.value) || 0; // ⭐ 修改：允许0
            
            if (start && duration >= 0 && endDateDisplay) { // ⭐ 修改：>= 0
                const startDate = new Date(start);
                const endDate = duration === 0 ? startDate : addDays(startDate, duration - 1); // ⭐ 新增：duration=0 的处理
                const endDateStr = formatDate(endDate);
                endDateDisplay.textContent = endDateStr;
                endDateDisplay.style.color = '#10b981';
                endDateDisplay.style.fontWeight = '600';
            }
        };
        
        if (startInput) startInput.addEventListener('change', updateEndDate);
        if (durationInput) durationInput.addEventListener('input', updateEndDate);

        // ==================== 原有代码：保存按钮 ====================
        form.querySelector('#saveTask').onclick = () => {
            this.saveTaskForm(form, task);
        };

        // ==================== 原有代码：取消按钮 ====================
        const cancelForm = () => {
            this.cleanupForm(form); // ⭐ 使用独立的清理函数
            form.remove();
        };
        
        form.querySelector('#cancelEdit').onclick = cancelForm;
        form.querySelector('#closeForm').onclick = cancelForm;

        // ⭐⭐⭐ 新增事件4：添加子任务按钮 ⭐⭐⭐
        const addSubTaskBtn = form.querySelector('#addSubTask');
        if (addSubTaskBtn) {
            addSubTaskBtn.onclick = () => {
                this.addChildTask(task.id);
                form.remove();
            };
        }

        // ⭐⭐⭐ 新增事件5：删除任务按钮 ⭐⭐⭐
        form.querySelector('#deleteTask').onclick = () => {
            const childrenCount = task.children ? task.children.length : 0;
            const warningMsg = childrenCount > 0 ? 
                `\n\n⚠️ 此任务包含 ${childrenCount} 个子任务，将一并删除！` : 
                '\n\n注意：其他依赖此任务的任务将失去该依赖关系。';
            
            if (confirm(`确定删除任务 "${task.name}"?${warningMsg}`)) {
                this.deleteTaskWithChildren(task.id);
                form.remove();
            }
        };

        // ==================== 原有代码：点击外部关闭 ====================
        const clickOutside = (e) => {
            if (!form.contains(e.target) && !bar.contains(e.target)) {
                this.cleanupForm(form); // ⭐ 使用独立的清理函数
                form.remove();
                document.removeEventListener('click', clickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', clickOutside), 0);
    };

    /**
     * 保存任务表单（完整版 - 包含所有验证和自动化处理）
     */
    GanttChart.prototype.saveTaskForm = function(form, task) {
        // ==================== 获取表单数据 ====================
        const newName = form.querySelector('#editName').value.trim();
        if (!newName) { 
            alert('任务名称不能为空'); 
            return; 
        }

        // ⭐ 新增：获取里程碑状态
        const isMilestone = form.querySelector('#editMilestone').checked;
        
        // ⭐ 新增：获取父任务
        const newParentId = form.querySelector('#editParent').value || null;
        
        const start = form.querySelector('#editStart').value;
        const duration = parseInt(form.querySelector('#editDuration').value) || 0; // ⭐ 修改：允许0
        const progressInput = form.querySelector('#editProgress');
        const progress = progressInput ? parseInt(progressInput.value) || 0 : 0;
        
        // ⭐ 新增：获取优先级
        const priority = form.querySelector('input[name="priority"]:checked').value;
        
        // ⭐ 新增：获取备注
        const notes = form.querySelector('#editNotes').value.trim();

        // ==================== 验证 ====================
        const hasChildren = task.children && task.children.length > 0;
        
        if (!hasChildren && !isMilestone && !start) {
            alert('请选择开始日期');
            return;
        }

        if (!hasChildren && !isMilestone && duration < 1) { // ⭐ 修改：仅普通任务验证
            alert('普通任务工期必须大于0天');
            return;
        }

        // ⭐ 新增：验证备注长度
        if (notes.length > 500) {
            alert('备注不能超过500字符');
            return;
        }

        // ==================== 保存旧值（用于日志） ====================
        const oldParentId = task.parentId;
        const oldName = task.name;

        // ==================== 🤖 更新基本信息 ====================
        task.name = newName;
        task.priority = priority; // ⭐ 新增
        task.notes = notes; // ⭐ 新增
        task.isMilestone = isMilestone && !hasChildren; // ⭐ 新增

        // 🤖 自动判断任务类型
        task.isSummary = hasChildren; // ⭐ 新增

        // ==================== 🤖 更新时间（汇总任务跳过） ====================
        if (!hasChildren) {
            task.start = start;
            
            if (isMilestone) { // ⭐ 新增：里程碑逻辑
                task.end = start;
                task.duration = 0;
                task.progress = 100;
            } else {
                const startDate = new Date(start);
                const endDate = addDays(startDate, duration - 1);
                task.end = formatDate(endDate);
                task.duration = duration;
                task.progress = progress;
            }
        }

        // ⭐⭐⭐ 新增：处理父任务变更 ⭐⭐⭐
        if (oldParentId !== newParentId) {
            this.updateParentRelationship(task, oldParentId, newParentId);
        }

        // ⭐⭐⭐ 新增：自动生成 WBS ⭐⭐⭐
        task.wbs = this.generateWBS(task.id);

        // ==================== 原有代码：更新依赖关系 ====================
        const checkedDeps = Array.from(form.querySelectorAll('#depList input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        task.dependencies = checkedDeps.map(depId => ({ // ⭐ 修改：对象格式
            taskId: depId,
            type: 'FS',
            lag: 0
        }));

        // ⭐⭐⭐ 新增：如果是汇总任务，重新计算时间 ⭐⭐⭐
        if (hasChildren) {
            this.recalculateSummaryTask(task.id);
        }

        // ⭐⭐⭐ 新增：更新所有父任务 ⭐⭐⭐
        this.updateParentTasks(task.id);

        // ⭐⭐⭐ 新增：重新排序任务 ⭐⭐⭐
        this.sortTasksByWBS();

        // ==================== 原有代码：清理和渲染 ====================
        this.cleanupForm(form); // ⭐ 使用独立函数
        this.calculateDateRange();
        this.render();
        
        // ==================== 原有代码：日志记录 ====================
        const changeLog = [];
        if (oldName !== newName) changeLog.push(`名称: ${oldName} → ${newName}`);
        
        // ⭐ 新增：父任务变更日志
        if (oldParentId !== newParentId) {
            const oldParentName = oldParentId ? this.tasks.find(t => t.id === oldParentId)?.name : '无';
            const newParentName = newParentId ? this.tasks.find(t => t.id === newParentId)?.name : '无';
            changeLog.push(`父任务: ${oldParentName} → ${newParentName}`);
        }
        
        addLog(`✅ 任务已更新：${task.wbs ? '[' + task.wbs + '] ' : ''}${task.name}${isMilestone ? '（里程碑）' : hasChildren ? '（汇总任务）' : ''}`);
        if (changeLog.length > 0) {
            addLog(`   变更：${changeLog.join('，')}`);
        }
        
        form.remove();
    };

    /**
     * 更新表单位置（原有代码 - 完整保留）
     */
    GanttChart.prototype.updateFormPosition = function(form, bar, container) {
        const barRect = bar.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;
        
        const barTopInContainer = barRect.top - containerRect.top + scrollTop;
        const barLeftInContainer = barRect.left - containerRect.left + scrollLeft;
        
        let formTop = barTopInContainer + barRect.height + 8;
        let formLeft = barLeftInContainer + 20;
        
        const formWidth = 320;
        const maxLeft = container.scrollWidth - formWidth - 20;
        if (formLeft > maxLeft) {
            formLeft = maxLeft;
        }
        
        if (formLeft < 10) {
            formLeft = 10;
        }
        
        const viewportHeight = containerRect.height;
        const barBottomInViewport = barRect.bottom - containerRect.top;
        const formHeight = 600; // ⭐ 修改：从480增加到600（表单变长）
        
        if (barBottomInViewport + formHeight > viewportHeight) {
            formTop = barTopInContainer - formHeight - 8;
            if (formTop < scrollTop) {
                formLeft = barLeftInContainer + barRect.width + 20;
                formTop = barTopInContainer;
            }
        }

        form.style.position = 'absolute';
        form.style.left = `${formLeft}px`;
        form.style.top = `${formTop}px`;
        form.style.zIndex = '1000';
        form.style.width = '320px';
        form.style.background = 'white';
        form.style.borderRadius = '12px';
        form.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        form.style.padding = '16px';
        form.style.border = '1px solid #dee2e6';
        form.style.fontSize = '0.9rem';
    };

    /**
     * 编辑任务名称（完整版 - 包含层级、图标、WBS、折叠按钮）
     */
    GanttChart.prototype.editTaskName = function(element) {
        if (element.classList.contains('editing')) return;
        
        const taskId = element.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const originalName = task.name;

        // ==================== 原有代码：创建输入框 ====================
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.style.cssText = 'border:1px solid #007bff;border-radius:4px;padding:4px 8px;font-size:0.9rem;width:100%;outline:none;';

        // ==================== 原有代码：替换元素内容 ====================
        element.innerHTML = '';
        element.appendChild(input);
        element.classList.add('editing');
        
        // ==================== 原有代码：聚焦并选中文本 ====================
        setTimeout(() => { 
            input.focus(); 
            input.select(); 
        }, 10);

        // ==================== 保存编辑（扩展版） ====================
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== originalName) {
                task.name = newName;
                addLog(`✏️ 任务名称从 "${originalName}" 改为 "${newName}"`);
            }
            
            // ⭐⭐⭐ 扩展：恢复完整显示（层级、图标、WBS、折叠按钮） ⭐⭐⭐
            const indent = '　'.repeat((task.outlineLevel || 1) - 1);
            const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
            const wbsPrefix = task.wbs ? `<span class="wbs-badge">[${task.wbs}]</span> ` : '';
            
            // 折叠按钮（仅汇总任务）
            const collapseBtn = (task.isSummary && task.children && task.children.length > 0) ? 
                `<span class="task-collapse-btn" data-task-id="${task.id}" title="${task.isCollapsed ? '展开' : '折叠'}子任务">
                    ${task.isCollapsed ? '▶' : '▼'}
                </span>` : '';
            
            element.innerHTML = `${collapseBtn}<span class="task-name-content">${indent}${icon} ${wbsPrefix}${task.name}</span>`;
            element.classList.remove('editing');
            
            // ⭐ 新增：重新绑定折叠按钮事件
            const newCollapseBtn = element.querySelector('.task-collapse-btn');
            if (newCollapseBtn) {
                newCollapseBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.toggleTaskCollapse(task.id);
                };
            }
            
            // ==================== 原有代码：更新外部标签 ====================
            const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
            if (externalLabel) {
                // ⭐ 扩展：包含层级、图标、WBS、进度、折叠按钮
                const displayName = `${indent}${icon} ${task.wbs ? '[' + task.wbs + '] ' : ''}${task.name}`;
                const progressBadge = !task.isMilestone ? `<span class="task-progress-badge">${task.progress || 0}%</span>` : '';
                const collapseToggle = (task.isSummary && task.children && task.children.length > 0) ? 
                    `<span class="collapse-toggle" data-task-id="${task.id}">${task.isCollapsed ? '▶' : '▼'}</span>` : '';
                
                externalLabel.innerHTML = `${displayName} ${progressBadge}${collapseToggle}`;
                
                // ⭐ 新增：重新绑定外部标签的折叠按钮
                const extCollapseToggle = externalLabel.querySelector('.collapse-toggle');
                if (extCollapseToggle) {
                    extCollapseToggle.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        this.toggleTaskCollapse(task.id);
                    };
                }
            }
        };

        // ==================== 原有代码：失焦时保存 ====================
        input.onblur = () => setTimeout(saveEdit, 100);
        
        // ==================== 原有代码：键盘事件 ====================
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                element.textContent = originalName;
                element.classList.remove('editing');
            }
        };
        
        // ==================== 原有代码：阻止点击冒泡 ====================
        input.onclick = (e) => e.stopPropagation();
    };

    /**
     * ⭐ 新增函数：清理表单资源
     */
    GanttChart.prototype.cleanupForm = function(form) {
        if (form._scrollListener && form._scrollContainer) {
            form._scrollContainer.removeEventListener('scroll', form._scrollListener);
        }
        if (form._rafId) {
            cancelAnimationFrame(form._rafId);
        }
    };

    console.log('✅ gantt-events-form.js loaded successfully (Epsilon7 - 完整版)');

})();
