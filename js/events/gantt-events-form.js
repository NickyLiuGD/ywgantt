// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图编辑表单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-form.js                           ▓▓
// ▓▓ 版本: Epsilon10 - 支持工作日/自然日工期计算 + 手柄颜色区分     ▓▓
// ▓▓ 行数: ~630行                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 显示任务编辑表单（完整版 - 支持工期类型）
     */
    GanttChart.prototype.showInlineTaskForm = function(task) {
        const oldForm = this.container.querySelector('.inline-task-form');
        if (oldForm) oldForm.remove();

        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`) ||
                    this.container.querySelector(`.gantt-milestone[data-task-id="${task.id}"]`);
        if (!bar) return;

        const form = document.createElement('div');
        form.className = 'inline-task-form';
        form.dataset.taskId = task.id;

        // 获取可选父任务（排除自己和自己的后代）
        const availableParents = this.tasks.filter(t => 
            t.id !== task.id && 
            !this.isDescendantOf(t.id, task.id) &&
            !t.isMilestone
        );
        
        // 获取可选依赖任务
        const availableDeps = this.tasks.filter(t => t.id !== task.id);
        
        // ⭐ 获取当前工期和类型
        const currentDuration = task.isMilestone ? 0 : (task.duration || daysBetween(task.start, task.end) + 1);
        const currentDurationType = task.durationType || 'workdays'; // 默认工作日
        
        const currentParent = task.parentId ? this.tasks.find(t => t.id === task.parentId) : null;
        
        // 自动判断任务类型
        const autoTaskType = task.isMilestone ? '里程碑' : 
                            (task.children && task.children.length > 0) ? '汇总任务' : 
                            '普通任务';
        const autoWBS = task.wbs || this.generateWBS(task.id);
        const autoOutlineLevel = task.outlineLevel || 1;

        form.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0 fw-bold">
                    <span class="task-form-icon">${task.isMilestone ? '🎯' : (task.children?.length > 0 ? '📁' : '📋')}</span>
                    编辑任务
                </h6>
                <button type="button" class="btn-close btn-close-sm" id="closeForm" aria-label="关闭"></button>
            </div>

            <!-- 任务名称 -->
            <div class="mb-3">
                <label class="form-label fw-semibold">任务名称</label>
                <input type="text" class="form-control form-control-sm" id="editName" 
                       value="${this.escapeHtml(task.name)}" 
                       placeholder="输入任务名称"
                       maxlength="100">
            </div>

            <!-- 层级关系 -->
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

            <!-- 里程碑开关 -->
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

            <!-- 自动计算信息 -->
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

            <!-- ⭐⭐⭐ 时间设置区域（支持工期类型） ⭐⭐⭐ -->
            <div class="mb-3" id="timeSection">
                <!-- 开始日期 -->
                <div class="mb-2">
                    <label class="form-label fw-semibold">开始日期</label>
                    <input type="date" class="form-control form-control-sm" id="editStart" 
                           value="${task.start}"
                           ${task.children && task.children.length > 0 ? 'disabled' : ''}>
                </div>

                <!-- 工期和工期类型 -->
                <div class="row g-2 mb-2">
                    <div class="col-6">
                        <label class="form-label fw-semibold">工期</label>
                        <input type="number" class="form-control form-control-sm" id="editDuration" 
                               value="${currentDuration}" 
                               min="0" max="365" step="1"
                               ${task.isMilestone || (task.children && task.children.length > 0) ? 'disabled' : ''}>
                    </div>
                    <div class="col-6">
                        <label class="form-label fw-semibold">工期类型</label>
                        <select class="form-select form-select-sm" id="editDurationType"
                                ${task.isMilestone || (task.children && task.children.length > 0) ? 'disabled' : ''}>
                            <option value="workdays" ${currentDurationType === 'workdays' ? 'selected' : ''}>
                                💼 工作日
                            </option>
                            <option value="days" ${currentDurationType === 'days' ? 'selected' : ''}>
                                📅 自然日
                            </option>
                        </select>
                    </div>
                </div>

                <!-- 结束日期显示 -->
                ${task.children && task.children.length > 0 ? 
                    `<div class="alert alert-warning py-2 mb-0" style="font-size: 0.8rem;">
                        ⚠️ 汇总任务的时间由子任务自动计算
                    </div>` : 
                    `<div class="d-flex justify-content-between align-items-center p-2 bg-light rounded mb-1">
                        <span class="text-muted small">结束日期：</span>
                        <strong id="calculatedEndDate" class="text-success" style="font-size: 0.95rem;">${task.end}</strong>
                    </div>
                    <div id="durationTypeHint" 
                         data-type="${currentDurationType}"
                         style="font-size: 0.75rem; padding: 6px 10px; border-radius: 6px; 
                                background: ${currentDurationType === 'workdays' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
                                color: ${currentDurationType === 'workdays' ? '#667eea' : '#10b981'};
                                border-left: 3px solid ${currentDurationType === 'workdays' ? '#667eea' : '#10b981'};">
                        ${currentDurationType === 'workdays' ? 
                            '💼 按工作日计算（跳过周末）' : 
                            '📅 按自然日计算（包含周末）'}
                    </div>`}
            </div>

            <!-- 进度 -->
            <div class="mb-3" id="progressSection" 
                 ${task.children?.length > 0 || task.isMilestone ? 'style="display:none"' : ''}>
                <label class="form-label fw-semibold d-flex justify-content-between align-items-center">
                    完成进度
                    <span id="progressVal" class="badge bg-primary">${task.progress || 0}%</span>
                </label>
                <input type="range" class="form-range" id="editProgress" 
                       value="${task.progress || 0}" 
                       min="0" max="100" step="5">
            </div>

            <!-- 优先级 -->
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

            <!-- 依赖关系 -->
            <div class="mb-3">
                <label class="form-label fw-semibold">依赖任务（前置任务）</label>
                <div id="depList" class="border rounded p-2" 
                     style="max-height:120px;overflow-y:auto;background:#f8f9fa;">
                    ${availableDeps.length > 0 ? availableDeps.map(t => {
                        const isChecked = Array.isArray(task.dependencies) ? 
                            task.dependencies.some(dep => 
                                typeof dep === 'string' ? dep === t.id : dep.taskId === t.id
                            ) : false;
                        
                        const indent = '├─ '.repeat((t.outlineLevel || 1) - 1);
                        const icon = t.isMilestone ? '🎯' : (t.children?.length > 0 ? '📁' : '📋');
                        
                        return `
                            <div class="form-check mb-1">
                                <input class="form-check-input" type="checkbox" 
                                       value="${t.id}" 
                                       id="dep_${t.id}"
                                       ${isChecked ? 'checked' : ''}>
                                <label class="form-check-label small d-flex justify-content-between align-items-center" 
                                       for="dep_${t.id}">
                                    <span>${indent}${icon} ${t.wbs ? '[' + t.wbs + '] ' : ''}${t.name}</span>
                                    ${t.isMilestone ? 
                                        '<span class="badge bg-warning text-dark ms-1" style="font-size:0.6rem">里程碑</span>' : ''}
                                </label>
                            </div>
                        `;
                    }).join('') : '<small class="text-muted">无其他任务</small>'}
                </div>
                <small class="text-muted">提示：点击其他任务条可快速切换依赖</small>
            </div>

            <!-- 任务备注 -->
            <div class="mb-3">
                <label class="form-label fw-semibold">任务备注</label>
                <textarea class="form-control form-control-sm" id="editNotes" 
                          rows="3" 
                          placeholder="输入任务说明、注意事项、相关文档链接等..."
                          maxlength="500">${this.escapeHtml(task.notes || '')}</textarea>
                <small class="text-muted" id="notesCounter">${(task.notes || '').length}/500 字符</small>
            </div>

            <!-- 操作按钮 -->
            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm flex-fill" id="saveTask">
                    <span>💾</span> 保存
                </button>
                <button class="btn btn-secondary btn-sm flex-fill" id="cancelEdit">
                    <span>❌</span> 取消
                </button>
            </div>

            <!-- 高级操作 -->
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

        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        if (!rowsContainer) return;
        
        rowsContainer.appendChild(form);
        this.updateFormPosition(form, bar, rowsContainer);

        this.bindFormEvents(form, task, bar, rowsContainer);
    };

    /**
     * 绑定表单事件（完整版 - 支持工期类型）
     */
    GanttChart.prototype.bindFormEvents = function(form, task, bar, rowsContainer) {
        // ==================== 滚动监听 ====================
        let rafId = null;
        const updatePosition = () => {
            rafId = null;
            const currentBar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`) ||
                              this.container.querySelector(`.gantt-milestone[data-task-id="${task.id}"]`);
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

        // ==================== 进度条同步 ====================
        const progressInput = form.querySelector('#editProgress');
        const progressVal = form.querySelector('#progressVal');
        if (progressInput && progressVal) {
            progressInput.oninput = () => {
                progressVal.textContent = progressInput.value + '%';
            };
        }

        // ==================== 备注字符计数 ====================
        const notesInput = form.querySelector('#editNotes');
        const notesCounter = form.querySelector('#notesCounter');
        if (notesInput && notesCounter) {
            notesInput.oninput = () => {
                const length = notesInput.value.length;
                notesCounter.textContent = `${length}/500 字符`;
                notesCounter.style.color = length > 450 ? '#dc3545' : '#6c757d';
            };
        }

        // ==================== 里程碑开关 ====================
        const milestoneSwitch = form.querySelector('#editMilestone');
        const durationInput = form.querySelector('#editDuration');
        const durationTypeSelect = form.querySelector('#editDurationType');
        const progressSection = form.querySelector('#progressSection');
        const autoTypeDisplay = form.querySelector('#autoType');

        if (milestoneSwitch) {
            milestoneSwitch.onchange = () => {
                if (milestoneSwitch.checked) {
                    // 切换为里程碑
                    durationInput.value = 0;
                    durationInput.disabled = true;
                    if (durationTypeSelect) durationTypeSelect.disabled = true;
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
                    if (durationTypeSelect) durationTypeSelect.disabled = false;
                    if (progressSection) progressSection.style.display = 'block';
                    if (autoTypeDisplay) {
                        autoTypeDisplay.textContent = '普通任务';
                        autoTypeDisplay.className = 'text-success';
                    }
                    updateEndDate();
                }
            };
        }

        // ==================== 父任务选择变更 ====================
        const parentSelect = form.querySelector('#editParent');
        const autoWBSDisplay = form.querySelector('#autoWBS');
        const autoLevelDisplay = form.querySelector('#autoLevel');

        if (parentSelect) {
            parentSelect.onchange = () => {
                const newParentId = parentSelect.value;
                
                if (newParentId) {
                    const newParent = this.tasks.find(t => t.id === newParentId);
                    if (newParent) {
                        const newLevel = (newParent.outlineLevel || 1) + 1;
                        if (autoLevelDisplay) {
                            autoLevelDisplay.textContent = `第 ${newLevel} 级`;
                            autoLevelDisplay.style.color = '#10b981';
                        }
                        
                        const parentWBS = newParent.wbs || this.generateWBS(newParent.id);
                        const siblingCount = (newParent.children || []).length;
                        const previewWBS = `${parentWBS}.${siblingCount + 1}`;
                        if (autoWBSDisplay) {
                            autoWBSDisplay.textContent = previewWBS;
                            autoWBSDisplay.style.color = '#06b6d4';
                        }
                    }
                } else {
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

        // ⭐⭐⭐ 自动计算结束日期（支持工期类型 + 增强提示） ⭐⭐⭐
        const startInput = form.querySelector('#editStart');
        const endDateDisplay = form.querySelector('#calculatedEndDate');
        const durationTypeHint = form.querySelector('#durationTypeHint');
        
        const updateEndDate = () => {
            const start = startInput.value;
            const duration = parseInt(durationInput.value) || 0;
            const durationType = durationTypeSelect ? durationTypeSelect.value : 'workdays';
            
            if (start && duration >= 0 && endDateDisplay) {
                const startDate = new Date(start);
                
                // ⭐ 根据工期类型计算结束日期
                const endDate = calculateEndDate(startDate, duration, durationType);
                const endDateStr = formatDate(endDate);
                
                // 更新结束日期显示（带颜色）
                endDateDisplay.textContent = endDateStr;
                endDateDisplay.style.color = durationType === 'workdays' ? '#667eea' : '#10b981';
                endDateDisplay.style.fontWeight = '600';
                endDateDisplay.style.transition = 'all 0.3s ease';
                
                // ⭐ 更新提示文字和样式
                if (durationTypeHint) {
                    durationTypeHint.setAttribute('data-type', durationType);
                    
                    if (durationType === 'workdays') {
                        durationTypeHint.innerHTML = '💼 按工作日计算（跳过周末）';
                        durationTypeHint.style.background = 'rgba(102, 126, 234, 0.1)';
                        durationTypeHint.style.color = '#667eea';
                        durationTypeHint.style.borderLeft = '3px solid #667eea';
                    } else {
                        durationTypeHint.innerHTML = '📅 按自然日计算（包含周末）';
                        durationTypeHint.style.background = 'rgba(16, 185, 129, 0.1)';
                        durationTypeHint.style.color = '#10b981';
                        durationTypeHint.style.borderLeft = '3px solid #10b981';
                    }
                    
                    // ⭐ 显示详细信息
                    if (duration > 0 && !task.isMilestone) {
                        const actualDays = daysBetween(startDate, endDate) + 1;
                        
                        if (durationType === 'workdays') {
                            // 工作日模式：显示实际跨度和跳过的周末
                            if (actualDays !== duration) {
                                const weekendDays = actualDays - duration;
                                durationTypeHint.innerHTML += ` <span class="text-info fw-semibold">(实际跨度 ${actualDays} 天)</span>`;
                                durationTypeHint.innerHTML += ` <span class="badge bg-secondary" style="font-size:0.65rem">跳过 ${weekendDays} 天周末</span>`;
                            }
                        } else {
                            // 自然日模式：显示包含的周末天数
                            const weekendCount = countWeekendsInRange(startDate, endDate);
                            if (weekendCount > 0) {
                                durationTypeHint.innerHTML += ` <span class="badge bg-success" style="font-size:0.65rem">含 ${weekendCount} 天周末</span>`;
                            }
                        }
                    }
                }
            }
        };
        
        if (startInput) startInput.addEventListener('change', updateEndDate);
        if (durationInput) durationInput.addEventListener('input', updateEndDate);
        
        // ⭐ 工期类型切换事件（带动画效果）
        if (durationTypeSelect) {
            durationTypeSelect.onchange = () => {
                // 添加切换动画
                if (endDateDisplay) {
                    endDateDisplay.style.transform = 'scale(1.15)';
                    setTimeout(() => {
                        endDateDisplay.style.transform = 'scale(1)';
                    }, 300);
                }
                
                if (durationTypeHint) {
                    durationTypeHint.style.transform = 'translateX(-5px)';
                    setTimeout(() => {
                        durationTypeHint.style.transform = 'translateX(0)';
                    }, 300);
                }
                
                updateEndDate();
                
                const typeLabel = durationTypeSelect.value === 'workdays' ? '工作日' : '自然日';
                addLog(`🔄 工期类型切换为：${typeLabel}`);
            };
        }

        // ==================== 保存按钮 ====================
        form.querySelector('#saveTask').onclick = () => {
            this.saveTaskForm(form, task);
        };

        // ==================== 取消按钮 ====================
        const cancelForm = () => {
            this.cleanupForm(form);
            form.remove();
        };
        
        form.querySelector('#cancelEdit').onclick = cancelForm;
        form.querySelector('#closeForm').onclick = cancelForm;

        // ==================== 添加子任务按钮 ====================
        const addSubTaskBtn = form.querySelector('#addSubTask');
        if (addSubTaskBtn) {
            addSubTaskBtn.onclick = () => {
                this.addChildTask(task.id);
                form.remove();
            };
        }

        // ==================== 删除任务按钮 ====================
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

        // ==================== 点击外部关闭 ====================
        const clickOutside = (e) => {
            if (!form.contains(e.target) && !bar.contains(e.target)) {
                this.cleanupForm(form);
                form.remove();
                document.removeEventListener('click', clickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', clickOutside), 0);
    };

    /**
     * 保存任务表单（⭐ 支持工期类型）
     */
    GanttChart.prototype.saveTaskForm = function(form, task) {
        // ==================== 获取表单数据 ====================
        const newName = form.querySelector('#editName').value.trim();
        if (!newName) { 
            alert('任务名称不能为空'); 
            return; 
        }

        const isMilestone = form.querySelector('#editMilestone').checked;
        const newParentId = form.querySelector('#editParent').value || null;
        const start = form.querySelector('#editStart').value;
        const duration = parseInt(form.querySelector('#editDuration').value) || 0;
        
        // ⭐ 获取工期类型
        const durationTypeSelect = form.querySelector('#editDurationType');
        const durationType = durationTypeSelect ? durationTypeSelect.value : 'workdays';
        
        const progressInput = form.querySelector('#editProgress');
        const progress = progressInput ? parseInt(progressInput.value) || 0 : 0;
        const priority = form.querySelector('input[name="priority"]:checked').value;
        const notes = form.querySelector('#editNotes').value.trim();

        // ==================== 验证 ====================
        const hasChildren = task.children && task.children.length > 0;
        
        if (!hasChildren && !isMilestone && !start) {
            alert('请选择开始日期');
            return;
        }

        if (!hasChildren && !isMilestone && duration < 1) {
            alert('普通任务工期必须大于0');
            return;
        }

        if (notes.length > 500) {
            alert('备注不能超过500字符');
            return;
        }

        // ==================== 保存旧值（用于日志） ====================
        const oldParentId = task.parentId;
        const oldName = task.name;
        const oldDurationType = task.durationType;

        // ==================== 更新基本信息 ====================
        task.name = newName;
        task.priority = priority;
        task.notes = notes;
        task.isMilestone = isMilestone && !hasChildren;
        task.isSummary = hasChildren;
        task.durationType = durationType; // ⭐ 保存工期类型

        // ==================== 更新时间（汇总任务跳过） ====================
        if (!hasChildren) {
            task.start = start;
            
            if (isMilestone) {
                task.end = start;
                task.duration = 0;
                task.progress = 100;
                task.durationType = 'days'; // 里程碑固定为自然日
            } else {
                const startDate = new Date(start);
                
                // ⭐ 根据工期类型计算结束日期
                const endDate = calculateEndDate(startDate, duration, durationType);
                
                task.end = formatDate(endDate);
                task.duration = duration;
                task.progress = progress;
            }
        }

        // ==================== 处理父任务变更 ====================
        if (oldParentId !== newParentId) {
            this.updateParentRelationship(task, oldParentId, newParentId);
        }

        // ==================== 自动生成 WBS ====================
        task.wbs = this.generateWBS(task.id);

        // ==================== 更新依赖关系 ====================
        const checkedDeps = Array.from(form.querySelectorAll('#depList input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        task.dependencies = checkedDeps.map(depId => ({
            taskId: depId,
            type: 'FS',
            lag: 0
        }));

        // ==================== 汇总任务重新计算 ====================
        if (hasChildren) {
            this.recalculateSummaryTask(task.id);
        }

        // ==================== 更新父任务 ====================
        this.updateParentTasks(task.id);

        // ==================== 重新排序 ====================
        this.sortTasksByWBS();

        // ==================== 清理并渲染 ====================
        this.cleanupForm(form);
        this.calculateDateRange();
        this.render();
        
        // ==================== 日志记录 ====================
        const changeLog = [];
        if (oldName !== newName) changeLog.push(`名称: ${oldName} → ${newName}`);
        if (oldParentId !== newParentId) {
            const oldParentName = oldParentId ? this.tasks.find(t => t.id === oldParentId)?.name : '无';
            const newParentName = newParentId ? this.tasks.find(t => t.id === newParentId)?.name : '无';
            changeLog.push(`父任务: ${oldParentName} → ${newParentName}`);
        }
        if (oldDurationType !== durationType && !isMilestone && !hasChildren) {
            const oldLabel = oldDurationType === 'workdays' ? '工作日' : '自然日';
            const newLabel = durationType === 'workdays' ? '工作日' : '自然日';
            changeLog.push(`工期类型: ${oldLabel} → ${newLabel}`);
        }
        
        const typeLabel = isMilestone ? '（里程碑）' : 
                         hasChildren ? '（汇总任务）' : 
                         `（${durationType === 'workdays' ? '工作日' : '自然日'}）`;
        
        addLog(`✅ 任务已更新：${task.wbs ? '[' + task.wbs + '] ' : ''}${task.name}${typeLabel}`);
        if (changeLog.length > 0) {
            addLog(`   变更：${changeLog.join('，')}`);
        }
        
        form.remove();
    };

    /**
     * 更新表单位置
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
        const formHeight = 680; // ⭐ 增加高度（新增工期类型选择 + 提示信息）
        
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
     * 编辑任务名称（内联编辑）
     */
    GanttChart.prototype.editTaskName = function(element) {
        if (element.classList.contains('editing')) return;
        
        const taskId = element.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const originalName = task.name;

        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.style.cssText = 'border:1px solid #007bff;border-radius:4px;padding:4px 8px;font-size:0.9rem;width:100%;outline:none;';

        // 替换元素内容
        element.innerHTML = '';
        element.appendChild(input);
        element.classList.add('editing');
        
        // 聚焦并选中文本
        setTimeout(() => { 
            input.focus(); 
            input.select(); 
        }, 10);

        // 保存编辑
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== originalName) {
                task.name = newName;
                addLog(`✏️ 任务名称从 "${originalName}" 改为 "${newName}"`);
            }
            
            // 恢复显示（包含层级、图标、WBS、折叠按钮）
            const indent = '　'.repeat((task.outlineLevel || 1) - 1);
            const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
            const wbsPrefix = task.wbs ? `<span class="wbs-badge">[${task.wbs}]</span> ` : '';
            
            const collapseBtn = (task.isSummary && task.children && task.children.length > 0) ? 
                `<span class="task-collapse-btn" data-task-id="${task.id}" title="${task.isCollapsed ? '展开' : '折叠'}子任务">
                    ${task.isCollapsed ? '▶' : '▼'}
                </span>` : '';
            
            element.innerHTML = `${collapseBtn}<span class="task-name-content">${indent}${icon} ${wbsPrefix}${task.name}</span>`;
            element.classList.remove('editing');
            
            // 重新绑定折叠按钮事件
            const newCollapseBtn = element.querySelector('.task-collapse-btn');
            if (newCollapseBtn) {
                newCollapseBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.toggleTaskCollapse(task.id);
                };
            }
            
            // 更新外部标签
            const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
            if (externalLabel) {
                const displayName = `${indent}${icon} ${task.wbs ? '[' + task.wbs + '] ' : ''}${task.name}`;
                const progressBadge = !task.isMilestone ? `<span class="task-progress-badge">${task.progress || 0}%</span>` : '';
                const collapseToggle = (task.isSummary && task.children && task.children.length > 0) ? 
                    `<span class="collapse-toggle" data-task-id="${task.id}">${task.isCollapsed ? '▶' : '▼'}</span>` : '';
                
                externalLabel.innerHTML = `${displayName} ${progressBadge}${collapseToggle}`;
                
                // 重新绑定外部标签的折叠按钮
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

        // 失焦时保存
        input.onblur = () => setTimeout(saveEdit, 100);
        
        // 键盘事件
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
        
        // 阻止点击冒泡
        input.onclick = (e) => e.stopPropagation();
    };

    /**
     * 清理表单资源
     */
    GanttChart.prototype.cleanupForm = function(form) {
        if (form._scrollListener && form._scrollContainer) {
            form._scrollContainer.removeEventListener('scroll', form._scrollListener);
        }
        if (form._rafId) {
            cancelAnimationFrame(form._rafId);
        }
    };

    /**
     * ⭐ 计算日期范围内的周末天数
     */
    function countWeekendsInRange(startDate, endDate) {
        let count = 0;
        let current = new Date(startDate);
        
        while (current <= endDate) {
            if (isWeekend(current)) {
                count++;
            }
            current = addDays(current, 1);
        }
        
        return count;
    }

    console.log('✅ gantt-events-form.js loaded successfully (Epsilon10 - 工期类型 + 手柄颜色)');

})();
