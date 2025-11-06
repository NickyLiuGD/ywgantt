// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用设置与视图切换模块                                          ▓▓
// ▓▓ 路径: js/app/app-settings.js                                   ▓▓
// ▓▓ 版本: Gamma8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    // 视图切换
    let isPertView = false;
    const toggleButton = document.getElementById('toggleView');
    const ganttContainer = document.getElementById('ganttContainer');
    const pertContainer = document.getElementById('pertContainer');

    if (toggleButton && ganttContainer && pertContainer) {
        toggleButton.onclick = () => {
            isPertView = !isPertView;
            
            if (isPertView) {
                ganttContainer.style.display = 'none';
                pertContainer.style.display = 'block';
                renderPertChart(gantt.tasks);
                addLog('✅ 已切换到 PERT 视图');
            } else {
                ganttContainer.style.display = 'block';
                pertContainer.style.display = 'none';
                gantt.updateHeight();
                addLog('✅ 已切换到 甘特图 视图');
            }
            
            const btnText = toggleButton.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isPertView ? '甘特视图' : 'PERT视图';
            }
        };
    }

function renderPertChart(tasks) {
    if (!pertContainer) return;
    
    pertContainer.innerHTML = '<svg id="pertSvg" width="100%" height="600"></svg>';
    const svg = document.getElementById('pertSvg');
    if (!svg) return;

    // ⭐ 完整的 PERT 渲染逻辑
    const nodeWidth = 120;
    const nodeHeight = 80;
    const horizontalGap = 150;
    const verticalGap = 120;
    
    // 计算节点层级（拓扑排序）
    const levels = calculateTaskLevels(tasks);
    const positions = {};
    
    // 计算节点位置
    levels.forEach((levelTasks, level) => {
        levelTasks.forEach((task, index) => {
            positions[task.id] = {
                x: 50 + level * (nodeWidth + horizontalGap),
                y: 50 + index * (nodeHeight + verticalGap)
            };
        });
    });
    
    // 绘制连接线
    tasks.forEach(task => {
        if (!task.dependencies || task.dependencies.length === 0) return;
        
        task.dependencies.forEach(depId => {
            const from = positions[depId];
            const to = positions[task.id];
            if (!from || !to) return;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', from.x + nodeWidth);
            line.setAttribute('y1', from.y + nodeHeight / 2);
            line.setAttribute('x2', to.x);
            line.setAttribute('y2', to.y + nodeHeight / 2);
            line.setAttribute('stroke', '#dc3545');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('marker-end', 'url(#arrowhead)');
            svg.appendChild(line);
        });
    });
    
    // 绘制节点
    tasks.forEach(task => {
        const pos = positions[task.id];
        if (!pos) return;
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        
        // 节点矩形
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', nodeWidth);
        rect.setAttribute('height', nodeHeight);
        rect.setAttribute('fill', '#fff');
        rect.setAttribute('stroke', '#667eea');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('rx', '8');
        g.appendChild(rect);
        
        // 任务名称
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', nodeWidth / 2);
        text.setAttribute('y', 30);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', '600');
        text.textContent = task.name;
        g.appendChild(text);
        
        // 工期信息
        const duration = daysBetween(task.start, task.end) + 1;
        const info = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        info.setAttribute('x', nodeWidth / 2);
        info.setAttribute('y', 50);
        info.setAttribute('text-anchor', 'middle');
        info.setAttribute('font-size', '12');
        info.setAttribute('fill', '#666');
        info.textContent = `${duration}天 | ${task.progress}%`;
        g.appendChild(info);
        
        svg.appendChild(g);
    });
    
    // 添加箭头标记
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <marker id="arrowhead" markerWidth="10" markerHeight="10" 
                refX="8" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#dc3545" />
        </marker>
    `;
    svg.insertBefore(defs, svg.firstChild);
    
    addLog('✅ PERT 图表已渲染');
}

// 辅助函数：计算任务层级
function calculateTaskLevels(tasks) {
    const levels = [];
    const visited = new Set();
    const taskMap = {};
    
    tasks.forEach(t => taskMap[t.id] = t);
    
    function getLevel(taskId, currentLevel = 0) {
        if (visited.has(taskId)) return;
        visited.add(taskId);
        
        const task = taskMap[taskId];
        if (!task) return;
        
        if (!levels[currentLevel]) levels[currentLevel] = [];
        levels[currentLevel].push(task);
        
        // 处理依赖此任务的其他任务
        tasks.forEach(t => {
            if (t.dependencies && t.dependencies.includes(taskId)) {
                getLevel(t.id, currentLevel + 1);
            }
        });
    }
    
    // 从无依赖的任务开始
    tasks.forEach(task => {
        if (!task.dependencies || task.dependencies.length === 0) {
            getLevel(task.id, 0);
        }
    });
    
    return levels;
}



    // 设置面板交互
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsTrigger = document.getElementById('settingsTrigger');
    const settingsClose = document.getElementById('settingsClose');
    const showLogPanelSwitch = document.getElementById('showLogPanel');
    const logPanel = document.getElementById('logPanel');

    if (settingsTrigger && settingsPanel) {
        settingsTrigger.onclick = () => {
            settingsPanel.classList.add('active');
            addLog('✅ 已打开设置面板');
        };
    }

    if (settingsClose && settingsPanel) {
        settingsClose.onclick = () => {
            settingsPanel.classList.remove('active');
            addLog('✅ 已关闭设置面板');
        };
    }

    document.addEventListener('click', (e) => {
        if (settingsPanel && settingsPanel.classList.contains('active') &&
            !settingsPanel.contains(e.target) && 
            !settingsTrigger.contains(e.target)) {
            settingsPanel.classList.remove('active');
        }
    });

    // 日志面板开关
    if (showLogPanelSwitch && logPanel) {
        showLogPanelSwitch.checked = false;
        logPanel.classList.add('hidden');

        showLogPanelSwitch.onchange = () => {
            if (showLogPanelSwitch.checked) {
                logPanel.classList.remove('hidden');
                addLog('✅ 日志面板已启用');
            } else {
                logPanel.classList.add('hidden');
                addLog('✅ 日志面板已隐藏');
            }
            setTimeout(() => {
                if (gantt && typeof gantt.updateHeight === 'function') {
                    gantt.updateHeight();
                }
            }, 350);
        };
    }

    // 其他设置项
    const enableEditSwitch = document.getElementById('enableEdit');
    if (enableEditSwitch) {
        enableEditSwitch.onchange = (e) => {
            gantt.options.enableEdit = e.target.checked;
            gantt.render();
            addLog(e.target.checked ? '✅ 启用拖拽移动' : '❌ 禁用拖拽移动');
        };
    }

    const enableResizeSwitch = document.getElementById('enableResize');
    if (enableResizeSwitch) {
        enableResizeSwitch.onchange = (e) => {
            gantt.options.enableResize = e.target.checked;
            gantt.render();
            addLog(e.target.checked ? '✅ 启用调整时长' : '❌ 禁用调整时长');
        };
    }

    const showWeekendsSwitch = document.getElementById('showWeekends');
    if (showWeekendsSwitch) {
        showWeekendsSwitch.onchange = (e) => {
            gantt.options.showWeekends = e.target.checked;
            gantt.render();
            addLog(e.target.checked ? '✅ 显示周末' : '❌ 隐藏周末');
        };
    }

    const showDependenciesSwitch = document.getElementById('showDependencies');
    if (showDependenciesSwitch) {
        showDependenciesSwitch.onchange = (e) => {
            gantt.options.showDependencies = e.target.checked;
            gantt.render();
            addLog(e.target.checked ? '✅ 显示依赖箭头' : '❌ 隐藏依赖箭头');
        };
    }

    const showTaskNamesSwitch = document.getElementById('showTaskNames');
    if (showTaskNamesSwitch) {
        showTaskNamesSwitch.checked = true;
        
        showTaskNamesSwitch.onchange = (e) => {
            gantt.toggleSidebar(e.target.checked);
            gantt.render();
        };
    }

    const cellWidthSlider = document.getElementById('cellWidth');
    const cellWidthValue = document.getElementById('cellWidthValue');
    if (cellWidthSlider && cellWidthValue) {
        cellWidthSlider.value = 50;
        cellWidthSlider.min = 40;
        cellWidthSlider.max = 80;
        cellWidthValue.textContent = '50px';
        
        cellWidthSlider.oninput = (e) => {
            const value = parseInt(e.target.value);
            gantt.options.cellWidth = value;
            cellWidthValue.textContent = `${value}px`;
            gantt.render();
        };
    }

    // 日志面板折叠
    const logHeader = document.getElementById('logHeader');
    const logToggle = document.getElementById('logToggle');
    if (logHeader && logToggle && logPanel) {
        logHeader.onclick = () => {
            logPanel.classList.toggle('collapsed');
            const isCollapsed = logPanel.classList.contains('collapsed');
            logToggle.textContent = isCollapsed ? '+' : '−';
            addLog(isCollapsed ? '✅ 日志面板已折叠' : '✅ 日志面板已展开');
            
            setTimeout(() => {
                if (gantt && typeof gantt.updateHeight === 'function') {
                    gantt.updateHeight();
                }
            }, 350);
        };
    }

    console.log('✅ app-settings.js loaded successfully');

})();
