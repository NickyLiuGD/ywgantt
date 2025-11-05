// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用主文件 - 初始化甘特图、绑定事件、PERT视图                   ▓▓
// ▓▓ 路径: js/app.js                                                 ▓▓
// ▓▓ 版本: Gamma8 - 界面优化版                                       ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ## ==================== 初始化任务数据 ====================
    
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

    // ## ==================== 创建甘特图实例 ====================
    
    const gantt = new GanttChart('#gantt', initialTasks, {
        showTaskNames: true // ⭐ 默认显示任务名称栏
    });
    global.gantt = gantt;

    // ❌ 删除：独立的任务表单函数
    // global.showTaskForm = function(task) { ... }
    // 现在使用 gantt-events.js 中的内联表单

    // ## ==================== 工具函数 ====================
    
    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ## ==================== 窗口大小监听 ====================
    
    /**
     * 监听窗口大小变化，动态调整甘特图高度
     */
    const handleResize = debounce(() => {
        if (gantt && typeof gantt.updateHeight === 'function') {
            gantt.updateHeight();
        }
    }, 150);

    window.addEventListener('resize', handleResize, { passive: true });

    // ## ==================== 控制按钮事件 ====================
    
    // ▒▒ 添加任务
    const addTaskBtn = document.getElementById('addTask');
    if (addTaskBtn) {
        addTaskBtn.onclick = () => {
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
            addLog('已添加新任务');
        };
    }

    // ▒▒ 删除任务
    const deleteTaskBtn = document.getElementById('deleteTask');
    if (deleteTaskBtn) {
        deleteTaskBtn.onclick = () => {
            const task = gantt.getSelectedTask();
            if (task && confirm(`确定删除任务 "${task.name}"?`)) {
                gantt.deleteTask(task.id);
                addLog(`已删除任务 "${task.name}"`);
            } else if (!task) {
                alert('请先选择一个任务');
            }
        };
    }

    // ▒▒ 导出文件
    const saveDataBtn = document.getElementById('saveData');
    if (saveDataBtn) {
        saveDataBtn.onclick = () => {
            const filename = `gantt-${formatDate(new Date()).replace(/-/g, '')}.json`;
            downloadJSON(gantt.tasks, filename);
            addLog(`已导出文件：${filename}`);
        };
    }

    // ▒▒ 加载文件
    const loadDataBtn = document.getElementById('loadData');
    if (loadDataBtn) {
        loadDataBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const tasks = JSON.parse(ev.target.result);
                        if (!Array.isArray(tasks)) {
                            alert('文件格式错误：期望JSON数组');
                            return;
                        }
                        tasks.forEach(t => {
                            t.id = t.id || generateId();
                            if (!t.dependencies) t.dependencies = [];
                        });
                        gantt.tasks = tasks;
                        gantt.calculateDateRange();
                        gantt.render();
                        addLog(`已从 ${file.name} 加载 ${tasks.length} 个任务`);
                    } catch (err) {
                        console.error('Load error:', err);
                        alert('加载失败：' + err.message);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        };
    }

    // ▒▒ 冲突检测
    const checkConflictsBtn = document.getElementById('checkConflicts');
    if (checkConflictsBtn) {
        checkConflictsBtn.onclick = () => gantt.checkConflicts();
    }

    // ▒▒ 自动修复
    const autoFixBtn = document.getElementById('autoFixConflicts');
    if (autoFixBtn) {
        autoFixBtn.onclick = () => gantt.autoFixConflicts();
    }

    // ▒▒ 清除高亮
    const clearHighlightsBtn = document.getElementById('clearHighlights');
    if (clearHighlightsBtn) {
        clearHighlightsBtn.onclick = () => gantt.clearConflictHighlights();
    }

    // ## ==================== 视图切换 ====================
    
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
                addLog('已切换到 PERT 视图');
            } else {
                ganttContainer.style.display = 'block';
                pertContainer.style.display = 'none';
                gantt.updateHeight(); // ⭐ 切换回来时更新高度
                addLog('已切换到 甘特图 视图');
            }
            
            const btnText = toggleButton.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isPertView ? '甘特视图' : 'PERT视图';
            }
        };
    }

    // ## ==================== PERT 图表渲染（保持不变）====================
    
    function renderPertChart(tasks) {
        if (!pertContainer) return;
        
        pertContainer.innerHTML = '<svg id="pertSvg" width="100%" height="600"></svg>';
        const svg = document.getElementById('pertSvg');
        if (!svg) return;

        const levels = new Map();
        const visited = new Set();
        const stack = [...tasks];

        while (stack.length) {
            const task = stack.pop();
            if (visited.has(task.id)) continue;
            visited.add(task.id);
            
            let maxLevel = 0;
            if (task.dependencies && task.dependencies.length > 0) {
                task.dependencies.forEach(depId => {
                    const depTask = tasks.find(t => t.id === depId);
                    if (depTask && levels.has(depId)) {
                        maxLevel = Math.max(maxLevel, levels.get(depId) + 1);
                    }
                });
            }
            levels.set(task.id, maxLevel);
            stack.push(...tasks.filter(t => t.dependencies?.includes(task.id)));
        }

        const levelGroups = new Map();
        tasks.forEach(task => {
            const level = levels.get(task.id) || 0;
            if (!levelGroups.has(level)) {
                levelGroups.set(level, []);
            }
            levelGroups.get(level).push(task);
        });
        
        const svgWidth = pertContainer.clientWidth;
        const svgHeight = 600;
        const nodeWidth = 120;
        const nodeHeight = 80;
        const maxLevel = Math.max(...levels.values(), 0);
        const levelWidth = svgWidth / (maxLevel + 2);
        
        const nodes = [];
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
        
        nodes.forEach(node => drawPertNode(svg, node));
        
        tasks.forEach(task => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            const fromNode = nodes.find(n => n.id === task.id);
            if (!fromNode) return;
            
            task.dependencies.forEach(depId => {
                const toNode = nodes.find(n => n.id === depId);
                if (toNode) {
                    drawArrow(svg, toNode.x + toNode.width / 2, toNode.y, 
                                  fromNode.x - fromNode.width / 2, fromNode.y);
                }
            });
        });
    }

    function drawPertNode(svg, node) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
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

        const text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text1.setAttribute('x', node.x);
        text1.setAttribute('y', node.y - 15);
        text1.setAttribute('text-anchor', 'middle');
        text1.setAttribute('font-size', '12');
        text1.setAttribute('font-weight', 'bold');
        text1.setAttribute('fill', '#212529');
        text1.textContent = node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name;
        g.appendChild(text1);

        const text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text2.setAttribute('x', node.x);
        text2.setAttribute('y', node.y + 5);
        text2.setAttribute('text-anchor', 'middle');
        text2.setAttribute('font-size', '11');
        text2.setAttribute('fill', '#6c757d');
        text2.textContent = `工期: ${node.duration}天`;
        g.appendChild(text2);

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

    // ## ==================== 设置面板交互 ====================
    
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsTrigger = document.getElementById('settingsTrigger');
    const settingsClose = document.getElementById('settingsClose');
    const showLogPanelSwitch = document.getElementById('showLogPanel');
    const logPanel = document.getElementById('logPanel');

    if (settingsTrigger && settingsPanel) {
        settingsTrigger.onclick = () => {
            settingsPanel.classList.add('active');
            addLog('已打开设置面板');
        };
    }

    if (settingsClose && settingsPanel) {
        settingsClose.onclick = () => {
            settingsPanel.classList.remove('active');
            addLog('已关闭设置面板');
        };
    }

    document.addEventListener('click', (e) => {
        if (settingsPanel && settingsPanel.classList.contains('active') &&
            !settingsPanel.contains(e.target) && 
            !settingsTrigger.contains(e.target)) {
            settingsPanel.classList.remove('active');
        }
    });

    // ▒▒ 日志面板开关
    if (showLogPanelSwitch && logPanel) {
        showLogPanelSwitch.checked = false;
        logPanel.classList.add('hidden');

        showLogPanelSwitch.onchange = () => {
            if (showLogPanelSwitch.checked) {
                logPanel.classList.remove('hidden');
                addLog('日志面板已启用');
            } else {
                logPanel.classList.add('hidden');
                addLog('日志面板已隐藏');
            }
            // ⭐ 日志面板显示状态改变时，更新甘特图高度
            setTimeout(() => gantt.updateHeight(), 350);
        };
    }

    // ▒▒ 其他设置项
    const enableEditSwitch = document.getElementById('enableEdit');
    if (enableEditSwitch) {
        enableEditSwitch.onchange = (e) => {
            gantt.options.enableEdit = e.target.checked;
            gantt.render();
            addLog(e.target.checked ? '启用拖拽移动' : '禁用拖拽移动');
        };
    }

    const enableResizeSwitch = document.getElementById('enableResize');
    if (enableResizeSwitch) {
        enableResizeSwitch.onchange = (e) => {
            gantt.options.enableResize = e.target.checked;
            gantt.render();
            addLog(e.target.checked ? '启用调整时长' : '禁用调整时长');
        };
    }

    const showWeekendsSwitch = document.getElementById('showWeekends');
    if (showWeekendsSwitch) {
        showWeekendsSwitch.onchange = (e) => {
            gantt.options.showWeekends = e.target.checked;
            gantt.render();
            addLog(e.target.checked ? '显示周末' : '隐藏周末');
        };
    }

    const showDependenciesSwitch = document.getElementById('showDependencies');
    if (showDependenciesSwitch) {
        showDependenciesSwitch.onchange = (e) => {
            gantt.options.showDependencies = e.target.checked;
            gantt.render();
            addLog(e.target.checked ? '显示依赖箭头' : '隐藏依赖箭头');
        };
    }

    // ⭐ 新增：任务名称栏开关
    const showTaskNamesSwitch = document.getElementById('showTaskNames');
    if (showTaskNamesSwitch) {
        showTaskNamesSwitch.checked = true; // 默认显示
        
        showTaskNamesSwitch.onchange = (e) => {
            gantt.toggleSidebar(e.target.checked);
            gantt.render(); // 重新渲染以更新折叠状态
        };
    }

    const cellWidthSlider = document.getElementById('cellWidth');
    const cellWidthValue = document.getElementById('cellWidthValue');
    if (cellWidthSlider && cellWidthValue) {
        cellWidthSlider.oninput = (e) => {
            const value = parseInt(e.target.value);
            gantt.options.cellWidth = value;
            cellWidthValue.textContent = `${value}px`;
            gantt.render();
        };
    }

    // ▒▒ 日志面板折叠
    const logHeader = document.getElementById('logHeader');
    const logToggle = document.getElementById('logToggle');
    if (logHeader && logToggle && logPanel) {
        logHeader.onclick = () => {
            logPanel.classList.toggle('collapsed');
            const isCollapsed = logPanel.classList.contains('collapsed');
            logToggle.textContent = isCollapsed ? '+' : '−';
            addLog(isCollapsed ? '日志面板已折叠' : '日志面板已展开');
            
            // ⭐ 折叠状态改变时，更新甘特图高度
            setTimeout(() => gantt.updateHeight(), 350);
        };
    }

    // ## ==================== 工具栏悬停展开 ====================
    
    const toolbarCollapsed = document.getElementById('toolbarCollapsed');
    const toolbarExpanded = document.getElementById('floatingToolbarExpanded');
    let toolbarHoverTimer = null;
    let toolbarLeaveTimer = null;

    if (toolbarCollapsed && toolbarExpanded) {
        toolbarCollapsed.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
            toolbarHoverTimer = setTimeout(() => {
                toolbarExpanded.classList.add('active');
                addLog('工具栏已展开');
            }, 150);
        });

        toolbarCollapsed.addEventListener('mouseleave', () => {
            clearTimeout(toolbarHoverTimer);
            toolbarLeaveTimer = setTimeout(() => {
                if (!toolbarExpanded.matches(':hover')) {
                    toolbarExpanded.classList.remove('active');
                    addLog('工具栏已收起');
                }
            }, 200);
        });

        toolbarExpanded.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
        });

        toolbarExpanded.addEventListener('mouseleave', () => {
            toolbarLeaveTimer = setTimeout(() => {
                toolbarExpanded.classList.remove('active');
                addLog('工具栏已收起');
            }, 300);
        });
    }

    // ## ==================== 初始化日志 ====================
    
    addLog('✅ 甘特图已就绪！');
    addLog('💡 提示：点击任务名称或任务条可编辑');
    addLog('🔍 新功能：自动居中选中任务');
    
    console.log('✅ app.js loaded successfully');
    console.log('📊 甘特图版本: Gamma8 - 界面优化版');

})(typeof window !== 'undefined' ? window : this);
