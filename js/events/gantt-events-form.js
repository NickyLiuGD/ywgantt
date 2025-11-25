// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图编辑表单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-form.js                           ▓▓
// ▓▓ 版本: Epsilon18-Robust - 强力修复工期显示问题                    ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 显示任务编辑表单（完整版）
     */
    GanttChart.prototype.showInlineTaskForm = function(task) {
        // 移除旧表单
        const oldForm = this.container.querySelector('.inline-task-form');
        if (oldForm) oldForm.remove();

        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`) ||
                    this.container.querySelector(`.gantt-milestone[data-task-id="${task.id}"]`);
        if (!bar) {
            console.warn('Task bar not found for:', task.id);
            return;
        }

        const form = document.createElement('div');
        form.className = 'inline-task-form';
        form.dataset.taskId = task.id;

        // 计算可用父任务
        const availableParents = this.tasks.filter(t => 
            t.id !== task.id && 
            !this.isDescendantOf(t.id, task.id) &&
            !t.isMilestone
        );
        
        // ⭐ 修复1：健壮的数据处理，防止 undefined 或 string 导致的问题
        const rawDuration = parseInt(task.duration);
        // 如果解析失败(NaN)或小于0，默认为1；如果是里程碑则为0
        const currentDuration = task.isMilestone ? 0 : (isNaN(rawDuration) || rawDuration < 0 ? 1 : rawDuration);
        const currentDurationType = task.durationType || 'days';
        const hasChildren = task.children && task.children.length > 0;
        const canDelete = !hasChildren;

        // 获取已选依赖任务
        const selectedDeps = Array.isArray(task.dependencies) ? 
            task.dependencies.map(dep => {
                const depId = typeof dep === 'string' ? dep : dep.taskId;
                const depTask = this.tasks.find(t => t.id === depId);
                return depTask;
            }).filter(t => t) : [];

        // 生成 1-30 天的基础选项
        // 注意：这里不再依赖 HTML 字符串的 selected 属性，而是由后面的 JS 统一赋值
        const durationOptions = Array.from({length: 30}, (_, i) => i + 1)
            .map(d => `<option value="${d}">${d}</option>`)
            .join('');

        const autoTaskType = task.isMilestone ? '里程碑' : 
                            (task.children && task.children.length > 0) ? '汇总任务' : 
                            '普通任务';
        const autoWBS = task.wbs || this.generateWBS(task.id);
        const autoOutlineLevel = task.outlineLevel || 1;

        form.innerHTML = `
            <!-- 顶部工具栏 -->
            <div class="form-toolbar">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-primary" id="saveTask" type="button" title="保存">
                            <span style="font-size: 1.1rem;">💾</span>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" id="deleteTask" type="button" 
                                ${!canDelete ? 'disabled' : ''}
                                title="${!canDelete ? '有子任务不可删除' : '删除任务'}">
                            <span style="font-size: 1.1rem;">🗑️</span>
                        </button>
                        <button class="btn btn-sm btn-outline-success" id="addSubTask" type="button" title="添加子任务">
                            <span style="font-size: 1.1rem;">➕</span>
                        </button>
                    </div>
                    <h6 class="mb-0 fw-bold text-muted">编辑任务</h6>
                    <button type="button" class="btn-close btn-close-sm" id="closeForm" aria-label="关闭"></button>
                </div>
            </div>

            <!-- 任务名称 + 里程碑开关 -->
            <div class="form-row-compact mb-2">
                <div style="flex: 1;">
                    <label class="form-label-compact">任务名称</label>
                    <input type="text" class="form-control form-control-sm" id="editName" 
                        value="${this.escapeHtml(task.name)}" 
                        placeholder="输入任务名称"
                        maxlength="100">
                </div>
                <div style="width: 120px; padding-left: 12px;">
                    <label class="form-label-compact" style="visibility: hidden;">占位</label>
                    <div class="form-check form-switch" style="padding-top: 6px;">
                        <input class="form-check-input" type="checkbox" id="editMilestone" 
                            ${task.isMilestone ? 'checked' : ''}
                            ${hasChildren ? 'disabled' : ''}>
                        <label class="form-check-label fw-semibold" for="editMilestone" style="font-size: 0.85rem;">
                            🎯 里程碑
                        </label>
                    </div>
                </div>
            </div>

            <!-- 自动信息 -->
            <div class="auto-info-compact mb-2">
                <span><strong>WBS:</strong> <code id="autoWBS">${autoWBS}</code></span>
                <span class="separator">|</span>
                <span><strong>层级:</strong> <code id="autoLevel">${autoOutlineLevel}级</code></span>
                <span class="separator">|</span>
                <span><strong>类型:</strong> <code id="autoType">${autoTaskType}</code></span>
            </div>

            <!-- 父任务 -->
            <div class="mb-2">
                <label class="form-label-compact">父任务</label>
                <select class="form-select form-select-sm" id="editParent">
                    <option value="">无（顶级任务）</option>
                    ${availableParents.map(p => `
                        <option value="${p.id}" ${task.parentId === p.id ? 'selected' : ''}>
                            ${'├─ '.repeat((p.outlineLevel || 1) - 1)}${p.wbs ? '[' + p.wbs + '] ' : ''}${p.name}
                        </option>
                    `).join('')}
                </select>
            </div>

            <!-- 开始日期 + 工期 + 工期类型 -->
            <div class="form-row-compact mb-2">
                <div style="flex: 1;">
                    <label class="form-label-compact">开始日期</label>
                    <input type="date" class="form-control form-control-sm" id="editStart" 
                        value="${task.start}"
                        ${hasChildren ? 'disabled' : ''}>
                </div>
                <div style="width: 80px; padding-left: 8px;">
                    <label class="form-label-compact">工期</label>
                    <select class="form-select form-select-sm" id="editDuration"
                            ${task.isMilestone || hasChildren ? 'disabled' : ''}>
                        <option value="0">0</option>
                        ${durationOptions}
                        <!-- 大于30的选项将通过JS动态添加 -->
                    </select>
                </div>
                <div style="width: 110px; padding-left: 8px;">
                    <label class="form-label-compact">类型</label>
                    <select class="form-select form-select-sm" id="editDurationType"
                            ${task.isMilestone || hasChildren ? 'disabled' : ''}>
                        <option value="workdays">💼 工作日</option>
                        <option value="days">📅 自然日</option>
                    </select>
                </div>
            </div>

            <!-- 结束日期显示 -->
            ${hasChildren ? 
                `<div class="alert alert-warning py-1 mb-2" style="font-size: 0.75rem;">
                    ⚠️ 汇总任务时间由子任务自动计算
                </div>` : 
                `<div class="end-date-display mb-2">
                    <span class="text-muted small">→ 结束:</span>
                    <strong id="calculatedEndDate" class="text-success">${task.end}</strong>
                    <small id="durationTypeHint" class="ms-2" style="color: ${currentDurationType === 'workdays' ? '#667eea' : '#10b981'};">
                        ${currentDurationType === 'workdays' ? '💼 工作日' : '📅 自然日'}
                    </small>
                </div>`}

            <!-- 进度 + 优先级 -->
            <div class="form-row-compact mb-2" id="progressPrioritySection" 
                ${hasChildren || task.isMilestone ? 'style="display:none"' : ''}>
                <div style="flex: 1;">
                    <label class="form-label-compact">
                        完成进度
                        <span id="progressVal" class="badge bg-primary ms-2" style="font-size: 0.7rem;">${task.progress || 0}%</span>
                    </label>
                    <input type="range" class="form-range" id="editProgress" 
                        value="${task.progress || 0}" 
                        min="0" max="100" step="5">
                </div>
                <div style="width: 120px; padding-left: 12px;">
                    <label class="form-label-compact">优先级</label>
                    <select class="form-select form-select-sm" id="editPriority">
                        <option value="low">🟢 低</option>
                        <option value="medium">🔵 中</option>
                        <option value="high">🔴 高</option>
                    </select>
                </div>
            </div>

            <!-- 依赖任务（标签式显示 + 编辑按钮） -->
            <div class="mb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="form-label-compact mb-0">依赖任务（前置任务）</label>
                    <button class="btn btn-sm btn-outline-primary edit-deps-btn" 
                            id="editDepsBtn" 
                            type="button" 
                            style="padding: 3px 12px; font-size: 0.75rem; border-radius: 6px;">
                        <span style="font-size: 0.9rem;">✏️</span> 编辑
                    </button>
                </div>
                <div class="deps-tags-container" id="depsTagsContainer">
                    ${selectedDeps.length > 0 ? selectedDeps.map(dep => {
                        const icon = dep.isMilestone ? '🎯' : (dep.children?.length > 0 ? '📁' : '📋');
                        return `
                            <span class="dep-tag" data-dep-id="${dep.id}">
                                ${icon} ${dep.wbs ? '[' + dep.wbs + '] ' : ''}${dep.name}
                                <button class="dep-tag-remove" data-dep-id="${dep.id}" type="button" title="移除">×</button>
                            </span>
                        `;
                    }).join('') : '<span class="text-muted small">无依赖任务</span>'}
                </div>
            </div>

            <!-- 任务备注 -->
            <div class="mb-2">
                <label class="form-label-compact">任务备注</label>
                <textarea class="form-control form-control-sm" id="editNotes" 
                        rows="2" 
                        placeholder="输入任务说明..."
                        maxlength="500"
                        style="font-size: 0.8rem;">${this.escapeHtml(task.notes || '')}</textarea>
                <small class="text-muted" id="notesCounter" style="font-size: 0.7rem;">${(task.notes || '').length}/500</small>
            </div>

            ${!canDelete ? `
                <small class="text-warning d-block mb-2" style="font-size: 0.7rem; padding: 4px 8px; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
                    ⚠️ 包含 ${task.children.length} 个子任务，删除按钮已禁用
                </small>
            ` : ''}
        `;

        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        if (!rowsContainer) return;
        
        rowsContainer.appendChild(form);
        this.updateFormPosition(form, bar, rowsContainer);
        
        // ⭐ 修复2：在元素插入DOM后，显式设置下拉菜单的值
        // 这样可以避免因HTML字符串解析导致的选中失败，并处理动态选项
        this.setFormValues(form, task, currentDuration);
        
        this.bindFormEvents(form, task, bar, rowsContainer);
        
        console.log(`✅ 表单已创建，显式设置工期为: ${currentDuration}`);
    };

    /**
     * ⭐ 新增：显式设置表单值的辅助函数
     */
    GanttChart.prototype.setFormValues = function(form, task, currentDuration) {
        const durationSelect = form.querySelector('#editDuration');
        const typeSelect = form.querySelector('#editDurationType');
        const prioritySelect = form.querySelector('#editPriority');

        if (durationSelect) {
            // 检查当前工期是否存在于选项中
            let optionExists = false;
            for (let i = 0; i < durationSelect.options.length; i++) {
                if (parseInt(durationSelect.options[i].value) === currentDuration) {
                    optionExists = true;
                    break;
                }
            }

            // 如果选项不存在（例如工期是 45 天），动态添加一个选项
            if (!optionExists && currentDuration > 0) {
                const newOption = document.createElement('option');
                newOption.value = currentDuration;
                newOption.textContent = currentDuration;
                durationSelect.appendChild(newOption);
            }

            // 强制设置值
            durationSelect.value = currentDuration;
        }

        if (typeSelect) {
            typeSelect.value = task.durationType || 'days';
        }

        if (prioritySelect) {
            prioritySelect.value = task.priority || 'medium';
        }
    };

    /**
     * 绑定表单事件
     */
    GanttChart.prototype.bindFormEvents = function(form, task, bar, rowsContainer) {
        console.log('🔧 开始绑定表单事件...');
        
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
                notesCounter.textContent = `${length}/500`;
                notesCounter.style.color = length > 450 ? '#dc3545' : '#6c757d';
            };
        }

        // ==================== 里程碑开关 ====================
        const milestoneSwitch = form.querySelector('#editMilestone');
        const durationSelect = form.querySelector('#editDuration');
        const durationTypeSelect = form.querySelector('#editDurationType');
        const progressPrioritySection = form.querySelector('#progressPrioritySection');
        const autoTypeDisplay = form.querySelector('#autoType');

        if (milestoneSwitch) {
            milestoneSwitch.onchange = () => {
                if (milestoneSwitch.checked) {
                    if (durationSelect) {
                        durationSelect.value = 0;
                        durationSelect.disabled = true;
                    }
                    if (durationTypeSelect) durationTypeSelect.disabled = true;
                    if (progressPrioritySection) progressPrioritySection.style.display = 'none';
                    if (autoTypeDisplay) {
                        autoTypeDisplay.textContent = '里程碑';
                        autoTypeDisplay.style.color = '#ffc107';
                    }
                    updateEndDate();
                } else {
                    if (durationSelect) {
                        // 恢复为1或之前的非零值
                        durationSelect.disabled = false;
                        // 尝试恢复原来的工期，如果原来是0则设为1
                        let restoreVal = parseInt(task.duration) || 1;
                        if (restoreVal === 0) restoreVal = 1;
                        durationSelect.value = restoreVal;
                    }
                    if (durationTypeSelect) durationTypeSelect.disabled = false;
                    if (progressPrioritySection) progressPrioritySection.style.display = 'flex';
                    if (autoTypeDisplay) {
                        autoTypeDisplay.textContent = '普通任务';
                        autoTypeDisplay.style.color = '#10b981';
                    }
                    updateEndDate();
                }
            };
        }

        // ==================== 父任务选择 ====================
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
                            autoLevelDisplay.textContent = `${newLevel}级`;
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
                        autoLevelDisplay.textContent = '1级';
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

        // ==================== 自动计算结束日期 ====================
        const startInput = form.querySelector('#editStart');
        const endDateDisplay = form.querySelector('#calculatedEndDate');
        const durationTypeHint = form.querySelector('#durationTypeHint');
        
        const updateEndDate = () => {
            const start = startInput ? startInput.value : null;
            const duration = durationSelect ? parseInt(durationSelect.value) || 0 : 0;
            const durationType = durationTypeSelect ? durationTypeSelect.value : 'days';
            
            if (start && duration >= 0 && endDateDisplay) {
                const startDate = new Date(start);
                const endDate = calculateEndDate(startDate, duration, durationType);
                const endDateStr = formatDate(endDate);
                
                endDateDisplay.textContent = endDateStr;
                endDateDisplay.style.color = durationType === 'workdays' ? '#667eea' : '#10b981';
                
                if (durationTypeHint) {
                    durationTypeHint.style.color = durationType === 'workdays' ? '#667eea' : '#10b981';
                    
                    if (duration > 0) {
                        const actualDays = daysBetween(startDate, endDate) + 1;
                        if (durationType === 'workdays' && actualDays !== duration) {
                            durationTypeHint.textContent = `💼 工作日 (跨${actualDays}天)`;
                        } else {
                            durationTypeHint.textContent = durationType === 'workdays' ? '💼 工作日' : '📅 自然日';
                        }
                    } else {
                        durationTypeHint.textContent = durationType === 'workdays' ? '💼 工作日' : '📅 自然日';
                    }
                }
            }
        };
        
        if (startInput) startInput.addEventListener('change', updateEndDate);
        if (durationSelect) durationSelect.addEventListener('change', updateEndDate);
        if (durationTypeSelect) durationTypeSelect.addEventListener('change', updateEndDate);

        // 编辑依赖按钮事件绑定
        const editDepsBtn = form.querySelector('#editDepsBtn');
        
        if (editDepsBtn) {
            editDepsBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showDependencySelector(task, form);
            };
        }

        // 依赖标签删除按钮
        form.querySelectorAll('.dep-tag-remove').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const depId = btn.dataset.depId;
                this.removeDependency(task, depId, form);
            };
        });

        // ==================== 保存按钮 ====================
        const saveBtn = form.querySelector('#saveTask');
        if (saveBtn) {
            saveBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveTaskForm(form, task);
            };
        }

        // ==================== 关闭按钮 ====================
        const cancelForm = () => {
            this.cleanupForm(form);
            form.remove();
        };
        
        const closeBtn = form.querySelector('#closeForm');
        if (closeBtn) closeBtn.onclick = cancelForm;

        // ==================== 添加子任务 ====================
        const addSubTaskBtn = form.querySelector('#addSubTask');
        if (addSubTaskBtn) {
            addSubTaskBtn.onclick = () => {
                this.addChildTask(task.id);
                form.remove();
            };
        }

        // ==================== 删除任务 ====================
        const deleteTaskBtn = form.querySelector('#deleteTask');
        if (deleteTaskBtn) {
            deleteTaskBtn.onclick = () => {
                if (task.children && task.children.length > 0) {
                    alert(`❌ 无法删除任务 "${task.name}"\n\n此任务包含 ${task.children.length} 个子任务，请先删除子任务。`);
                    addLog(`❌ 无法删除 "${task.name}"：包含 ${task.children.length} 个子任务`);
                    return;
                }
                
                const dependentTasks = this.tasks.filter(t => 
                    t.dependencies && t.dependencies.some(dep => 
                        (typeof dep === 'string' ? dep : dep.taskId) === task.id
                    )
                );
                
                let confirmMessage = `确定删除任务 "${task.name}"？`;
                
                if (dependentTasks.length > 0) {
                    confirmMessage += `\n\n⚠️ 有 ${dependentTasks.length} 个任务依赖此任务，依赖关系将被移除。`;
                }
                
                confirmMessage += '\n\n此操作不可撤销！';
                
                if (confirm(confirmMessage)) {
                    this.deleteTaskWithChildren(task.id);
                    form.remove();
                }
            };
        }

        // ==================== 点击外部关闭 ====================
        const clickOutside = (e) => {
            if (!form.contains(e.target) && !bar.contains(e.target)) {
                this.cleanupForm(form);
                form.remove();
                document.removeEventListener('click', clickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', clickOutside), 0);
        
        console.log('✅ 所有表单事件绑定完成');
    };

    /**
     * 显示依赖任务选择器（修复版 - 保留原有依赖）
     */
    GanttChart.prototype.showDependencySelector = function(task, parentForm) {
        // ... (此处保持不变，已省略以节省空间，请保留原有 showDependencySelector 代码) ...
        // 如果您没有修改这部分，可以复制上一个版本的内容，或者如果需要我提供完整代码请告知
        // 为了确保文件完整，以下是 showDependencySelector 的完整代码
        console.log('🔧 显示依赖任务选择器...');
        
        const oldSelector = document.querySelector('.dependency-selector-modal');
        if (oldSelector) oldSelector.remove();

        const modal = document.createElement('div');
        modal.className = 'dependency-selector-modal';
        
        const availableTasks = this.tasks.filter(t => t.id !== task.id);
        
        const currentDeps = Array.isArray(task.dependencies) ? 
            task.dependencies.map(dep => {
                const depId = typeof dep === 'string' ? dep : dep.taskId;
                return depId;
            }) : [];

        modal.innerHTML = `
            <div class="dependency-selector-overlay"></div>
            <div class="dependency-selector-content">
                <div class="dependency-selector-header">
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-primary" id="confirmDeps" type="button" title="保存">
                            <span style="font-size: 1.1rem;">💾</span>
                        </button>
                    </div>
                    <h6 class="mb-0 fw-bold text-muted">选择依赖任务</h6>
                    <button type="button" class="btn-close" id="closeDepsSelector" aria-label="关闭"></button>
                </div>
                
                <div class="dependency-selector-body">
                    <div class="mb-2">
                        <input type="text" class="form-control form-control-sm" id="depsSearchInput" 
                            placeholder="🔍 搜索任务名称或WBS..." style="font-size: 0.85rem;">
                    </div>
                    
                    <div class="deps-list" id="depsList">
                        ${availableTasks.map(t => {
                            const isChecked = currentDeps.includes(t.id);
                            const indent = '　'.repeat((t.outlineLevel || 1) - 1);
                            const icon = t.isMilestone ? '🎯' : (t.children?.length > 0 ? '📁' : '📋');
                            
                            const validation = isChecked ? 
                                { canAdd: true, reason: '' } : 
                                this.canAddDependency(t.id, task.id);
                            
                            const isDisabled = !validation.canAdd;
                            
                            return `
                                <div class="form-check deps-item ${isDisabled ? 'deps-item-disabled' : ''}" 
                                    data-task-name="${t.name.toLowerCase()}" 
                                    data-task-wbs="${t.wbs || ''}"
                                    ${isDisabled ? `title="禁用原因: ${validation.reason}"` : ''}>
                                    <input class="form-check-input" type="checkbox" 
                                        value="${t.id}" 
                                        id="depCheck_${t.id}"
                                        ${isChecked ? 'checked' : ''}
                                        ${isDisabled ? 'disabled' : ''}>
                                    <label class="form-check-label ${isDisabled ? 'text-muted' : ''}" for="depCheck_${t.id}">
                                        ${indent}${icon} ${t.wbs ? '<span class="wbs-badge-small">[' + t.wbs + ']</span> ' : ''}${t.name}
                                        ${t.isMilestone ? '<span class="badge bg-warning text-dark ms-1" style="font-size:0.6rem">里程碑</span>' : ''}
                                        ${isDisabled ? `<span class="badge bg-secondary ms-1" style="font-size:0.6rem">${validation.reason}</span>` : ''}
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="dependency-selector-footer">
                    <div class="text-muted small">
                        已选择 <strong id="selectedCount">${currentDeps.length}</strong> 个任务
                        <span class="text-info ms-2" style="font-size: 0.7rem;">💡 灰色项为禁止依赖</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.bindDependencySelectorEvents(modal, task, parentForm);
        requestAnimationFrame(() => modal.classList.add('show'));
    };

    /**
     * 绑定依赖选择器事件
     */
    GanttChart.prototype.bindDependencySelectorEvents = function(modal, task, parentForm) {
        const closeDepsSelector = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentElement) modal.parentElement.removeChild(modal);
            }, 200);
        };

        const closeBtn = modal.querySelector('#closeDepsSelector');
        if (closeBtn) closeBtn.onclick = closeDepsSelector;

        const overlay = modal.querySelector('.dependency-selector-overlay');
        if (overlay) overlay.onclick = closeDepsSelector;

        const searchInput = modal.querySelector('#depsSearchInput');
        const depsItems = modal.querySelectorAll('.deps-item');
        
        if (searchInput) {
            searchInput.oninput = () => {
                const keyword = searchInput.value.toLowerCase();
                depsItems.forEach(item => {
                    const name = item.dataset.taskName;
                    const wbs = item.dataset.taskWbs;
                    item.style.display = (name.includes(keyword) || wbs.includes(keyword)) ? 'block' : 'none';
                });
            };
        }

        const checkboxes = modal.querySelectorAll('.deps-list input[type="checkbox"]');
        const selectedCount = modal.querySelector('#selectedCount');
        
        checkboxes.forEach(cb => {
            cb.onchange = () => {
                const count = Array.from(checkboxes).filter(c => c.checked && !c.disabled).length;
                if (selectedCount) selectedCount.textContent = count;
            };
        });

        depsItems.forEach(item => {
            if (item.classList.contains('deps-item-disabled')) {
                item.onclick = (e) => {
                    e.preventDefault();
                    const reason = item.getAttribute('title');
                    if (reason) showTooltip(item, reason.replace('禁用原因: ', ''));
                };
            }
        });

        const confirmBtn = modal.querySelector('#confirmDeps');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const selectedIds = Array.from(checkboxes)
                    .filter(cb => cb.checked && !cb.disabled)
                    .map(cb => cb.value);
                
                task.dependencies = selectedIds.map(depId => ({
                    taskId: depId,
                    type: 'FS',
                    lag: 0
                }));
                
                this.updateDependencyTags(task, parentForm);
                
                const dates = this.generateDates();
                const visibleTasks = getVisibleTasks(this.tasks);
                this.renderDependencies(dates, visibleTasks);
                
                addLog(`✅ 已更新 "${task.name}" 的依赖关系（${selectedIds.length} 个）`);
                closeDepsSelector();
            };
        }
    };

    /**
     * 显示临时提示气泡
     */
    function showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'temp-tooltip';
        tooltip.textContent = message;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.right + 10 + 'px';
        tooltip.style.top = rect.top + (rect.height - tooltip.offsetHeight) / 2 + 'px';
        
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (tooltip.parentElement) {
                    tooltip.parentElement.removeChild(tooltip);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 更新依赖标签显示
     */
    GanttChart.prototype.updateDependencyTags = function(task, form) {
        const container = form.querySelector('#depsTagsContainer');
        if (!container) return;

        const selectedDeps = Array.isArray(task.dependencies) ? 
            task.dependencies.map(dep => {
                const depId = typeof dep === 'string' ? dep : dep.taskId;
                return this.tasks.find(t => t.id === depId);
            }).filter(t => t) : [];

        if (selectedDeps.length > 0) {
            container.innerHTML = selectedDeps.map(dep => {
                const icon = dep.isMilestone ? '🎯' : (dep.children?.length > 0 ? '📁' : '📋');
                return `
                    <span class="dep-tag" data-dep-id="${dep.id}">
                        ${icon} ${dep.wbs ? '[' + dep.wbs + '] ' : ''}${dep.name}
                        <button class="dep-tag-remove" data-dep-id="${dep.id}" type="button" title="移除">×</button>
                    </span>
                `;
            }).join('');
            
            container.querySelectorAll('.dep-tag-remove').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const depId = btn.dataset.depId;
                    this.removeDependency(task, depId, form);
                };
            });
        } else {
            container.innerHTML = '<span class="text-muted small">无依赖任务</span>';
        }
    };

    /**
     * 移除单个依赖
     */
    GanttChart.prototype.removeDependency = function(task, depId, form) {
        if (!task.dependencies) return;

        const depTask = this.tasks.find(t => t.id === depId);
        const depName = depTask ? depTask.name : '未知任务';

        task.dependencies = task.dependencies.filter(dep => {
            const id = typeof dep === 'string' ? dep : dep.taskId;
            return id !== depId;
        });
        
        this.updateDependencyTags(task, form);
        
        const dates = this.generateDates();
        const visibleTasks = getVisibleTasks(this.tasks);
        this.renderDependencies(dates, visibleTasks);
        
        addLog(`✅ 已移除依赖：${depName}`);
    };

    /**
     * 保存任务表单
     */
    GanttChart.prototype.saveTaskForm = function(form, task) {
        const newName = form.querySelector('#editName').value.trim();
        if (!newName) { 
            alert('任务名称不能为空'); 
            return; 
        }

        const isMilestone = form.querySelector('#editMilestone').checked;
        const newParentId = form.querySelector('#editParent').value || null;
        const start = form.querySelector('#editStart').value;
        const duration = parseInt(form.querySelector('#editDuration').value) || 0;
        const durationType = form.querySelector('#editDurationType')?.value || 'days';
        const progress = parseInt(form.querySelector('#editProgress')?.value) || 0;
        const priority = form.querySelector('#editPriority').value;
        const notes = form.querySelector('#editNotes').value.trim();

        const hasChildren = task.children && task.children.length > 0;
        
        if (!hasChildren && !isMilestone && !start) {
            alert('请选择开始日期');
            return;
        }

        if (!hasChildren && !isMilestone && duration < 1) {
            alert('普通任务工期必须大于0');
            return;
        }

        const oldDepsCount = task.dependencies ? task.dependencies.length : 0;

        task.name = newName;
        task.priority = priority;
        task.notes = notes;
        task.isMilestone = isMilestone && !hasChildren;
        task.isSummary = hasChildren;
        task.durationType = durationType;

        if (!hasChildren) {
            task.start = start;
            
            if (isMilestone) {
                task.end = start;
                task.duration = 0;
                task.progress = 100;
                task.durationType = 'days';
            } else {
                const startDate = new Date(start);
                const endDate = calculateEndDate(startDate, duration, durationType);
                
                task.end = formatDate(endDate);
                task.duration = duration;
                task.progress = progress;
            }
        }

        if (task.parentId !== newParentId) {
            this.updateParentRelationship(task, task.parentId, newParentId);
        }

        task.wbs = this.generateWBS(task.id);

        if (!Array.isArray(task.dependencies)) {
            task.dependencies = [];
        }

        task.dependencies = task.dependencies.map(dep => {
            if (typeof dep === 'string') {
                return { taskId: dep, type: 'FS', lag: 0 };
            } else if (typeof dep === 'object' && dep.taskId) {
                return dep;
            }
            return null;
        }).filter(dep => dep);

        const newDepsCount = task.dependencies.length;

        if (hasChildren) {
            this.recalculateSummaryTask(task.id);
        }

        this.updateParentTasks(task.id);
        this.sortTasksByWBS();
        this.cleanupForm(form);
        this.calculateDateRange();
        
        this.render();
        
        setTimeout(() => {
            const dates = this.generateDates();
            const visibleTasks = getVisibleTasks(this.tasks);
            this.renderDependencies(dates, visibleTasks);
            console.log('🔄 依赖箭头已重新渲染');
        }, 50);
        
        const typeLabel = isMilestone ? '（里程碑）' : 
                        hasChildren ? '（汇总任务）' : 
                        `（${task.duration}${durationType === 'workdays' ? '工作日' : '自然日'}）`;
        
        addLog(`✅ 任务已更新：${task.wbs ? '[' + task.wbs + '] ' : ''}${task.name}${typeLabel}`);
        
        if (oldDepsCount !== newDepsCount) {
            addLog(`   依赖关系：${oldDepsCount} → ${newDepsCount} 个`);
        }
        
        form.remove();
    };

    /**
     * 更新表单位置
     */
    GanttChart.prototype.updateFormPosition = function(form, bar, container) {
        try {
            const barRect = bar.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const scrollTop = container.scrollTop;
            const scrollLeft = container.scrollLeft;
            
            const barTopInContainer = barRect.top - containerRect.top + scrollTop;
            const barLeftInContainer = barRect.left - containerRect.left + scrollLeft;
            
            let formTop = barTopInContainer + barRect.height + 8;
            let formLeft = barLeftInContainer + 20;
            
            const formWidth = 420;
            const maxLeft = container.scrollWidth - formWidth - 20;
            if (formLeft > maxLeft) {
                formLeft = maxLeft;
            }
            
            if (formLeft < 10) {
                formLeft = 10;
            }
            
            const viewportHeight = containerRect.height;
            const barBottomInViewport = barRect.bottom - containerRect.top;
            const formHeight = 450;
            
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
            form.style.width = '420px';
            form.style.maxHeight = '85vh';
            form.style.overflowY = 'auto';
            form.style.background = 'white';
            form.style.borderRadius = '12px';
            form.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
            form.style.padding = '14px';
            form.style.border = '1px solid #dee2e6';
            form.style.fontSize = '0.85rem';
        } catch (error) {
            console.error('updateFormPosition error:', error);
        }
    };

    /**
     * 编辑任务名称
     */
    GanttChart.prototype.editTaskName = function(element) {
        // ... (保持不变) ...
        if (element.classList.contains('editing')) return;
        
        const taskId = element.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const originalName = task.name;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.style.cssText = 'border:1px solid #007bff;border-radius:4px;padding:4px 8px;font-size:0.9rem;width:100%;outline:none;';

        element.innerHTML = '';
        element.appendChild(input);
        element.classList.add('editing');
        
        setTimeout(() => { 
            input.focus(); 
            input.select(); 
        }, 10);

        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== originalName) {
                task.name = newName;
                addLog(`✏️ 任务名称从 "${originalName}" 改为 "${newName}"`);
            }
            
            const indent = '　'.repeat((task.outlineLevel || 1) - 1);
            const icon = task.isMilestone ? '🎯' : (task.isSummary ? '📁' : '📋');
            const wbsPrefix = task.wbs ? `<span class="wbs-badge">[${task.wbs}]</span> ` : '';
            
            const collapseBtn = (task.isSummary && task.children && task.children.length > 0) ? 
                `<span class="task-collapse-btn" data-task-id="${task.id}">
                    ${task.isCollapsed ? '▶' : '▼'}
                </span>` : '';
            
            element.innerHTML = `${collapseBtn}<span class="task-name-content">${indent}${icon} ${wbsPrefix}${task.name}</span>`;
            element.classList.remove('editing');
            
            const newCollapseBtn = element.querySelector('.task-collapse-btn');
            if (newCollapseBtn) {
                newCollapseBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.toggleTaskCollapse(task.id);
                };
            }
            
            const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
            if (externalLabel) {
                const displayName = `${indent}${icon} ${task.wbs ? '[' + task.wbs + '] ' : ''}${task.name}`;
                const progressBadge = !task.isMilestone ? `<span class="task-progress-badge">${task.progress || 0}%</span>` : '';
                const collapseToggle = (task.isSummary && task.children && task.children.length > 0) ? 
                    `<span class="collapse-toggle" data-task-id="${task.id}">${task.isCollapsed ? '▶' : '▼'}</span>` : '';
                
                externalLabel.innerHTML = `${displayName} ${progressBadge}${collapseToggle}`;
                
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

        input.onblur = () => setTimeout(saveEdit, 100);
        
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

    console.log('✅ gantt-events-form.js loaded successfully (Epsilon18-Robust - 强力修复工期问题)');

})();