// js/ui/task-form.js
export function showTaskForm(task, gantt) {
    const container = document.getElementById('taskFormContainer');
    const available = gantt.tasks.filter(t => t.id !== task.id);

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

            <div class="mb-3">
                <label class="form-label">依赖任务（点击甘特图任务条选择）</label>
                <div id="depList" class="dep-list border rounded p-2" style="max-height:120px;overflow-y:auto;">
                    ${available.length > 0 ? available.map(t => `
                        <div class="dep-item form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" value="${t.id}" id="dep_${t.id}"
                                ${task.dependencies?.includes(t.id) ? 'checked' : ''}>
                            <label class="form-check-label small" for="dep_${t.id}">${t.name}</label>
                        </div>
                    `).join('') : '<small class="text-muted">无其他任务</small>'}
                </div>
                <small class="text-muted">提示：点击甘特图任务条可切换依赖</small>
            </div>

            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm" id="saveTask">保存</button>
                <button class="btn btn-secondary btn-sm" id="cancelEdit">取消</button>
            </div>
        </div>
    `;

    // 进度实时显示
    const progressInput = document.getElementById('editProgress');
    const progressVal = document.getElementById('progressVal');
    progressInput.oninput = () => progressVal.textContent = progressInput.value + '%';

    // 保存
    document.getElementById('saveTask').onclick = () => {
        const name = document.getElementById('editName').value.trim();
        if (!name) return alert('任务名称不能为空');

        task.name = name;
        task.start = document.getElementById('editStart').value;
        task.end = document.getElementById('editEnd').value;
        task.progress = parseInt(progressInput.value);
        task.dependencies = Array.from(document.querySelectorAll('#depList input:checked'))
            .map(cb => cb.value);

        gantt.calculateDateRange();
        gantt.render();
        addLog(`任务 "${task.name}" 已更新`);
        container.innerHTML = '';
    };

    // 取消
    document.getElementById('cancelEdit').onclick = () => container.innerHTML = '';
}