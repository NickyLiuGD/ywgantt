// js/ui/controls.js
export function initControls(gantt) {
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
        gantt.selectTask(newTask.id);
        addLog('已添加新任务');
    };

    // 删除任务
    document.getElementById('deleteTask').onclick = () => {
        const task = gantt.getSelectedTask();
        if (!task) return alert('请先选择一个任务');
        if (confirm(`确定删除任务 "${task.name}"？`)) {
            gantt.deleteTask(task.id);
            addLog(`已删除任务 "${task.name}"`);
            document.getElementById('taskFormContainer').innerHTML = '';
        }
    };

    // 导出数据
    document.getElementById('saveData').onclick = () => {
        const filename = `gantt-${formatDate(new Date())}.json`;
        downloadJSON(gantt.tasks, filename);
        addLog('数据已导出');
    };

    // 导入数据
    document.getElementById('loadData').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const tasks = JSON.parse(ev.target.result);
                    gantt.tasks = tasks;
                    gantt.calculateDateRange();
                    gantt.render();
                    addLog(`已加载 ${tasks.length} 个任务`);
                } catch (err) {
                    alert('文件格式错误：' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    // 冲突检测
    document.getElementById('checkConflicts').onclick = () => gantt.checkConflicts();
    document.getElementById('autoFixConflicts').onclick = () => {
        if (confirm('确定自动修复所有时间冲突吗？')) gantt.autoFixConflicts();
    };
    document.getElementById('clearHighlights').onclick = () => gantt.clearConflictHighlights();
}