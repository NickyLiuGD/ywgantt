// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图编辑表单模块 (完全展开核对版)                                  ▓▓
// ▓▓ 路径: js/events/gantt-events-form.js                           ▓▓
// ▓▓ 版本: Epsilon30 - 格式展开，功能 100% 完整                      ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 显示任务编辑表单 (主入口)
     * @param {Object} task - 目标任务对象
     */
    GanttChart.prototype.showInlineTaskForm = function(task) {
        // 1. 清理可能存在的旧表单
        const oldForm = this.container.querySelector('.inline-task-form');
        if (oldForm) {
            this.cleanupForm(oldForm); // 确保清理旧的滚动监听
            oldForm.remove();
        }

        // 2. 定位目标任务条（用于计算弹窗位置）
        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`) ||
                    this.container.querySelector(`.gantt-milestone[data-task-id="${task.id}"]`);
        
        if (!bar) {
            console.warn('Task bar not found for:', task.id);
            return;
        }

        // 3. 创建表单容器
        const form = document.createElement('div');
        form.className = 'inline-task-form';
        form.dataset.taskId = task.id;

        // ==================== 工期数据处理 (修复逻辑) ====================
        // 强制转换为整数，防止字符串导致的计算错误
        let durationVal = parseInt(task.duration, 10);
        
        // 容错：如果 duration 无效，尝试根据日期重新计算
        if (isNaN(durationVal)) {
            if (task.start && task.end) {
                durationVal = calculateDuration(task.start, task.end, task.durationType || 'days');
            } else {
                durationVal = 1;
            }
        }

        // 确定显示值：里程碑强制为0，否则使用计算值
        const currentDuration = task.isMilestone ? 0 : durationVal;
        const currentDurationType = task.durationType || 'days';
        const hasChildren = task.children && task.children.length > 0;
        const canDelete = !hasChildren; // 有子任务时禁止删除

        // 生成工期下拉选项 (1-30)
        let durationOptions = '';
        for (let i = 1; i <= 30; i++) {
            const selected = currentDuration === i ? 'selected' : '';
            durationOptions += `<option value="${i}" ${selected}>${i}</option>`;
        }

        // 特殊情况：如果当前工期大于30天，追加一个选项，否则会被重置为1
        if (currentDuration > 30) {
            durationOptions += `<option value="${currentDuration}" selected>${currentDuration}</option>`;
        }
        // ==============================================================

        // 获取已选依赖任务对象 (用于在表单上显示标签)
        const selectedDeps = Array.isArray(task.dependencies) ? 
            task.dependencies.map(dep => {
                const depId = typeof dep === 'string' ? dep : dep.taskId;
                return this.tasks.find(t => t.id === depId);
            }).filter(t => t) : [];

        // 准备展示数据
        const autoTaskType = task.isMilestone ? '里程碑' : (hasChildren ? '汇总任务' : '普通任务');
        const autoWBS = task.wbs || this.generateWBS(task.id);
        const autoOutlineLevel = task.outlineLevel || 1;

        // 构造可用父任务列表 (排除自己和自己的后代，防止循环引用)
        const availableParents = this.tasks.filter(t => 
            t.id !== task.id && 
            !this.isDescendantOf(t.id, task.id) &&
            !t.isMilestone
        );

        // 4. 构建完整的 HTML 结构
        // 使用模板字符串，虽然行数少，但内容是完整的
        form.innerHTML = `
            <!-- 顶部工具栏 -->
            <div class="form-toolbar">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-primary" id="saveTask" type="button" title="保存更改">
                            <span style="font-size: 1.1rem;">💾</span>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" id="deleteTask" type="button" 
                                ${!canDelete ? 'disabled' : ''} 
                                title="${!canDelete ? '包含子任务，无法删除' : '删除任务'}">
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

            <!-- 第一行：任务名称 + 里程碑开关 -->
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

            <!-- 信息展示条 (WBS/层级/类型) -->
            <div class="auto-info-compact mb-2">
                <span><strong>WBS:</strong> <code id="autoWBS">${autoWBS}</code></span>
                <span class="separator">|</span>
                <span><strong>层级:</strong> <code id="autoLevel">${autoOutlineLevel}级</code></span>
                <span class="separator">|</span>
                <span><strong>类型:</strong> <code id="autoType">${autoTaskType}</code></span>
            </div>

            <!-- 父任务选择 -->
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

            <!-- 第二行：时间设定 (开始日期/工期/类型) -->
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
                        <option value="0" ${currentDuration === 0 ? 'selected' : ''}>0</option>
                        ${durationOptions}
                    </select>
                </div>
                <div style="width: 110px; padding-left: 8px;">
                    <label class="form-label-compact">类型</label>
                    <select class="form-select form-select-sm" id="editDurationType"
                            ${task.isMilestone || hasChildren ? 'disabled' : ''}>
                        <option value="workdays" ${currentDurationType === 'workdays' ? 'selected' : ''}>
                            💼 工作日
                        </option>
                        <option value="days" ${currentDurationType === 'days' ? 'selected' : ''}>
                            📅 自然日
                        </option>
                    </select>
                </div>
            </div>

            <!-- 结束日期预览 (自动计算反馈) -->
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

            <!-- 第三行：进度与优先级 -->
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
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 低</option>
                        <option value="medium" ${!task.priority || task.priority === 'medium' ? 'selected' : ''}>🔵 中</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔴 高</option>
                    </select>
                </div>
            </div>

            <!-- 依赖任务管理区域 -->
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
                    ${selectedDeps.length > 0 ? selectedDeps.map(dep => `
                        <span class="dep-tag" data-dep-id="${dep.id}">
                            ${dep.isMilestone ? '🎯' : (dep.children?.length > 0 ? '📁' : '📋')} ${dep.wbs ? '[' + dep.wbs + '] ' : ''}${dep.name}
                            <button class="dep-tag-remove" data-dep-id="${dep.id}" type="button" title="移除此依赖">×</button>
                        </span>
                    `).join('') : '<span class="text-muted small">无依赖任务</span>'}
                </div>
            </div>

            <!-- 备注区域 -->
            <div class="mb-2">
                <label class="form-label-compact">任务备注</label>
                <textarea class="form-control form-control-sm" id="editNotes" 
                        rows="2" 
                        placeholder="输入任务说明..."
                        maxlength="500"
                        style="font-size: 0.8rem;">${this.escapeHtml(task.notes || '')}</textarea>
                <small class="text-muted" id="notesCounter" style="font-size: 0.7rem;">${(task.notes || '').length}/500</small>
            </div>

            <!-- 无法删除的提示 -->
            ${!canDelete ? `
                <small class="text-warning d-block mb-2" style="font-size: 0.7rem; padding: 4px 8px; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
                    ⚠️ 包含 ${task.children.length} 个子任务，删除按钮已禁用
                </small>
            ` : ''}
        `;

        // 5. 将表单插入 DOM
        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        if (!rowsContainer) return;
        
        rowsContainer.appendChild(form);
        
        // 6. 计算初始位置
        this.updateFormPosition(form, bar, rowsContainer);
        
        // 7. 绑定表单内的交互事件
        this.bindFormEvents(form, task, bar, rowsContainer);
    };

    /**
     * 绑定表单内部的所有交互事件 (逻辑部分)
     */
    GanttChart.prototype.bindFormEvents = function(form, task, bar, rowsContainer) {
        // ==================== 滚动跟随逻辑 ====================
        let rafId = null;
        const updatePosition = () => {
            rafId = null;
            // 重新查询 bar，防止 DOM 更新后引用失效
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
        
        // 挂载引用以便后续 cleanup
        form._scrollListener = scrollHandler;
        form._scrollContainer = rowsContainer;
        form._rafId = rafId;

        // ==================== 基础输入联动 ====================
        // 1. 进度条数值显示
        const pInput = form.querySelector('#editProgress');
        if (pInput) {
            pInput.oninput = () => {
                form.querySelector('#progressVal').textContent = pInput.value + '%';
            };
        }

        // 2. 备注字数统计
        const notesInput = form.querySelector('#editNotes');
        if (notesInput) {
            notesInput.oninput = () => {
                form.querySelector('#notesCounter').textContent = `${notesInput.value.length}/500`;
            };
        }

        // ==================== 自动结束日期计算 ====================
        const updateEndDate = () => {
            const start = form.querySelector('#editStart').value;
            const duration = parseInt(form.querySelector('#editDuration').value) || 0;
            const type = form.querySelector('#editDurationType').value;
            const display = form.querySelector('#calculatedEndDate');
            
            if (start && duration >= 0 && display) {
                const end = calculateEndDate(new Date(start), duration, type);
                display.textContent = formatDate(end);
                
                const hint = form.querySelector('#durationTypeHint');
                if (hint) {
                    hint.textContent = type === 'workdays' ? '💼 工作日' : '📅 自然日';
                    hint.style.color = type === 'workdays' ? '#667eea' : '#10b981';
                }
            }
        };
        
        // 绑定多个输入的 change 事件以触发计算
        ['#editStart', '#editDuration', '#editDurationType'].forEach(sel => {
            const el = form.querySelector(sel);
            if(el) el.addEventListener('change', updateEndDate);
        });

        // ==================== 里程碑切换逻辑 ====================
        const mSwitch = form.querySelector('#editMilestone');
        if (mSwitch) {
            mSwitch.onchange = () => {
                const durSel = form.querySelector('#editDuration');
                const typeSel = form.querySelector('#editDurationType');
                const progSec = form.querySelector('#progressPrioritySection');
                
                if (mSwitch.checked) {
                    // 开启里程碑：工期0，禁用类型和进度
                    durSel.value = 0; 
                    durSel.disabled = true;
                    typeSel.disabled = true;
                    progSec.style.display = 'none';
                } else {
                    // 关闭里程碑：恢复工期1，启用所有
                    durSel.value = 1; 
                    durSel.disabled = false;
                    typeSel.disabled = false;
                    progSec.style.display = 'flex';
                }
                updateEndDate();
            };
        }

        // ==================== 操作按钮事件 ====================
        
        // 1. 编辑依赖
        const editDepsBtn = form.querySelector('#editDepsBtn');
        if(editDepsBtn) {
            editDepsBtn.onclick = (e) => { 
                e.stopPropagation(); 
                this.showDependencySelector(task, form); 
            };
        }

        // 2. 移除单个依赖标签
        form.querySelectorAll('.dep-tag-remove').forEach(btn => {
            btn.onclick = (e) => { 
                e.stopPropagation(); 
                this.removeDependency(task, btn.dataset.depId, form); 
            };
        });

        // 3. 保存
        form.querySelector('#saveTask').onclick = (e) => { 
            e.stopPropagation(); 
            this.saveTaskForm(form, task); 
        };
        
        // 4. 关闭
        const close = () => { 
            this.cleanupForm(form); 
            form.remove(); 
        };
        form.querySelector('#closeForm').onclick = close;

        // 5. 添加子任务
        const addSub = form.querySelector('#addSubTask');
        if(addSub) {
            addSub.onclick = () => { 
                this.addChildTask(task.id); 
                form.remove(); 
            };
        }
        
        // 6. 删除任务
        const delTask = form.querySelector('#deleteTask');
        if(delTask) {
            delTask.onclick = () => { 
                if(confirm(`确定删除任务 \"${task.name}\"?`)) { 
                    this.deleteTaskWithChildren(task.id); 
                    form.remove(); 
                }
            };
        }

        // 7. 点击表单外部自动关闭
        const clickOutside = (e) => {
            // 如果点击的不是表单、不是任务条、也不是依赖选择器模态框，则关闭
            if (!form.contains(e.target) && 
                !bar.contains(e.target) && 
                !document.querySelector('.dependency-selector-modal')) {
                close();
                document.removeEventListener('click', clickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', clickOutside), 0);
    };

    /**
     * 显示依赖任务选择器模态框
     */
    GanttChart.prototype.showDependencySelector = function(task, parentForm) {
        // 移除旧选择器
        const oldSelector = document.querySelector('.dependency-selector-modal');
        if (oldSelector) oldSelector.remove();

        const modal = document.createElement('div');
        modal.className = 'dependency-selector-modal';
        
        // 排除自己
        const availableTasks = this.tasks.filter(t => t.id !== task.id);
        
        // 获取当前已选
        const currentDeps = Array.isArray(task.dependencies) ? 
            task.dependencies.map(dep => (typeof dep === 'string' ? dep : dep.taskId)) : [];

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
                    <button type="button" class="btn-close" id="closeDepsSelector"></button>
                </div>
                <div class="dependency-selector-body">
                    <div class="mb-2">
                        <input type="text" class="form-control form-control-sm" id="depsSearchInput" placeholder="🔍 搜索...">
                    </div>
                    <div class="deps-list" id="depsList">
                        ${availableTasks.map(t => {
                            const isChecked = currentDeps.includes(t.id);
                            const indent = '　'.repeat((t.outlineLevel || 1) - 1);
                            
                            // 验证依赖是否合法 (防止循环)
                            const validation = isChecked ? { canAdd: true, reason: '' } : this.canAddDependency(t.id, task.id);
                            const isDisabled = !validation.canAdd;
                            
                            return `
                                <div class="form-check deps-item ${isDisabled ? 'deps-item-disabled' : ''}" 
                                    data-task-name="${t.name.toLowerCase()}" 
                                    ${isDisabled ? `title="禁用原因: ${validation.reason}"` : ''}>
                                    <input class="form-check-input" type="checkbox" value="${t.id}" 
                                        id="depCheck_${t.id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                                    <label class="form-check-label ${isDisabled ? 'text-muted' : ''}" for="depCheck_${t.id}">
                                        ${indent}${t.name}
                                        ${isDisabled ? `<span class="badge bg-secondary ms-1" style="font-size:0.6rem">${validation.reason}</span>` : ''}
                                    </label>
                                </div>`;
                        }).join('')}
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
        const close = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentElement) modal.parentElement.removeChild(modal);
            }, 200);
        };
        
        modal.querySelector('#closeDepsSelector').onclick = close;
        modal.querySelector('.dependency-selector-overlay').onclick = close;

        // 搜索过滤
        modal.querySelector('#depsSearchInput').oninput = (e) => {
            const val = e.target.value.toLowerCase();
            modal.querySelectorAll('.deps-item').forEach(item => {
                item.style.display = item.dataset.taskName.includes(val) ? 'block' : 'none';
            });
        };

        // 禁用项点击提示气泡
        const showTooltip = (el, msg) => {
            const tip = document.createElement('div');
            tip.className = 'temp-tooltip';
            tip.textContent = msg;
            document.body.appendChild(tip);
            const rect = el.getBoundingClientRect();
            tip.style.left = (rect.right + 10) + 'px';
            tip.style.top = (rect.top + 5) + 'px';
            setTimeout(() => { tip.style.opacity=0; setTimeout(()=>tip.remove(), 300); }, 2000);
        };

        modal.querySelectorAll('.deps-item-disabled').forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                const reason = item.getAttribute('title').replace('禁用原因: ', '');
                showTooltip(item, reason);
            };
        });

        // 保存依赖
        modal.querySelector('#confirmDeps').onclick = () => {
            const selectedIds = Array.from(modal.querySelectorAll('.deps-list input:checked')).map(cb => cb.value);
            
            // 构造新依赖数组
            task.dependencies = selectedIds.map(id => ({ taskId: id, type: 'FS', lag: 0 }));
            
            // 更新父表单显示
            this.updateDependencyTags(task, parentForm);
            
            // 立即刷新箭头
            const dates = this.generateDates();
            const visible = getVisibleTasks(this.tasks);
            this.renderDependencies(dates, visible);
            
            close();
        };
    };

    /**
     * 更新表单上的依赖标签
     */
    GanttChart.prototype.updateDependencyTags = function(task, form) {
        const container = form.querySelector('#depsTagsContainer');
        if (!container) return;

        const deps = task.dependencies.map(d => this.tasks.find(t => t.id === (d.taskId || d))).filter(t => t);
        
        if (deps.length === 0) {
            container.innerHTML = '<span class="text-muted small">无依赖任务</span>';
            return;
        }

        container.innerHTML = deps.map(dep => `
            <span class="dep-tag" data-dep-id="${dep.id}">
                ${dep.name} <button class="dep-tag-remove" data-dep-id="${dep.id}">×</button>
            </span>
        `).join('');

        // 重新绑定删除按钮
        container.querySelectorAll('.dep-tag-remove').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.removeDependency(task, btn.dataset.depId, form);
            };
        });
    };

    /**
     * 移除依赖
     */
    GanttChart.prototype.removeDependency = function(task, depId, form) {
        task.dependencies = task.dependencies.filter(d => (d.taskId || d) !== depId);
        this.updateDependencyTags(task, form);
        
        // 刷新箭头
        const dates = this.generateDates();
        this.renderDependencies(dates, getVisibleTasks(this.tasks));
    };

    /**
     * 保存表单数据到任务对象
     */
    GanttChart.prototype.saveTaskForm = function(form, task) {
        const name = form.querySelector('#editName').value.trim();
        if (!name) return alert('任务名称不能为空');

        // 基础属性
        task.name = name;
        task.isMilestone = form.querySelector('#editMilestone').checked;
        task.durationType = form.querySelector('#editDurationType')?.value || 'days';
        task.priority = form.querySelector('#editPriority').value;
        task.notes = form.querySelector('#editNotes').value;

        // 父子关系
        const parentId = form.querySelector('#editParent').value || null;
        if (task.parentId !== parentId) {
            this.updateParentRelationship(task, task.parentId, parentId);
        }

        // 时间属性 (仅当非里程碑且非汇总任务时写入工期)
        if (!task.children || task.children.length === 0) {
            task.start = form.querySelector('#editStart').value;
            
            // ⭐ 关键：使用 parseInt 确保工期是数字
            const duration = parseInt(form.querySelector('#editDuration').value) || 0;
            
            if (task.isMilestone) {
                task.end = task.start;
                task.duration = 0;
                task.progress = 100;
                task.durationType = 'days';
            } else {
                task.duration = duration;
                task.end = formatDate(calculateEndDate(new Date(task.start), duration, task.durationType));
                task.progress = parseInt(form.querySelector('#editProgress').value) || 0;
            }
        }

        // 触发副作用更新
        task.wbs = this.generateWBS(task.id);
        if (task.isSummary || task.parentId) this.recalculateSummaryTask(task.id);
        if (task.parentId) this.updateParentTasks(task.parentId);
        this.sortTasksByWBS();
        
        // 清理与重绘
        this.cleanupForm(form);
        this.calculateDateRange();
        this.render();
        
        // 如果处于全貌视图，自动适配
        if (this.options.isOverviewMode) this.switchToOverviewMode();
        
        addLog(`✅ 任务 "${task.name}" 已更新`);
        form.remove();
    };

    /**
     * 更新表单位置 (防止溢出可视区域)
     */
    GanttChart.prototype.updateFormPosition = function(form, bar, container) {
        const barRect = bar.getBoundingClientRect();
        const conRect = container.getBoundingClientRect();
        
        let top = barRect.bottom - conRect.top + container.scrollTop + 8;
        let left = barRect.left - conRect.left + container.scrollLeft + 20;
        
        // 右边界检查
        if (left + 420 > container.scrollWidth) {
            left = container.scrollWidth - 430;
        }
        // 左边界检查
        if (left < 10) {
            left = 10;
        }
        // 下边界检查 (如果下方空间不足，显示在上方)
        if (top + 450 > conRect.height) {
            top = barRect.top - conRect.top + container.scrollTop - 458; 
        }

        form.style.top = `${top}px`;
        form.style.left = `${left}px`;
    };

    /**
     * 内联任务名称编辑 (双击名称时触发)
     */
    GanttChart.prototype.editTaskName = function(element) {
        if (element.classList.contains('editing')) return;
        
        const taskId = element.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const original = task.name;
        element.innerHTML = `<input type="text" value="${original}" style="width:100%;border:1px solid #007bff;padding:2px;border-radius:3px;">`;
        const input = element.querySelector('input');
        element.classList.add('editing');
        input.focus();

        const save = () => {
            const val = input.value.trim();
            if (val && val !== original) { 
                task.name = val; 
                addLog(`✏️ 重命名: ${val}`); 
            }
            this.render(); // 重绘以恢复 DOM 结构
        };

        input.onblur = save;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') this.render();
        };
        input.onclick = (e) => e.stopPropagation();
    };

    /**
     * 清理函数 (移除事件监听)
     */
    GanttChart.prototype.cleanupForm = function(form) {
        if (form._scrollListener && form._scrollContainer) {
            form._scrollContainer.removeEventListener('scroll', form._scrollListener);
        }
        if (form._rafId) {
            cancelAnimationFrame(form._rafId);
        }
    };

    console.log('✅ gantt-events-form.js loaded successfully (Epsilon30 - Complete)');

})();