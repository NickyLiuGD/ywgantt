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
    
    const updateTaskBar = () => {
        const bar = gantt.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`);
        if (bar) {
            const label = bar.querySelector('.gantt-bar-label');
            if (label) label.textContent = `${task.name} (${task.progress}%)`;
        }
    };
    
    // 实时更新名称
    document.getElementById('editName').oninput = (e) => {
        task.name = e.target.value;
        updateTaskBar();
    };
    
    // 实时更新进度显示
    document.getElementById('editProgress').oninput = (e) => {
        const progress = e.target.value;
        document.getElementById('progressVal').textContent = progress + '%';
        
        task.progress = parseInt(progress);
        const bar = gantt.container.querySelector(`.gantt-bar[data-task-id="${task.id}"]`);
        if (bar) {
            const progressBar = bar.querySelector('.gantt-bar-progress');
            if (progressBar) progressBar.style.width = progress + '%';
        }
        updateTaskBar();
    };
    
    // 实时更新依赖
    document.getElementById('editDependencies').oninput = (e) => {
        task.dependencies = e.target.value.split(',').map(id => id.trim()).filter(id => id);
        setTimeout(() => {
            gantt.calculateDateRange();
            gantt.render();
        }, 0);
    };
    
    // 实时更新日期预览和甘特图
    const updateDatePreview = () => {
        const start = document.getElementById('editStart').value;
        const end = document.getElementById('editEnd').value;
        if (start && end) {
            const days = daysBetween(start, end) + 1;
            container.querySelector('.alert-info').innerHTML = `
                <div><strong>📅 持续时间:</strong> ${days} 天</div>
                <div><strong>📍 当前状态:</strong> ${task.progress}% 完成</div>
            `;
        }
    };
    
    document.getElementById('editStart').onchange = (e) => {
        task.start = e.target.value;
        updateDatePreview();
        setTimeout(() => {
            gantt.calculateDateRange();
            gantt.render();
        }, 0);
    };
    
    document.getElementById('editEnd').onchange = (e) => {
        task.end = e.target.value;
        updateDatePreview();
        setTimeout(() => {
            gantt.calculateDateRange();
            gantt.render();
        }, 0);
    };
    
    // 保存按钮
    document.getElementById('updateTask').onclick = () => {
        const oldName = task.name;
        const newStart = task.start;
        const newEnd = task.end;
        const newProgress = task.progress;
        
        let hasError = false;
        
        // 检查开始日期是否晚于结束日期
        if (new Date(newStart) > new Date(newEnd)) {
            alert('开始日期不能晚于结束日期');
            addLog(`⚠️ 无效日期: 开始日期 (${newStart}) 晚于结束日期 (${newEnd})`);
            hasError = true;
        }
        
        // 检查依赖冲突
        const conflict = gantt.checkDependencies(task);
        if (conflict) {
            alert(`时间冲突: 依赖任务 "${conflict.depName}" 结束日期 (${conflict.depEnd}) 晚于本任务开始日期 (${newStart})`);
            addLog(`⚠️ 时间冲突: 任务 "${task.name}" 与依赖 "${conflict.depName}" 冲突`);
            hasError = true;
        }
        
        if (hasError) {
            // 在实时更新中已处理任务数据，无需回滚
            // 只需刷新图表
            setTimeout(() => {
                gantt.calculateDateRange();
                gantt.render();
            }, 0);
            // 不关闭表单
        } else {
            addLog(`✅ 任务 "${oldName}" 已更新为 "${task.name}"`);
            addLog(`   📅 ${newStart} ~ ${newEnd}, 进度: ${newProgress}%`);
            
            container.innerHTML = '';
            setTimeout(() => {
                gantt.calculateDateRange();
                gantt.render();
            }, 0);
        }
    };
    
    // 取消按钮
    document.getElementById('cancelEdit').onclick = () => {
        container.innerHTML = '';
        setTimeout(() => {
            gantt.render();
        }, 0);
        addLog(`❌ 已取消对任务 "${task.name}" 的编辑`);
    };
}

// 暴露给全局
window.showTaskForm = showTaskForm;
