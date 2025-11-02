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

// ==================== 新增:渲染PERT视图 ====================
function renderPertView() {
    const pertContainer = document.getElementById('pertContainer');
    pertContainer.innerHTML = ''; // 清空

    // 检查是否有依赖
    const hasDependencies = gantt.tasks.some(task => task.dependencies && task.dependencies.length > 0);

    if (!hasDependencies) {
        pertContainer.innerHTML = `
            <div class="alert alert-info text-center mt-5">
                <h4>无依赖关系</h4>
                <p>PERT视图需要至少一个任务依赖关系才能渲染网络图。请在任务编辑中添加依赖后重试。</p>
            </div>
        `;
        addLog('PERT视图:无依赖,无法渲染。请添加任务依赖。');
        return;
    }

    // 创建SVG画布
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.width = '100%';
    svg.style.height = '600px';
    svg.style.border = '1px solid #dee2e6';
    svg.style.backgroundColor = '#f8f9fa';
    pertContainer.appendChild(svg);

    // 计算节点位置 (使用层级布局)
    const nodes = calculatePertLayout(gantt.tasks);
    const svgWidth = pertContainer.clientWidth;
    const svgHeight = 600;

    // 绘制连接线
    gantt.tasks.forEach(task => {
        if (task.dependencies && task.dependencies.length > 0) {
            task.dependencies.forEach(depId => {
                const fromNode = nodes.find(n => n.id === depId);
                const toNode = nodes.find(n => n.id === task.id);
                if (fromNode && toNode) {
                    drawArrow(svg, fromNode.x, fromNode.y, toNode.x, toNode.y);
                }
            });
        }
    });

    // 绘制节点
    nodes.forEach(node => {
        drawPertNode(svg, node);
    });

    addLog('PERT视图已渲染');
}

// 计算PERT节点布局
function calculatePertLayout(tasks) {
    const nodes = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    // 计算每个任务的层级
    const levels = new Map();
    const visited = new Set();
    
    function getLevel(taskId) {
        if (levels.has(taskId)) return levels.get(taskId);
        if (visited.has(taskId)) return 0; // 避免循环依赖
        
        visited.add(taskId);
        const task = taskMap.get(taskId);
        if (!task || !task.dependencies || task.dependencies.length === 0) {
            levels.set(taskId, 0);
            return 0;
        }
        
        const maxDepLevel = Math.max(...task.dependencies.map(depId => getLevel(depId)));
        const level = maxDepLevel + 1;
        levels.set(taskId, level);
        return level;
    }
    
    tasks.forEach(task => getLevel(task.id));
    
    // 按层级分组
    const levelGroups = new Map();
    tasks.forEach(task => {
        const level = levels.get(task.id) || 0;
        if (!levelGroups.has(level)) levelGroups.set(level, []);
        levelGroups.get(level).push(task);
    });
    
    // 计算位置
    const svgWidth = document.getElementById('pertContainer').clientWidth;
    const svgHeight = 600;
    const nodeWidth = 120;
    const nodeHeight = 80;
    const maxLevel = Math.max(...levels.values(), 0);
    const levelWidth = svgWidth / (maxLevel + 2);
    
    levelGroups.forEach((tasksInLevel, level) => {
        const levelHeight = svgHeight / (tasksInLevel.length + 1);
        tasksInLevel.forEach((task, index) => {
            const duration = daysBetween(task.start, task.end) + 1;
            nodes.push({
                id: task.id,
                name: task.name,
                duration: duration,
                progress: task.progress,
                x: levelWidth * (level + 1),
                y: levelHeight * (index + 1),
                width: nodeWidth,
                height: nodeHeight
            });
        });
    });
    
    return nodes;
}

// 绘制PERT节点
function drawPertNode(svg, node) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // 节点矩形
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', node.x - node.width / 2);
    rect.setAttribute('y', node.y - node.height / 2);
    rect.setAttribute('width', node.width);
    rect.setAttribute('height', node.height);
    rect.setAttribute('fill', '#ffffff');
    rect.setAttribute('stroke', '#0d6efd');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '5');
    g.appendChild(rect);
    
    // 任务名称
    const text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text1.setAttribute('x', node.x);
    text1.setAttribute('y', node.y - 15);
    text1.setAttribute('text-anchor', 'middle');
    text1.setAttribute('font-size', '12');
    text1.setAttribute('font-weight', 'bold');
    text1.setAttribute('fill', '#212529');
    text1.textContent = node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name;
    g.appendChild(text1);
    
    // 工期
    const text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text2.setAttribute('x', node.x);
    text2.setAttribute('y', node.y + 5);
    text2.setAttribute('text-anchor', 'middle');
    text2.setAttribute('font-size', '11');
    text2.setAttribute('fill', '#6c757d');
    text2.textContent = `工期: ${node.duration}天`;
    g.appendChild(text2);
    
    // 进度
    const text3 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text3.setAttribute('x', node.x);
    text3.setAttribute('y', node.y + 20);
    text3.setAttribute('text-anchor', 'middle');
    text3.setAttribute('font-size', '11');
    text3.setAttribute('fill', '#198754');
    text3.textContent = `完成: ${node.progress}%`;
    g.appendChild(text3);
    
    svg.appendChild(g);
}

// 绘制箭头
function drawArrow(svg, x1, y1, x2, y2) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#6c757d');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(line);
    
    // 确保箭头标记存在
    if (!svg.querySelector('#arrowhead')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3, 0 6');
        polygon.setAttribute('fill', '#6c757d');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
    }
}

// ==================== 设置面板交互 ====================
const settingsPanel = document.getElementById('settingsPanel');
const settingsTrigger = document.getElementById('settingsTrigger');
const settingsClose = document.getElementById('settingsClose');

// 打开设置面板
settingsTrigger.onclick = () => {
    settingsPanel.classList.add('active');
    addLog('已打开设置面板');
};

// 关闭设置面板
settingsClose.onclick = () => {
    settingsPanel.classList.remove('active');
    addLog('已关闭设置面板');
};

// 点击面板外部关闭
document.addEventListener('click', (e) => {
    if (settingsPanel.classList.contains('active') && 
        !settingsPanel.contains(e.target) && 
        !settingsTrigger.contains(e.target)) {
        settingsPanel.classList.remove('active');
    }
});

// ==================== 日志面板折叠 ====================
const logPanel = document.getElementById('logPanel');
const logHeader = document.getElementById('logHeader');
const logToggle = document.getElementById('logToggle');

logHeader.onclick = () => {
    logPanel.classList.toggle('collapsed');
    const isCollapsed = logPanel.classList.contains('collapsed');
    logToggle.textContent = isCollapsed ? '+' : '−';
    addLog(isCollapsed ? '日志面板已折叠' : '日志面板已展开');
};

// ==================== 更新切换按钮文本 ====================
const originalToggleClick = toggleButton.onclick;
toggleButton.onclick = () => {
    originalToggleClick();
    const btnText = toggleButton.querySelector('.btn-text');
    if (btnText) {
        btnText.textContent = isPertView ? '甘特视图' : 'PERT视图';
    }
};

// ==================== 初始化日志 ====================
addLog('甘特图已就绪！悬停任务条可选中，点击可拖拽');
addLog('提示：编辑任务时，点击甘特图任务条可快速设置依赖');
addLog('新功能：检测时间冲突 → 自动修复');