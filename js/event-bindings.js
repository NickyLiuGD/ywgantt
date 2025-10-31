/**
 * 事件绑定模块
 * 负责所有按钮和开关的事件绑定
 */

/**
 * 绑定所有事件
 * @param {Object} gantt - 甘特图实例
 */
function bindEvents(gantt) {
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
}
