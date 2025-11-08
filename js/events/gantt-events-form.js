// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图编辑表单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-form.js                           ▓▓
// ▓▓ 版本: Epsilon4 - 极简交互版                                    ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 显示任务编辑表单（极简版）
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
            !t.isMilestone  // 里程碑不能作为父任务
        );
        
        // 获取可选依赖任务
        const availableDeps = this.tasks.filter(t => t.id !== task.id);
        
        const currentDuration = task.isMilestone ? 0 : (task.duration || daysBetween(task.start, task.end) + 1);
        const currentParent = task.parentId ? this.tasks.find(t => t.id === task.parentId) : null;
        
        // 🤖 自动判断任务类型
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
                <button type="button" class="btn-close btn-close-sm" id="closeForm"></button>
            </div>

            <!-- 基本信息 -->
            <div class="form-section">
                <div class="mb-2">
                    <label class="form-label fw-semibold">任务名称</label>
                    <input type="text" class="form-control form-control-sm" id="editName" 
                           value="${this.escapeHtml(task.name)}" placeholder="输入任务名称">
                </div>

                <!-- ⭐ 核心输入1：层级关系（父任务选择） -->
                <div class="mb-2">
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

                <!-- ⭐ 核心输入2：里程碑开关 -->
                <div class="mb-2">
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
                    <small class="text-muted d-block ms-4">里程碑：工期为0，标记项目关键节点</small>
                </div>
            </div>

            <!-- 🤖 自动计算信息（只读显示） -->
            <div class="form-section bg-light p-2 rounded">
                <div class="row g-2 small">
                    <div class="col-6">
                        <span class="text-muted">WBS编号：</span>
                        <strong class="text-primary" id="autoWBS">${autoWBS}</strong>
                    </div>
                    <div class="col-6">
                        <span class="text-muted">层级深度：</span>
                        <strong class="text-info" id="autoLevel">第 ${autoOutlineLevel} 级</strong>
                    </div>
                    <div class="col-12">
                        <span class="text-muted">任务类型：</span>
                        <strong class="text-success" id="autoType">${autoTaskType}</strong>
                        ${task.children && task.children.length > 0 ? 
                            `<span class="badge bg-info ms-2" style="font-size:0.65rem">含 ${task.children.length} 个子任务</span>` : ''}
                    </div>
                </div>
            </div>

            <!-- 时间设置 -->
            <div class="form-section" id="timeSection">
                <div class="row g-2">
                    <div class="col-6">
                        <label class="form-label fw-semibold">开始日期</label>
                        <input type="date" class="form-control form-control-sm" id="editStart" 
                               value="${task.start}"
                               ${task.children && task.children.length > 0 ? 'disabled' : ''}>
                    </div>
                    <div class="col-6">
                        <label class="form-label fw-semibold">工期（天）</label>
                        <input type="number" class="form-control form-control-sm" id="editDuration" 
                               value="${currentDuration}" min="0" max="365" step="1"
                               ${task.isMilestone || (task.children && task.children.length > 0) ? 'disabled' : ''}>
                    </div>
                </div>
                ${task.children && task.children.length > 0 ? 
                    `<small class="text-warning d-block mt-1">⚠️ 汇总任务的时间由子任务自动计算</small>` : 
                    `<small class="text-muted d-block mt-1">结束日期：<span id="calculatedEndDate" class="fw-semibold text-success">${task.end}</span></small>`}
            </div>

            <!-- 进度（仅普通任务） -->
            <div class="form-section" id="progressSection" ${task.children?.length > 0 || task.isMilestone ? 'style="display:none"' : ''}>
                <label class="form-label fw-semibold d-flex justify-content-between align-items-center">
                    完成进度
                    <span id="progressVal" class="badge bg-primary">${task.progress || 0}%</span>
                </label>
                <input type="range" class="form-range" id="editProgress" 
                       value="${task.progress || 0}" min="0" max="100" step="5">
            </div>

            <!-- 优先级 -->
            <div class="form-section">
                <label class="form-label fw-semibold">优先级</label>
                <div class="btn-group w-100" role="group">
                    <input type="radio" class="btn-check" name="priority" id="priorityLow" value="low" 
                           ${task.priority === 'low' ? 'checked' : ''}>
                    <label class="btn btn-outline-secondary btn-sm" for="priorityLow">低</label>

                    <input type="radio" class="btn-check" name="priority" id="priorityMedium" value="medium"
                           ${!task.priority || task.priority === 'medium' ? 'checked' : ''}>
                    <label class="btn btn-outline-primary btn-sm" for="priorityMedium">中</label>

                    <input type="radio" class="btn-check" name="priority" id="priorityHigh" value="high"
                           ${task.priority === 'high' ? 'checked' : ''}>
                    <label class="btn btn-outline-danger btn-sm" for="priorityHigh">高</label>
                </div>
            </div>

            <!-- 依赖关系 -->
            <div class="form-section">
                <label class="form-label fw-semibold">依赖任务（前置任务）</label>
                <div id="depList" class="border rounded p-2" style="max-height:120px;overflow-y:auto;background:#f8f9fa;">
                    ${availableDeps.length > 0 ? availableDeps.map(t => {
                        const isChecked = Array.isArray(task.dependencies) ? 
                            task.dependencies.some(dep => 
                                typeof dep === 'string' ? dep === t.id : dep.taskId === t.id
                            ) : false;
                        
                        const indent = '├─ '.repeat((t.outlineLevel || 1) - 1);
                        const icon = t.isMilestone ? '🎯' : t.children?.length > 0 ? '📁' : '📋';
                        
                        return `
                            <div class="form-check mb-1">
                                <input class="form-check-input" type="checkbox" value="${t.id}" id="dep_${t.id}"
                                    ${isChecked ? 'checked' : ''}>
                                <label class="form-check-label small d-flex justify-content-between align-items-center" for="dep_${t.id}">
                                    <span>${indent}${icon} ${t.wbs ? '[' + t.wbs + '] ' : ''}${t.name}</span>
                                    ${t.isMilestone ? '<span class="badge bg-warning text-dark" style="font-size:0.6rem">里程碑</span>' : ''}
                                </label>
                            </div>
                        `;
                    }).join('') : '<small class="text-muted">无其他任务</small>'}
                </div>
                <small class="text-muted">提示：点击其他任务条可快速切换依赖</small>
            </div>

            <!-- 任务备注 -->
            <div class="form-section">
                <label class="form-label fw-semibold">任务备注</label>
                <textarea class="form-control form-control-sm" id="editNotes" rows="3" 
                          placeholder="输入任务说明、注意事项、相关文档链接等..."
                          maxlength="500">${this.escapeHtml(task.notes || '')}</textarea>
                <small class="text-muted" id="notesCounter">${(task.notes || '').length}/500 字符</small>
            </div>

            <!-- 操作按钮 -->
            <div class="d-flex gap-2 mt-3">
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

        // ==================== 事件绑定 ====================
        
        this.bindFormEvents(form, task, bar, rowsContainer);
    };

    /**
     * 绑定表单事件
     */
    GanttChart.prototype.bindFormEvents = function(form, task, bar, rowsContainer) {
        // 滚动监听
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

        // 进度条同步
        const progressInput = form.querySelector('#editProgress');
        const progressVal = form.querySelector('#progressVal');
        if (progressInput && progressVal) {
            progressInput.oninput = () => {
                progressVal.textContent = progressInput.value + '%';
            };
        }

        // 备注字符计数
        const notesInput = form.querySelector('#editNotes');
        const notesCounter = form.querySelector('#notesCounter');
        if (notesInput && notesCounter) {
            notesInput.oninput = () => {
                const length = notesInput.value.length;
                notesCounter.textContent = `${length}/500 字符`;
                notesCounter.style.color = length > 450 ? '#dc3545' : '#6c757d';
            };
        }

        // ⭐ 里程碑开关切换
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
                    progressSection.style.display = 'none';
                    autoTypeDisplay.textContent = '里程碑';
                    autoTypeDisplay.className = 'text-warning fw-bold';
                    updateEndDate();
                } else {
                    // 切换为普通任务
                    durationInput.value = 1;
                    durationInput.disabled = false;
                    progressSection.style.display = 'block';
                    autoTypeDisplay.textContent = '普通任务';
                    autoTypeDisplay.className = 'text-success';
                    updateEndDate();
                }
            };
        }

        // ⭐ 父任务选择变更
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
                        autoLevelDisplay.textContent = `第 ${newLevel} 级`;
                        
                        // 🤖 自动预览 WBS
                        const parentWBS = newParent.wbs || this.generateWBS(newParent.id);
                        const siblingCount = (newParent.children || []).length;
                        const previewWBS = `${parentWBS}.${siblingCount + 1}`;
                        autoWBSDisplay.textContent = previewWBS;
                        autoWBSDisplay.style.color = '#06b6d4';
                    }
                } else {
                    // 顶级任务
                    autoLevelDisplay.textContent = '第 1 级';
                    const topLevelCount = this.tasks.filter(t => !t.parentId).length;
                    autoWBSDisplay.textContent = String(topLevelCount);
                    autoWBSDisplay.style.color = '#667eea';
                }
            };
        }

        // 自动计算结束日期
        const startInput = form.querySelector('#editStart');
        const endDateDisplay = form.querySelector('#calculatedEndDate');
        
        const updateEndDate = () => {
            const start = startInput.value;
            const duration = parseInt(durationInput.value) || 0;
            
            if (start && duration >= 0) {
                const startDate = new Date(start);
                const endDate = duration === 0 ? startDate : addDays(startDate, duration - 1);
                const endDateStr = formatDate(endDate);
                if (endDateDisplay) {
                    endDateDisplay.textContent = endDateStr;
                    endDateDisplay.style.color = '#10b981';
                    endDateDisplay.style.fontWeight = '600';
                }
            }
        };
        
        if (startInput) startInput.addEventListener('change', updateEndDate);
        if (durationInput) durationInput.addEventListener('input', updateEndDate);

        // 保存按钮
        form.querySelector('#saveTask').onclick = () => {
            this.saveTaskForm(form, task);
        };

        // 取消按钮
        const cancelForm = () => {
            this.cleanupForm(form);
            form.remove();
        };
        
        form.querySelector('#cancelEdit').onclick = cancelForm;
        form.querySelector('#closeForm').onclick = cancelForm;

        // 添加子任务按钮
        const addSubTaskBtn = form.querySelector('#addSubTask');
        if (addSubTaskBtn) {
            addSubTaskBtn.onclick = () => {
                this.addChildTask(task.id);
                form.remove();
            };
        }

        // 删除任务按钮
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

        // 点击外部关闭
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
     * 保存任务表单（自动处理逻辑）
     */
    GanttChart.prototype.saveTaskForm = function(form, task) {
        const newName = form.querySelector('#editName').value.trim();
        if (!newName) { 
            alert('任务名称不能为空'); 
            return; 
        }

        // 🤖 获取用户输入
        const isMilestone = form.querySelector('#editMilestone').checked;
        const newParentId = form.querySelector('#editParent').value || null;
        const start = form.querySelector('#editStart').value;
        const duration = parseInt(form.querySelector('#editDuration').value) || 0;
        const progress = parseInt(form.querySelector('#editProgress')?.value || 0);
        const priority = form.querySelector('input[name="priority"]:checked').value;
        const notes = form.querySelector('#editNotes').value.trim();

        // 验证
        const hasChildren = task.children && task.children.length > 0;
        
        if (!hasChildren && !isMilestone && !start) {
            alert('请选择开始日期');
            return;
        }

        if (!hasChildren && !isMilestone && duration < 1) {
            alert('普通任务工期必须大于0天');
            return;
        }

        if (notes.length > 500) {
            alert('备注不能超过500字符');
            return;
        }

        // 保存旧值（用于日志）
        const oldParentId = task.parentId;
        const oldName = task.name;

        // 🤖 更新基本信息
        task.name = newName;
        task.priority = priority;
        task.notes = notes;
        task.isMilestone = isMilestone && !hasChildren; // 有子任务时强制不是里程碑

        // 🤖 自动判断任务类型
        task.isSummary = hasChildren;

        // 🤖 更新时间（汇总任务跳过）
        if (!hasChildren) {
            task.start = start;
            
            if (isMilestone) {
                task.end = start;
                task.duration = 0;
                task.progress = 100; // 里程碑默认100%
            } else {
                const startDate = new Date(start);
                const endDate = addDays(startDate, duration - 1);
                task.end = formatDate(endDate);
                task.duration = duration;
                task.progress = progress;
            }
        }

        // 🤖 处理父任务变更
        if (oldParentId !== newParentId) {
            this.updateParentRelationship(task, oldParentId, newParentId);
        }

        // 🤖 自动生成 WBS
        task.wbs = this.generateWBS(task.id);

        // 🤖 更新依赖关系
        const checkedDeps = Array.from(form.querySelectorAll('#depList input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        task.dependencies = checkedDeps.map(depId => ({
            taskId: depId,
            type: 'FS',
            lag: 0
        }));

        // 🤖 如果是汇总任务，重新计算时间范围
        if (hasChildren) {
            this.recalculateSummaryTask(task.id);
        }

        // 🤖 更新所有父任务的时间范围
        this.updateParentTasks(task.id);

        // 🤖 重新排序任务（按WBS）
        this.sortTasksByWBS();

        this.cleanupForm(form);
        this.calculateDateRange();
        this.render();
        
        const changeLog = [];
        if (oldName !== newName) changeLog.push(`名称: ${oldName} → ${newName}`);
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
     * 🤖 更新父子关系
     */
    GanttChart.prototype.updateParentRelationship = function(task, oldParentId, newParentId) {
        // 从旧父任务移除
        if (oldParentId) {
            const oldParent = this.tasks.find(t => t.id === oldParentId);
            if (oldParent && oldParent.children) {
                oldParent.children = oldParent.children.filter(cid => cid !== task.id);
                
                // 🤖 如果旧父任务没有子任务了，取消汇总状态
                if (oldParent.children.length === 0) {
                    oldParent.isSummary = false;
                    addLog(`   "${oldParent.name}" 已自动取消汇总任务状态`);
                } else {
                    // 重新计算旧父任务
                    this.recalculateSummaryTask(oldParentId);
                }
            }
        }
        
        // 添加到新父任务
        if (newParentId) {
            const newParent = this.tasks.find(t => t.id === newParentId);
            if (newParent) {
                if (!newParent.children) newParent.children = [];
                if (!newParent.children.includes(task.id)) {
                    newParent.children.push(task.id);
                }
                
                // 🤖 自动设置为汇总任务
                if (!newParent.isSummary) {
                    newParent.isSummary = true;
                    addLog(`   "${newParent.name}" 已自动设为汇总任务`);
                }
                
                // 🤖 自动更新层级深度
                task.outlineLevel = (newParent.outlineLevel || 1) + 1;
                
                // 🤖 递归更新所有子任务的层级
                this.updateChildrenOutlineLevel(task.id);
            }
        } else {
            // 🤖 设为顶级任务
            task.outlineLevel = 1;
            this.updateChildrenOutlineLevel(task.id);
        }

        task.parentId = newParentId;
    };

    /**
     * 🤖 递归更新子任务的层级深度
     */
    GanttChart.prototype.updateChildrenOutlineLevel = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.children || task.children.length === 0) return;

        const parentLevel = task.outlineLevel || 1;
        
        task.children.forEach(childId => {
            const child = this.tasks.find(t => t.id === childId);
            if (child) {
                child.outlineLevel = parentLevel + 1;
                this.updateChildrenOutlineLevel(childId); // 递归
            }
        });
    };

    /**
     * 🤖 重新计算汇总任务的时间范围
     */
    GanttChart.prototype.recalculateSummaryTask = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.isSummary || !task.children || task.children.length === 0) {
            return;
        }

        let minStart = null;
        let maxEnd = null;
        let totalProgress = 0;
        let totalDuration = 0;

        // 遍历所有子任务
        task.children.forEach(childId => {
            const child = this.tasks.find(t => t.id === childId);
            if (!child) return;

            // 🤖 如果子任务也是汇总任务，先递归计算
            if (child.isSummary) {
                this.recalculateSummaryTask(childId);
            }

            const childStart = new Date(child.start);
            const childEnd = new Date(child.end);

            if (!minStart || childStart < minStart) minStart = childStart;
            if (!maxEnd || childEnd > maxEnd) maxEnd = childEnd;

            // 🤖 加权平均进度（按工期加权）
            const childDuration = child.duration || 1;
            totalProgress += (child.progress || 0) * childDuration;
            totalDuration += childDuration;
        });

        if (minStart && maxEnd) {
            task.start = formatDate(minStart);
            task.end = formatDate(maxEnd);
            task.duration = daysBetween(minStart, maxEnd) + 1;
            task.progress = totalDuration > 0 ? 
                Math.round(totalProgress / totalDuration) : 0;
        }
    };

    /**
     * 🤖 更新所有父任务（递归向上）
     */
    GanttChart.prototype.updateParentTasks = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.parentId) return;

        this.recalculateSummaryTask(task.parentId);
        this.updateParentTasks(task.parentId); // 递归
    };

    /**
     * 🤖 自动生成 WBS 编号
     */
    GanttChart.prototype.generateWBS = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return '';

        if (!task.parentId) {
            // 🤖 顶级任务：计算同级序号
            const topLevelTasks = this.tasks.filter(t => !t.parentId);
            const index = topLevelTasks.findIndex(t => t.id === taskId);
            return String(index + 1);
        } else {
            // 🤖 子任务：父WBS + 同级序号
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (!parent) return '';

            const parentWBS = parent.wbs || this.generateWBS(parent.id);
            const siblings = parent.children || [];
            const index = siblings.indexOf(taskId);
            
            return `${parentWBS}.${index + 1}`;
        }
    };

    /**
     * 🤖 按 WBS 排序任务
     */
    GanttChart.prototype.sortTasksByWBS = function() {
        this.tasks.sort((a, b) => {
            const wbsA = a.wbs || '';
            const wbsB = b.wbs || '';
            
            if (!wbsA && !wbsB) return 0;
            if (!wbsA) return 1;
            if (!wbsB) return -1;
            
            const partsA = wbsA.split('.').map(n => parseInt(n));
            const partsB = wbsB.split('.').map(n => parseInt(n));
            
            for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                const numA = partsA[i] || 0;
                const numB = partsB[i] || 0;
                if (numA !== numB) return numA - numB;
            }
            
            return 0;
        });
    };

    /**
     * 添加子任务
     */
    GanttChart.prototype.addChildTask = function(parentId) {
        const parent = this.tasks.find(t => t.id === parentId);
        if (!parent) return;

        const newTask = {
            id: generateId(),
            uid: this.getNextUID(),
            name: '新子任务',
            start: formatDate(new Date(parent.start)),
            end: formatDate(addDays(new Date(parent.start), 2)),
            duration: 3,
            progress: 0,
            isMilestone: false,
            isSummary: false,
            parentId: parentId,
            children: [],
            outlineLevel: (parent.outlineLevel || 1) + 1,
            wbs: '',  // 🤖 稍后自动生成
            priority: 'medium',
            notes: '',
            dependencies: []
        };

        // 🤖 添加到父任务的子任务列表
        if (!parent.children) parent.children = [];
        parent.children.push(newTask.id);
        
        // 🤖 设置父任务为汇总任务
        parent.isSummary = true;

        // 插入到父任务后面
        const parentIndex = this.tasks.findIndex(t => t.id === parentId);
        this.tasks.splice(parentIndex + 1, 0, newTask);

        // 🤖 生成 WBS
        newTask.wbs = this.generateWBS(newTask.id);

        // 🤖 重新计算父任务时间
        this.recalculateSummaryTask(parentId);

        this.calculateDateRange();
        this.render();

        // 自动选中并编辑
        setTimeout(() => {
            this.selectTask(newTask.id);
            this.showInlineTaskForm(newTask);
            addLog(`✅ 已为 "${parent.name}" 添加子任务 [${newTask.wbs}]`);
        }, 100);
    };

    /**
     * 删除任务及其所有子任务
     */
    GanttChart.prototype.deleteTaskWithChildren = function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const toDelete = [taskId];
        
        // 🤖 递归收集所有子任务
        const collectChildren = (id) => {
            const t = this.tasks.find(task => task.id === id);
            if (t && t.children && t.children.length > 0) {
                t.children.forEach(childId => {
                    toDelete.push(childId);
                    collectChildren(childId);
                });
            }
        };
        collectChildren(taskId);

        // 🤖 从父任务移除
        if (task.parentId) {
            const parent = this.tasks.find(t => t.id === task.parentId);
            if (parent && parent.children) {
                parent.children = parent.children.filter(cid => cid !== taskId);
                
                // 🤖 如果父任务没有子任务了，取消汇总状态
                if (parent.children.length === 0) {
                    parent.isSummary = false;
                    addLog(`   "${parent.name}" 已自动取消汇总任务状态`);
                } else {
                    // 重新计算父任务
                    this.recalculateSummaryTask(parent.id);
                }
            }
        }

        // 删除所有相关任务
        this.tasks = this.tasks.filter(t => !toDelete.includes(t.id));
        
        // 🤖 清理其他任务的依赖
        this.tasks.forEach(t => {
            if (t.dependencies && t.dependencies.length > 0) {
                t.dependencies = t.dependencies.filter(dep => {
                    const depId = typeof dep === 'string' ? dep : dep.taskId;
                    return !toDelete.includes(depId);
                });
            }
        });

        if (this.selectedTask === taskId) {
            this.selectedTask = null;
        }

        // 🤖 重新生成所有 WBS
        this.tasks.forEach(t => {
            t.wbs = this.generateWBS(t.id);
        });

        this.calculateDateRange();
        this.render();

        addLog(`✅ 已删除任务 "${task.name}"${toDelete.length > 1 ? ` 及 ${toDelete.length - 1} 个子任务` : ''}`);
    };

    /**
     * 获取下一个 UID
     */
    GanttChart.prototype.getNextUID = function() {
        const maxUID = this.tasks.reduce((max, task) => 
            Math.max(max, task.uid || 0), 0);
        return maxUID + 1;
    };

    /**
     * 判断任务A是否是任务B的后代
     */
    GanttChart.prototype.isDescendantOf = function(taskAId, taskBId) {
        const taskA = this.tasks.find(t => t.id === taskAId);
        if (!taskA || !taskA.parentId) return false;
        
        if (taskA.parentId === taskBId) return true;
        
        return this.isDescendantOf(taskA.parentId, taskBId);
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

    console.log('✅ gantt-events-form.js loaded successfully (Epsilon4 - 极简交互版)');

})();
