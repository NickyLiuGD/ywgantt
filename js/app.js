// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用主文件 - 初始化甘特图、绑定事件、PERT视图                   ▓▓
// ▓▓ 路径: js/app.js                                                 ▓▓
// ▓▓ 版本: Gamma8 - 性能优化版                                       ▓▓
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
    
    const gantt = new GanttChart('#gantt', initialTasks);
    global.gantt = gantt; // ⭐ 暴露到全局供调试使用

    // ## ==================== 任务表单函数（工期版本）====================
    
    /**
     * 显示任务编辑表单（优化版：使用DocumentFragment）
     * @param {Object} task - 任务对象
     */
    global.showTaskForm = function(task) {
        if (!task) return;
        
        const container = document.getElementById('taskFormContainer');
        if (!container) return;
        
        const availableTasks = gantt.tasks.filter(t => t.id !== task.id);
        const currentDuration = daysBetween(task.start, task.end) + 1; // ▌ 计算当前工期

        // ⚡ 使用模板字符串构建HTML（保持原有结构）
        container.innerHTML = `
            <div class="task-form">
                <h6 class="mb-3">编辑任务</h6>
                <div class="mb-2">
                    <label class="form-label">任务名称</label>
                    <input type="text" class="form-control form-control-sm" id="editName" value="${escapeHtml(task.name)}">
                </div>
                <div class="row">
                    <div class="col-6 mb-2">
                        <label class="form-label">开始日期</label>
                        <input type="date" class="form-control form-control-sm" id="editStart" value="${task.start}">
                    </div>
                    <div class="col-6 mb-2">
                        <label class="form-label">工期（天）</label>
                        <input type="number" class="form-control form-control-sm" id="editDuration" 
                               value="${currentDuration}" min="1" max="365" step="1">
                    </div>
                </div>
                <div class="mb-2">
                    <small class="text-muted">结束日期：<span id="calculatedEndDate" style="color:#10b981;font-weight:600;">${task.end}</span></small>
                </div>
                <div class="mb-3">
                    <label class="form-label">完成进度: <strong id="progressVal">${task.progress}%</strong></label>
                    <input type="range" class="form-range" id="editProgress" value="${task.progress}" min="0" max="100" step="5">
                </div>
                <div class="mb-3">
                    <label class="form-label">依赖任务（点击甘特图任务条选择）</label>
                    <div id="depList" class="dep-list border rounded p-2" style="max-height:120px;overflow-y:auto;">
                        ${availableTasks.length > 0 ? availableTasks.map(t => `
                            <div class="dep-item form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" value="${t.id}" id="dep_${t.id}"
                                    ${task.dependencies?.includes(t.id) ? 'checked' : ''}>
                                <label class="form-check-label small" for="dep_${t.id}">${escapeHtml(t.name)}</label>
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

        // ▒▒ 进度条同步
        const progressInput = document.getElementById('editProgress');
        const progressVal = document.getElementById('progressVal');
        if (progressInput && progressVal) {
            progressInput.oninput = () => progressVal.textContent = progressInput.value + '%';
        }

        // ▒▒ 开始日期或工期改变时，自动计算结束日期
        const startInput = document.getElementById('editStart');
        const durationInput = document.getElementById('editDuration');
        const endDateDisplay = document.getElementById('calculatedEndDate');
        
        const updateEndDate = () => {
            const start = startInput.value;
            const duration = parseInt(durationInput.value) || 1;
            
            if (start && duration > 0) {
                const startDate = new Date(start);
                const endDate = addDays(startDate, duration - 1);
                endDateDisplay.textContent = formatDate(endDate);
            }
        };
        
        if (startInput && durationInput) {
            startInput.addEventListener('change', updateEndDate);
            durationInput.addEventListener('input', updateEndDate);
        }

        // ▒▒ 保存按钮
        const saveBtn = document.getElementById('saveTask');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const newName = document.getElementById('editName').value.trim();
                if (!newName) { 
                    alert('任务名称不能为空'); 
                    return; 
                }
                
                const start = startInput.value;
                const duration = parseInt(durationInput.value);
                
                // ⚠️ 严格验证
                if (!start) {
                    alert('请选择开始日期');
                    return;
                }
                if (!duration || duration < 1) {
                    alert('工期必须大于0天');
                    return;
                }
                if (duration > 365) {
                    alert('工期不能超过365天');
                    return;
                }
                
                // ⭐ 计算结束日期
                const startDate = new Date(start);
                const endDate = addDays(startDate, duration - 1);
                
                task.name = newName;
                task.start = start;
                task.end = formatDate(endDate);
                task.progress = parseInt(progressInput.value);
                task.dependencies = Array.from(document.querySelectorAll('#depList input[type="checkbox"]:checked')).map(cb => cb.value);
                
                gantt.calculateDateRange();
                gantt.render();
                addLog(`任务 "${task.name}" 已更新，工期 ${duration} 天 (${start} ~ ${task.end})`);
                container.innerHTML = '';
            };
        }

        // ▒▒ 取消按钮
        const cancelBtn = document.getElementById('cancelEdit');
        if (cancelBtn) {
            cancelBtn.onclick = () => container.innerHTML = '';
        }
    };

    /**
     * HTML转义工具函数（防止XSS）
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const map = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

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
                document.getElementById('taskFormContainer').innerHTML = '';
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
                        // ⭐ 确保每个任务都有ID
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
                renderPertChart(gantt.tasks); // → 渲染PERT图
                addLog('已切换到 PERT 视图');
            } else {
                ganttContainer.style.display = 'block';
                pertContainer.style.display = 'none';
                addLog('已切换到 甘特图 视图');
            }
            
            const btnText = toggleButton.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isPertView ? '甘特视图' : 'PERT视图';
            }
        };
    }

    // ## ==================== PERT 图表渲染函数（完整保留）====================
    
    /**
     * 渲染PERT网络图（优化版：缓存节点计算）
     * @param {Array} tasks - 任务数组
     */
    function renderPertChart(tasks) {
        if (!pertContainer) return;
        
        pertContainer.innerHTML = '<svg id="pertSvg" width="100%" height="600"></svg>';
        const svg = document.getElementById('pertSvg');
        if (!svg) return;

        // ⭐ 计算任务层级（广度优先遍历）
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
            
            // → 将依赖当前任务的任务加入队列
            stack.push(...tasks.filter(t => t.dependencies?.includes(task.id)));
        }

        // ⭐ 按层级分组
        const levelGroups = new Map();
        tasks.forEach(task => {
            const level = levels.get(task.id) || 0;
            if (!levelGroups.has(level)) {
                levelGroups.set(level, []);
            }
            levelGroups.get(level).push(task);
        });
        
        // ▌ 计算节点位置
        const svgWidth = pertContainer.clientWidth;
        const svgHeight = 600;
        const nodeWidth = 120;
        const nodeHeight = 80;
        const maxLevel = Math.max(...levels.values(), 0);
        const levelWidth = svgWidth / (maxLevel + 2);
        
        const nodes = []; // ◦ 节点位置缓存
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
        
        // → 绘制节点
        nodes.forEach(node => drawPertNode(svg, node));
        
        // → 绘制依赖箭头
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

    /**
     * 绘制PERT节点
     * @param {SVGElement} svg - SVG容器
     * @param {Object} node - 节点数据
     */
    function drawPertNode(svg, node) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // ▌ 矩形背景
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

        // ▌ 任务名称
        const text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text1.setAttribute('x', node.x);
        text1.setAttribute('y', node.y - 15);
        text1.setAttribute('text-anchor', 'middle');
        text1.setAttribute('font-size', '12');
        text1.setAttribute('font-weight', 'bold');
        text1.setAttribute('fill', '#212529');
        text1.textContent = node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name;
        g.appendChild(text1);

        // ▌ 工期信息
        const text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text2.setAttribute('x', node.x);
        text2.setAttribute('y', node.y + 5);
        text2.setAttribute('text-anchor', 'middle');
        text2.setAttribute('font-size', '11');
        text2.setAttribute('fill', '#6c757d');
        text2.textContent = `工期: ${node.duration}天`;
        g.appendChild(text2);

        // ▌ 完成进度
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

    /**
     * 绘制依赖箭头
     * @param {SVGElement} svg - SVG容器
     * @param {number} x1 - 起点X
     * @param {number} y1 - 起点Y
     * @param {number} x2 - 终点X
     * @param {number} y2 - 终点Y
     */
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

        // ▌ 添加箭头标记（仅一次）
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

    // ▒▒ 打开设置面板
    if (settingsTrigger && settingsPanel) {
        settingsTrigger.onclick = () => {
            settingsPanel.classList.add('active');
            addLog('已打开设置面板');
        };
    }

    // ▒▒ 关闭设置面板
    if (settingsClose && settingsPanel) {
        settingsClose.onclick = () => {
            settingsPanel.classList.remove('active');
            addLog('已关闭设置面板');
        };
    }

    // ▒▒ 点击外部关闭设置面板
    document.addEventListener('click', (e) => {
        if (settingsPanel && settingsPanel.classList.contains('active') &&
            !settingsPanel.contains(e.target) && 
            !settingsTrigger.contains(e.target)) {
            settingsPanel.classList.remove('active');
        }
    });

    // ▒▒ 日志面板开关（默认隐藏）
    if (showLogPanelSwitch && logPanel) {
        showLogPanelSwitch.checked = false; // → 默认不勾选
        logPanel.classList.add('hidden'); // → 默认隐藏

        showLogPanelSwitch.onchange = () => {
            if (showLogPanelSwitch.checked) {
                logPanel.classList.remove('hidden');
                addLog('日志面板已启用');
            } else {
                logPanel.classList.add('hidden');
                addLog('日志面板已隐藏');
            }
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
        };
    }

    // ## ==================== 工具栏悬停展开（优化的滑出动画）====================
    
    const toolbarCollapsed = document.getElementById('toolbarCollapsed');
    const toolbarExpanded = document.getElementById('floatingToolbarExpanded');
    let toolbarHoverTimer = null;
    let toolbarLeaveTimer = null;

    if (toolbarCollapsed && toolbarExpanded) {
        // ▌ 鼠标进入折叠按钮
        toolbarCollapsed.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
            toolbarHoverTimer = setTimeout(() => {
                toolbarExpanded.classList.add('active');
                addLog('工具栏已展开');
            }, 150); // ⚡ 150ms延迟，避免误触
        });

        // ▌ 鼠标离开折叠按钮
        toolbarCollapsed.addEventListener('mouseleave', () => {
            clearTimeout(toolbarHoverTimer);
            toolbarLeaveTimer = setTimeout(() => {
                if (!toolbarExpanded.matches(':hover')) {
                    toolbarExpanded.classList.remove('active');
                    addLog('工具栏已收起');
                }
            }, 200);
        });

        // ▌ 鼠标进入展开的工具栏
        toolbarExpanded.addEventListener('mouseenter', () => {
            clearTimeout(toolbarLeaveTimer);
        });

        // ▌ 鼠标离开展开的工具栏
        toolbarExpanded.addEventListener('mouseleave', () => {
            toolbarLeaveTimer = setTimeout(() => {
                toolbarExpanded.classList.remove('active');
                addLog('工具栏已收起');
            }, 300);
        });
    }

    // ## ==================== 初始化日志 ====================
    
    addLog('✅ 甘特图已就绪！悬停任务条可选中，点击可拖拽');
    addLog('💡 提示：编辑任务时，点击甘特图任务条可快速设置依赖');
    addLog('🔍 新功能：检测时间冲突 → 自动修复');
    
    // ✅ 模块加载完成标记
    console.log('✅ app.js loaded successfully');
    console.log('📊 甘特图版本: Gamma8 - 性能优化版');

})(typeof window !== 'undefined' ? window : this);
