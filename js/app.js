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

// ==================== 任务表单函数（图形化依赖）===================
window.showTaskForm = function(task) {
    const container = document.getElementById('taskFormContainer');
    const duration = daysBetween(task.start, task.end) + 1;
    
    // 可用任务（排除自身）
    const availableTasks = gantt.tasks.filter(t => t.id !== task.id);

    container.innerHTML = `
        <div class="task-form">
            <h6 class="mb-3">编辑任务</h6>
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

            <!-- 图形化依赖选择器 -->
            <div class="mb-3">
                <label class="form-label">依赖任务（点击甘特图任务条选择）</label>
                <div id="depList" class="dep-list border rounded p-2" style="max-height:120px;overflow-y:auto;">
                    ${availableTasks.length > 0 ? availableTasks.map(t => `
                        <div class="dep-item form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" value="${t.id}" id="dep_${t.id}"
                                ${task.dependencies?.includes(t.id) ? 'checked' : ''}>
                            <label class="form-check-label small" for="dep_${t.id}">${t.name}</label>
                        </div>
                    `).join('') : '<small class="text-muted">无其他任务</small>'}
                </div>
                <small class="text-muted">提示：点击甘特图任务条可快速切换依赖</small>
            </div>

            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm" id="saveTask">保存</button>
                <button class="btn btn-secondary btn-sm" id="cancelEdit">取消</button>
            </div>
        </div>
    `;

    // 进度滑块实时显示
    const progressInput = document.getElementById('editProgress');
    const progressVal = document.getElementById('progressVal');
    progressInput.oninput = () => {
        progressVal.textContent = progressInput.value + '%';
    };

    // 保存任务
    document.getElementById('saveTask').onclick = () => {
        const newName = document.getElementById('editName').value.trim();
        if (!newName) {
            alert('任务名称不能为空');
            return;
        }

        task.name = newName;
        task.start = document.getElementById('editStart').value;
        task.end = document.getElementById('editEnd').value;
        task.progress = parseInt(progressInput.value);

        // 收集选中的依赖ID
        task.dependencies = Array.from(document.querySelectorAll('#depList input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        gantt.calculateDateRange();
        gantt.render();
        addLog(`任务 "${task.name}" 已更新`);
        container.innerHTML = '';
    };

    // 取消编辑
    document.getElementById('cancelEdit').onclick = () => {
        container.innerHTML = '';
    };
};

// ==================== 控制按钮事件 ====================

// 添加任务
document.getElementById('addTask').onclick = () => {
    const newTask = {
        id: generateId(),
        name: '新任务',
        start: formatDate(today),
        end: formatDate(addDays(today, 3)),
        progress: 0,
        dependencies: []
    };
    gantt.addTask(newTask);
    gantt.selectTask(newTask.id);
    addLog(`已添加新任务`);
};

// 删除任务
document.getElementById('deleteTask').onclick = () => {
    const task = gantt.getSelectedTask();
    if (task) {
        if (confirm(`确定删除任务 "${task.name}"?`)) {
            gantt.deleteTask(task.id);
            addLog(`已删除任务 "${task.name}"`);
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
    addLog('数据已导出');
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
                addLog(`已加载 ${loadedTasks.length} 个任务`);
            } catch (err) {
                alert('文件格式错误：' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

// ==================== 冲突检测按钮 ====================

document.getElementById('checkConflicts').onclick = () => {
    gantt.checkConflicts();
};

document.getElementById('autoFixConflicts').onclick = () => {
    if (confirm('确定要自动修复所有时间冲突吗？\n\n这会调整冲突任务的开始和结束时间。')) {
        gantt.autoFixConflicts();
    }
};

document.getElementById('clearHighlights').onclick = () => {
    gantt.clearConflictHighlights();
};

// ==================== 编辑设置 ====================

document.getElementById('enableEdit').onchange = (e) => {
    gantt.updateOptions({ enableEdit: e.target.checked });
    addLog(`${e.target.checked ? '已启用' : '已禁用'}拖拽移动`);
};

document.getElementById('enableResize').onchange = (e) => {
    gantt.updateOptions({ enableResize: e.target.checked });
    addLog(`${e.target.checked ? '已启用' : '已禁用'}大小调整`);
};

document.getElementById('showWeekends').onchange = (e) => {
    gantt.updateOptions({ showWeekends: e.target.checked });
    addLog(`${e.target.checked ? '已显示' : '已隐藏'}周末`);
};

document.getElementById('showDependencies').onchange = (e) => {
    gantt.updateOptions({ showDependencies: e.target.checked });
    addLog(`${e.target.checked ? '已显示' : '已隐藏'}依赖箭头`);
};

document.getElementById('cellWidth').oninput = (e) => {
    gantt.updateOptions({ cellWidth: parseInt(e.target.value) });
    document.getElementById('cellWidthValue').textContent = e.target.value;
};

// ==================== 新增：切换视图 ====================
let isPertView = false;
const toggleButton = document.getElementById('toggleView');
toggleButton.onclick = () => {
    isPertView = !isPertView;
    if (isPertView) {
        document.getElementById('ganttContainer').style.display = 'none';
        document.getElementById('pertContainer').style.display = 'block';
        toggleButton.textContent = '切换到甘特视图';
        renderPertView();
        addLog('已切换到PERT视图');
    } else {
        document.getElementById('ganttContainer').style.display = 'block';
        document.getElementById('pertContainer').style.display = 'none';
        toggleButton.textContent = '切换到PERT视图';
        gantt.render(); // 刷新甘特
        addLog('已切换到甘特视图');
    }
};

// ==================== 新增：渲染PERT视图 ====================
function renderPertView() {
    const pertData = gantt.tasks.map(task => ({
        id: task.id,
        duration: daysBetween(task.start, task.end) + 1,
        name: task.name,
        dependsOn: task.dependencies || []
    }));

    const chart = anychart.pert();
    chart.data(pertData, "asTable");
    chart.title("PERT 图");
    chart.container("pertContainer");
    chart.draw();
}

// ==================== 初始化日志 ====================
addLog('甘特图已就绪！悬停任务条可选中，点击可拖拽');
addLog('提示：编辑任务时，点击甘特图任务条可快速设置依赖');
addLog('新功能：检测时间冲突 → 自动修复冲突');
addLog('新功能：切换到PERT视图查看任务网络图');