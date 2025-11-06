// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图编辑表单模块                                              ▓▓
// ▓▓ 路径: js/events/gantt-events-form.js                           ▓▓
// ▓▓ 版本: Gamma8 - 工期输入版                                      ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 在甘特图内部显示编辑表单（工期版本）
     */
    GanttChart.prototype.showInlineTaskForm = function(task) {
        const oldForm = this.container.querySelector('.inline-task-form');
        if (oldForm) oldForm.remove();

        const bar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`);
        if (!bar) return;

        const form = document.createElement('div');
        form.className = 'inline-task-form';
        form.dataset.taskId = task.id;

        const availableTasks = this.tasks.filter(t => t.id !== task.id);
        const currentDuration = daysBetween(task.start, task.end) + 1;

        form.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0 fw-bold">编辑任务</h6>
                <button type="button" class="btn-close btn-close-sm" id="closeForm"></button>
            </div>
            <div class="mb-2">
                <label class="form-label fw-semibold">任务名称</label>
                <input type="text" class="form-control form-control-sm" id="editName" value="${task.name}">
            </div>
            <div class="row g-2">
                <div class="col-6">
                    <label class="form-label fw-semibold">开始日期</label>
                    <input type="date" class="form-control form-control-sm" id="editStart" value="${task.start}">
                </div>
                <div class="col-6">
                    <label class="form-label fw-semibold">工期（天）</label>
                    <input type="number" class="form-control form-control-sm" id="editDuration" 
                           value="${currentDuration}" min="1" max="365" step="1">
                </div>
            </div>
            <div class="mb-2">
                <small class="text-muted">结束日期：<span id="calculatedEndDate">${task.end}</span></small>
            </div>
            <div class="mb-3">
                <label class="form-label fw-semibold d-flex justify-content-between align-items-center">
                    完成进度: <span id="progressVal">${task.progress}%</span>
                </label>
                <input type="range" class="form-range" id="editProgress" value="${task.progress}" min="0" max="100" step="5">
            </div>
            <div class="mb-3">
                <label class="form-label fw-semibold">依赖任务</label>
                <div id="depList" class="border rounded p-2" style="max-height:100px;overflow-y:auto;background:#f8f9fa;">
                    ${availableTasks.length > 0 ? availableTasks.map(t => `
                        <div class="form-check form-check-inline mb-1">
                            <input class="form-check-input" type="checkbox" value="${t.id}" id="dep_${t.id}"
                                ${task.dependencies?.includes(t.id) ? 'checked' : ''}>
                            <label class="form-check-label small" for="dep_${t.id}">${t.name}</label>
                        </div>
                    `).join('') : '<small class="text-muted">无其他任务</small>'}
                </div>
                <small class="text-muted">提示：点击其他任务条可快速切换依赖</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm flex-fill" id="saveTask">保存</button>
                <button class="btn btn-secondary btn-sm flex-fill" id="cancelEdit">取消</button>
            </div>
        `;

        const rowsContainer = this.container.querySelector('.gantt-rows-container');
        if (!rowsContainer) return;
        
        rowsContainer.appendChild(form);
        this.updateFormPosition(form, bar, rowsContainer);

        // 滚动监听
        let rafId = null;
        const updatePosition = () => {
            rafId = null;
            const currentBar = this.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`);
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
        progressInput.oninput = () => progressVal.textContent = progressInput.value + '%';

        // 自动计算结束日期
        const startInput = form.querySelector('#editStart');
        const durationInput = form.querySelector('#editDuration');
        const endDateDisplay = form.querySelector('#calculatedEndDate');
        
        const updateEndDate = () => {
            const start = startInput.value;
            const duration = parseInt(durationInput.value) || 1;
            
            if (start && duration > 0) {
                const startDate = new Date(start);
                const endDate = addDays(startDate, duration - 1);
                const endDateStr = formatDate(endDate);
                endDateDisplay.textContent = endDateStr;
                endDateDisplay.style.color = '#10b981';
                endDateDisplay.style.fontWeight = '600';
            }
        };
        
        startInput.addEventListener('change', updateEndDate);
        durationInput.addEventListener('input', updateEndDate);

        // 保存
        form.querySelector('#saveTask').onclick = () => {
            const newName = form.querySelector('#editName').value.trim();
            if (!newName) { 
                alert('任务名称不能为空'); 
                return; 
            }
            
            const start = startInput.value;
            const duration = parseInt(durationInput.value);
            
            if (!start) {
                alert('请选择开始日期');
                return;
            }
            
            if (!duration || duration < 1) {
                alert('工期必须大于0天');
                return;
            }
            
            if (duration > 365) {
                alert('工期不能超过365天');
                return;
            }
            
            const startDate = new Date(start);
            const endDate = addDays(startDate, duration - 1);
            
            task.name = newName;
            task.start = start;
            task.end = formatDate(endDate);
            task.progress = parseInt(progressInput.value);
            task.dependencies = Array.from(form.querySelectorAll('#depList input[type="checkbox"]:checked')).map(cb => cb.value);
            
            if (form._scrollListener && form._scrollContainer) {
                form._scrollContainer.removeEventListener('scroll', form._scrollListener);
            }
            if (form._rafId) {
                cancelAnimationFrame(form._rafId);
            }
            
            this.calculateDateRange();
            this.render();
            addLog(`任务 "${task.name}" 已更新，工期 ${duration} 天 (${start} ~ ${task.end})`);
            form.remove();
        };

        // 取消
        const cancelForm = () => {
            if (form._scrollListener && form._scrollContainer) {
                form._scrollContainer.removeEventListener('scroll', form._scrollListener);
            }
            if (form._rafId) {
                cancelAnimationFrame(form._rafId);
            }
            form.remove();
        };
        
        form.querySelector('#cancelEdit').onclick = cancelForm;
        form.querySelector('#closeForm').onclick = cancelForm;

        // 点击外部关闭
        const clickOutside = (e) => {
            if (!form.contains(e.target) && !bar.contains(e.target)) {
                if (form._scrollListener && form._scrollContainer) {
                    form._scrollContainer.removeEventListener('scroll', form._scrollListener);
                }
                if (form._rafId) {
                    cancelAnimationFrame(form._rafId);
                }
                form.remove();
                document.removeEventListener('click', clickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', clickOutside), 0);
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
        const formHeight = 480;
        
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
     * 编辑任务名称
     */
    GanttChart.prototype.editTaskName = function(element) {
        if (element.classList.contains('editing')) return;
        const taskId = element.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        const originalName = task.name;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.style.cssText = 'border:1px solid #007bff;border-radius:4px;padding:4px 8px;font-size:0.9rem;width:100%;outline:none;';

        element.innerHTML = '';
        element.appendChild(input);
        element.classList.add('editing');
        setTimeout(() => { input.focus(); input.select(); }, 10);

        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== originalName) {
                task.name = newName;
                addLog(`任务名称从 "${originalName}" 改为 "${newName}"`);
            }
            element.textContent = task.name;
            element.classList.remove('editing');
            
            const externalLabel = this.container.querySelector(`.gantt-bar-label-external[data-task-id="${taskId}"]`);
            if (externalLabel) {
                externalLabel.textContent = `${task.name} (${task.progress || 0}%)`;
            }
        };

        input.onblur = () => setTimeout(saveEdit, 100);
        input.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
            else if (e.key === 'Escape') { e.preventDefault(); element.textContent = originalName; element.classList.remove('editing'); }
        };
        input.onclick = (e) => e.stopPropagation();
    };

    console.log('✅ gantt-events-form.js loaded successfully');

})();
