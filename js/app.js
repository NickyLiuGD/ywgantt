/**
 * 任务表单模块
 * 负责任务编辑表单的显示和交互
 */

/**
 * 显示任务编辑表单
 * @param {Object} task - 任务对象
 * @param {Object} gantt - 甘特图实例
 */
function showTaskForm(task, gantt) {
    const container = document.getElementById('taskFormContainer');
    const duration = daysBetween(task.start, task.end) + 1;
    
    container.innerHTML = `
        <div class="task-form">
            <h6 class="mb-3">📝 编辑任务</h6>
            <div class="mb-2">
                <label class="form-label">任务名称</label>
                <input type="text" class="form-control form-control-sm" id="editName" value="${task.name}">
            </div>
            <div class="row">
                <div class="col-6 mb-2">
                    <label class="form-label">开始日期</label>
                    <input type="date" class="form-control form-control-sm" id="editStart" value="${task.start}">
                </div>
                <div class="col-6 mb-2">
                    <label class="form-label">结束日期</label>
                    <input type="date" class="form-control form-control-sm" id="editEnd" value="${task.end}">
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">完成进度: <strong id="progressVal">${task.progress}%</strong></label>
                <input type="range" class="form-range" id="editProgress" value="${task.progress}" min="0" max="100" step="5">
            </div>
            <div class="mb-2">
                <label class="form-label">依赖任务 (ID,逗号分隔)</label>
                <input type="text" class="form-control form-control-sm" id="editDependencies" value="${task.dependencies ? task.dependencies.join(',') : ''}">
            </div>
            <div class="alert alert-info py-2 px-3 mb-3" style="font-size: 0.85rem;">
                <div><strong>📅 持续时间:</strong> ${duration} 天</div>
                <div><strong>📍 当前状态:</strong> ${task.progress}% 完成</div>
            </div>
            <div class="d-grid gap-2">
                <button class="btn btn-primary btn-sm" id="updateTask">
                    ✓ 保存更改
                </button>
                <button class="btn btn-outline-secondary btn-sm" id="cancelEdit">
                    ✕ 取消编辑
                </button>
            </div>
        </div>
    `;
    
    // 实时更新进度显示
    document.getElementById('editProgress').oninput = (e) => {
        const progress = e.target.value;
        document.getElementById('progressVal').textContent = progress + '%';
        
        const bar = gantt.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`);
        if (bar) {
            const progressBar = bar.querySelector('.gantt-bar-progress');
            const label = bar.querySelector('.gantt-bar-label');
            if (progressBar) progressBar.style.width = progress + '%';
            if (label) label.textContent = `${task.name} (${progress}%)`;
        }
    };
    
    // 实时更新日期预览
    const updateDatePreview = () => {
        const start = document.getElementById('editStart').value;
        const end = document.getElementById('editEnd').value;
        if (start && end) {
            const days = daysBetween(start, end) + 1;
            container.querySelector('.alert-info').innerHTML = `
                <div><strong>📅 持续时间:</strong> ${days} 天</div>
                <div><strong>📍 当前状态:</strong> ${document.getElementById('editProgress').value}% 完成</div>
            `;
        }
    };
    
    document.getElementById('editStart').onchange = updateDatePreview;
    document.getElementById('editEnd').onchange = updateDatePreview;
    
    // 保存按钮
    document.getElementById('updateTask').onclick = () => {
        const oldName = task.name;
        const oldStart = task.start;
        const oldEnd = task.end;
        const oldProgress = task.progress;
        const oldDependencies = task.dependencies ? [...task.dependencies] : [];
        
        const newName = document.getElementById('editName').value;
        const newStart = document.getElementById('editStart').value;
        const newEnd = document.getElementById('editEnd').value;
        const newProgress = parseInt(document.getElementById('editProgress').value);
        const newDependencies = document.getElementById('editDependencies').value.split(',').map(id => id.trim()).filter(id => id);
        
        let hasError = false;
        
        // 检查日期是否有效
        if (!newStart || !newEnd) {
            alert('请选择开始和结束日期');
            hasError = true;
        } else if (new Date(newStart) > new Date(newEnd)) {
            alert('开始日期不能晚于结束日期');
            addLog(`⚠️ 无效日期: 开始日期 (${newStart}) 晚于结束日期 (${newEnd})`);
            hasError = true;
        }
        
        // 检查依赖ID是否存在
        for (const depId of newDependencies) {
            if (!gantt.tasks.find(t => t.id === depId)) {
                alert(`无效依赖ID: ${depId}`);
                addLog(`⚠️ 无效依赖ID: ${depId}`);
                hasError = true;
                break;
            }
        }
        
        // 临时更新任务以检查冲突
        const tempTask = { ...task };
        tempTask.name = newName;
        tempTask.start = newStart;
        tempTask.end = newEnd;
        tempTask.progress = newProgress;
        tempTask.dependencies = newDependencies;
        
        // 检查依赖冲突
        const conflict = gantt.checkDependencies(tempTask);
        if (conflict) {
            alert(`时间冲突: 依赖任务 "${conflict.depName}" 结束日期 (${conflict.depEnd}) 晚于本任务开始日期 (${newStart})`);
            addLog(`⚠️ 时间冲突: 任务 "${newName}" 与依赖 "${conflict.depName}" 冲突`);
            hasError = true;
        }
        
        if (hasError) {
            // 如果有错误，不更新任务，更新表单回旧值
            document.getElementById('editName').value = oldName;
            document.getElementById('editStart').value = oldStart;
            document.getElementById('editEnd').value = oldEnd;
            document.getElementById('editProgress').value = oldProgress;
            document.getElementById('editDependencies').value = oldDependencies.join(',');
            document.getElementById('progressVal').textContent = oldProgress + '%';
            updateDatePreview();
            
            // 刷新甘特图以确保一致
            gantt.calculateDateRange();
            gantt.render();
            // 不关闭表单
        } else {
            // 无错误，更新任务
            task.name = newName;
            task.start = newStart;
            task.end = newEnd;
            task.progress = newProgress;
            task.dependencies = newDependencies;
            
            addLog(`✅ 任务 "${oldName}" 已更新为 "${newName}"`);
            addLog(`   📅 ${newStart} ~ ${newEnd}, 进度: ${newProgress}%`);
            
            gantt.calculateDateRange();
            gantt.render();
            container.innerHTML = '';
        }
    };
    
    // 取消按钮
    document.getElementById('cancelEdit').onclick = () => {
        gantt.render();
        container.innerHTML = '';
        addLog(`❌ 已取消对任务 "${task.name}" 的编辑`);
    };
}

// 暴露给全局
window.showTaskForm = showTaskForm;
