// js/ui/settings.js
export function initSettings(gantt) {
    document.getElementById('enableEdit').onchange = e => {
        gantt.updateOptions({ enableEdit: e.target.checked });
        addLog(`${e.target.checked ? '已启用' : '已禁用'}拖拽移动`);
    };

    document.getElementById('enableResize').onchange = e => {
        gantt.updateOptions({ enableResize: e.target.checked });
        addLog(`${e.target.checked ? '已启用' : '已禁用'}大小调整`);
    };

    document.getElementById('showWeekends').onchange = e => {
        gantt.updateOptions({ showWeekends: e.target.checked });
        addLog(`${e.target.checked ? '已显示' : '已隐藏'}周末`);
    };

    document.getElementById('showDependencies').onchange = e => {
        gantt.updateOptions({ showDependencies: e.target.checked });
        addLog(`${e.target.checked ? '已显示' : '已隐藏'}依赖箭头`);
    };

    document.getElementById('cellWidth').oninput = e => {
        const value = parseInt(e.target.value);
        gantt.updateOptions({ cellWidth: value });
        document.getElementById('cellWidthValue').textContent = value;
    };
}