/**
 * 应用主文件
 * 负责初始化甘特图和绑定所有事件
 */

// ==================== 初始化任务数据 ====================
const today = new Date();
const initialTasks = [
    {
        id: generateId(),
        name: '网站设计',
        start: formatDate(addDays(today, -5)),
        end: formatDate(addDays(today, 2)),
        progress: 65,
        dependencies: []
    },
    {
        id: generateId(),
        name: '内容编写',
        start: formatDate(addDays(today, 3)),
        end: formatDate(addDays(today, 10)),
        progress: 30,
        dependencies: []
    },
    {
        id: generateId(),
        name: '样式开发',
        start: formatDate(addDays(today, 5)),
        end: formatDate(addDays(today, 8)),
        progress: 45,
        dependencies: []
    },
    {
        id: generateId(),
        name: '测试审核',
        start: formatDate(addDays(today, -2)),
        end: formatDate(addDays(today, 1)),
        progress: 80,
        dependencies: []
    },
    {
        id: generateId(),
        name: '项目上线',
        start: formatDate(addDays(today, 12)),
        end: formatDate(addDays(today, 14)),
        progress: 0,
        dependencies: []
    }
];

// ==================== 创建甘特图实例 ====================
const gantt = new GanttChart('#gantt', initialTasks);

// ==================== 任务表单函数 ====================
/**
 * 显示任务编辑表单
 * @param {Object} task - 任务对象
 */
window.showTaskForm = function(task) {
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
        
        task.progress = parseInt(progress);
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
                <div><strong>📍 当前状态:</strong> ${task.progress}% 完成</div>
            `;
        }
    };
    
    document.getElementById('editStart').onchange = updateDatePreview;
    document.getElementById('editEnd').onchange = updateDatePreview;
    
    // 保存按钮
    document.getElementById('updateTask').onclick = () => {
        const oldName = task.name;
        task.name = document.getElementById('editName').value;
        task.start = document.getElementById('editStart').value;
        task.end = document.getElementById('editEnd').value;
        task.progress = parseInt(document.getElementById('editProgress').value);
        task.dependencies = document.getElementById('editDependencies').value.split(',').map(id => id.trim()).filter(id => id);
        
        const conflict = gantt.checkDependencies(task);
        if (conflict) {
            alert(`时间冲突: 依赖任务 "${conflict.depName}" 结束日期 (${conflict.depEnd}) 晚于本任务开始日期 (${task.start})`);
            addLog(`⚠️ 时间冲突: 任务 "${task.name}" 与依赖 "${conflict.depName}" 冲突`);
            // 可选: 回滚日期
            // task.start = oldStart; 等
        } else {
            gantt.calculateDateRange();
            gantt.render();
            
            addLog(`✅ 任务 "${oldName}" 已更新为 "${task.name}"`);
            addLog(`   📅 ${task.start} ~ ${task.end}, 进度: ${task.progress}%`);
        }
        container.innerHTML = '';
    };
    
    // 取消按钮
    document.getElementById('cancelEdit').onclick = () => {
        gantt.render();
        container.innerHTML = '';
        addLog(`❌ 已取消对任务 "${task.name}" 的编辑`);
    };
};

// ==================== 按钮事件绑定 ====================

// 添加任务
document.getElementById('addTask').onclick = () => {
    const newTask = {
        id: generateId(),
        name: '新任务',
        start: formatDate(new Date()),
        end: formatDate(addDays(new Date(), 3)),
        progress: 0,
        dependencies: []
    };
    gantt.addTask(newTask);
    addLog(`✅ 已添加任务 "${newTask.name}"`);
};

// 删除任务
document.getElementById('deleteTask').onclick = () => {
    const task = gantt.getSelectedTask();
    if (task) {
        if (confirm(`确定删除任务 "${task.name}"?`)) {
            gantt.deleteTask(task.id);
            addLog(`🗑️ 已删除任务 "${task.name}"`);
            document.getElementById('taskFormContainer').innerHTML = '';
        }
    } else {
        alert('请先选择一个任务');
    }
};

// 保存数据
document.getElementById('saveData').onclick = () => {
    const filename = `gantt-${formatDate(new Date())}.json`;
    downloadJSON(gantt.tasks, filename);
    addLog('💾 数据已导出');
};

// 加载数据
document.getElementById('loadData').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const loadedTasks = JSON.parse(event.target.result);
                gantt.tasks = loadedTasks;
                gantt.calculateDateRange();
                gantt.render();
                addLog(`📂 已加载 ${loadedTasks.length} 个任务`);
            } catch (err) {
                alert('文件格式错误：' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

// 启用/禁用拖拽编辑
document.getElementById('enableEdit').onchange = (e) => {
    gantt.updateOptions({ enableEdit: e.target.checked });
    addLog(`${e.target.checked ? '✅ 已启用' : '❌ 已禁用'}拖拽移动`);
};

// 启用/禁用大小调整
document.getElementById('enableResize').onchange = (e) => {
    gantt.updateOptions({ enableResize: e.target.checked });
    addLog(`${e.target.checked ? '✅ 已启用' : '❌ 已禁用'}大小调整`);
};

// 显示/隐藏周末
document.getElementById('showWeekends').onchange = (e) => {
    gantt.updateOptions({ showWeekends: e.target.checked });
    addLog(`${e.target.checked ? '✅ 已显示' : '❌ 已隐藏'}周末`);
};

// 显示/隐藏依赖箭头
document.getElementById('showDependencies').onchange = (e) => {
    gantt.updateOptions({ showDependencies: e.target.checked });
    addLog(`${e.target.checked ? '✅ 已显示' : '❌ 已隐藏'}依赖箭头`);
};

// 调整时间轴密度
document.getElementById('cellWidth').oninput = (e) => {
    gantt.updateOptions({ cellWidth: parseInt(e.target.value) });
    document.getElementById('cellWidthValue').textContent = e.target.value;
};

// ==================== 初始化日志 ====================
addLog('🎉 甘特图已就绪！拖动任务条可编辑日期，拖动两端可调整时长');
addLog('💡 提示：双击任务名称或任务条可以快速编辑任务名称');
