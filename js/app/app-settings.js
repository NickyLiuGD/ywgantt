// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用设置与视图切换模块                                          ▓▓
// ▓▓ 路径: js/app/app-settings.js                                   ▓▓
// ▓▓ 版本: Delta8 - 增强版（保留原有逻辑 + 新增功能）               ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 视图切换 ====================
    let isPertView = false;
    let pertChart = null; // ⭐ 用于存储 PERT 实例（如果使用模块化版本）
    
    const toggleButton = document.getElementById('toggleView');
    const ganttContainer = document.getElementById('ganttContainer');
    const pertContainer = document.getElementById('pertContainer');

    if (toggleButton && ganttContainer && pertContainer) {
        toggleButton.onclick = () => {
            isPertView = !isPertView;
            
            if (isPertView) {
                // 切换到 PERT 视图
                ganttContainer.style.display = 'none';
                pertContainer.style.display = 'block';
                
                // ⭐ 优先使用模块化 PertChart，降级使用原有渲染函数
                if (typeof PertChart !== 'undefined') {
                    console.log('🎨 使用模块化 PertChart');
                    
                    // 销毁旧实例
                    if (pertChart) {
                        pertChart.destroy();
                    }
                    
                    try {
                        pertChart = new PertChart('#pertContainer', gantt.tasks, {
                            enableDrag: true,
                            enableZoom: true,
                            showCriticalPath: true
                        });
                        
                        global.pertChart = pertChart;
                        
                        addLog('✅ 已切换到 PERT 视图（模块化版本）');
                        
                        // 自动全貌视图
                        setTimeout(() => {
                            if (pertChart && typeof pertChart.switchToOverviewMode === 'function') {
                                pertChart.switchToOverviewMode();
                            }
                        }, 300);
                        
                    } catch (error) {
                        console.error('❌ PertChart 创建失败，降级使用原有渲染:', error);
                        renderPertChart(gantt.tasks);
                        addLog('✅ 已切换到 PERT 视图（简化版本）');
                    }
                } else {
                    console.log('🎨 使用原有 renderPertChart');
                    renderPertChart(gantt.tasks);
                    addLog('✅ 已切换到 PERT 视图');
                }
                
            } else {
                // 切换回甘特图视图
                ganttContainer.style.display = 'block';
                pertContainer.style.display = 'none';
                
                // 销毁 PERT 实例
                if (pertChart) {
                    pertChart.destroy();
                    pertChart = null;
                    global.pertChart = null;
                }
                
                gantt.updateHeight();
                addLog('✅ 已切换到甘特图视图');
            }
            
            const btnText = toggleButton.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isPertView ? '甘特视图' : 'PERT视图';
            }
        };
    }

    // ==================== PERT 图表渲染函数（原有逻辑 + 增强） ====================
    
    /**
     * 渲染 PERT 图表（增强版：支持全貌视图）
     * @param {Array} tasks - 任务数组
     */
    function renderPertChart(tasks) {
        if (!pertContainer) {
            console.error('❌ pertContainer 不存在');
            return;
        }
        
        if (!tasks || tasks.length === 0) {
            pertContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
                    <div style="text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                        <div>暂无任务数据</div>
                        <div style="font-size: 0.8rem; margin-top: 0.5rem;">请先在甘特图中添加任务</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // ⭐ 创建工具栏和SVG容器
        pertContainer.innerHTML = `
            <div class="pert-wrapper" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
                <div class="pert-toolbar" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.95); border-bottom: 1px solid #dee2e6; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <button class="pert-btn" id="pertOverview" title="项目全貌" style="padding: 8px 14px; background: linear-gradient(135deg, rgba(16,185,129,0.05), rgba(6,182,212,0.05)); border: 1px dashed rgba(16,185,129,0.4); border-radius: 8px; cursor: pointer;">
                        <span style="font-size: 1rem;">🔭</span> 全貌视图
                    </button>
                    <span style="margin-left: auto; font-size: 0.8rem; color: #6c757d;">
                        任务总数: <strong style="color: #667eea;">${tasks.length}</strong>
                    </span>
                </div>
                <div class="pert-canvas" id="pertCanvas" style="flex: 1; overflow: auto; background: white; position: relative;">
                    <svg id="pertSvg" width="100%" height="600"></svg>
                </div>
            </div>
        `;
        
        const svg = document.getElementById('pertSvg');
        if (!svg) {
            console.error('❌ SVG 元素创建失败');
            return;
        }

        // ⭐ PERT 图配置
        const nodeWidth = 140;
        const nodeHeight = 90;
        const horizontalGap = 180;
        const verticalGap = 120;
        const padding = 50;
        
        // 计算节点层级（拓扑排序）
        const levels = calculateTaskLevels(tasks);
        const positions = {};
        
        console.log('📊 PERT 层级:', levels.map(l => l.length));
        
        // 计算节点位置
        levels.forEach((levelTasks, level) => {
            levelTasks.forEach((task, index) => {
                positions[task.id] = {
                    x: padding + level * (nodeWidth + horizontalGap),
                    y: padding + index * (nodeHeight + verticalGap)
                };
            });
        });
        
        // ⭐ 计算实际画布尺寸
        const canvasWidth = padding * 2 + levels.length * (nodeWidth + horizontalGap) - horizontalGap;
        const canvasHeight = padding * 2 + Math.max(...levels.map(l => l.length)) * (nodeHeight + verticalGap) - verticalGap;
        
        svg.setAttribute('width', canvasWidth);
        svg.setAttribute('height', canvasHeight);
        
        // 添加箭头标记
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="pert-arrowhead" markerWidth="10" markerHeight="10" 
                    refX="8" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#dc3545" />
            </marker>
            <linearGradient id="pert-nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.1" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.05" />
            </linearGradient>
        `;
        svg.appendChild(defs);
        
        // ⭐ 绘制连接线（统一样式：水平-斜线-水平）
        tasks.forEach(task => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            task.dependencies.forEach(depId => {
                const from = positions[depId];
                const to = positions[task.id];
                if (!from || !to) return;
                
                const x1 = from.x + nodeWidth;
                const y1 = from.y + nodeHeight / 2;
                const x2 = to.x;
                const y2 = to.y + nodeHeight / 2;
                
                // ⭐ 统一样式：水平-斜线-水平
                const gap = 10;
                const hLength = 40;
                let pathData = '';
                
                if (Math.abs(y2 - y1) < 5) {
                    // 同一水平线
                    pathData = `M ${x1} ${y1} L ${x2 - gap} ${y2}`;
                } else {
                    // 不同水平线
                    pathData = `M ${x1} ${y1} L ${x1 + hLength} ${y1} L ${x2 - hLength} ${y2} L ${x2 - gap} ${y2}`;
                }
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.setAttribute('stroke', '#dc3545');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('marker-end', 'url(#pert-arrowhead)');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.classList.add('pert-connection');
                svg.appendChild(path);
            });
        });
        
        // ⭐ 绘制节点
        tasks.forEach(task => {
            const pos = positions[task.id];
            if (!pos) return;
            
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
            g.classList.add('pert-node');
            g.dataset.taskId = task.id;
            
            // 节点矩形
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('fill', 'url(#pert-nodeGradient)');
            rect.setAttribute('stroke', '#667eea');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('rx', '12');
            g.appendChild(rect);
            
            // 任务名称
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', nodeWidth / 2);
            text.setAttribute('y', 28);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '14');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#333');
            text.textContent = task.name.length > 16 ? task.name.substring(0, 14) + '...' : task.name;
            g.appendChild(text);
            
            // 分隔线
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '10');
            line.setAttribute('y1', '40');
            line.setAttribute('x2', nodeWidth - 10);
            line.setAttribute('y2', '40');
            line.setAttribute('stroke', '#e0e0e0');
            line.setAttribute('stroke-width', '1');
            g.appendChild(line);
            
            // 工期信息
            const duration = daysBetween(task.start, task.end) + 1;
            const durationText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            durationText.setAttribute('x', nodeWidth / 2);
            durationText.setAttribute('y', 56);
            durationText.setAttribute('text-anchor', 'middle');
            durationText.setAttribute('font-size', '12');
            durationText.setAttribute('fill', '#666');
            durationText.textContent = `工期: ${duration}天`;
            g.appendChild(durationText);
            
            // 进度信息
            const progressText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            progressText.setAttribute('x', nodeWidth / 2);
            progressText.setAttribute('y', 72);
            progressText.setAttribute('text-anchor', 'middle');
            progressText.setAttribute('font-size', '12');
            progressText.setAttribute('fill', '#666');
            progressText.textContent = `进度: ${task.progress}%`;
            g.appendChild(progressText);
            
            // 日期范围
            const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dateText.setAttribute('x', nodeWidth / 2);
            dateText.setAttribute('y', nodeHeight + 18);
            dateText.setAttribute('text-anchor', 'middle');
            dateText.setAttribute('font-size', '10');
            dateText.setAttribute('fill', '#999');
            dateText.textContent = `${formatDate(new Date(task.start)).substring(5)} - ${formatDate(new Date(task.end)).substring(5)}`;
            g.appendChild(dateText);
            
            svg.appendChild(g);
        });
        
        addLog(`✅ PERT 图表已渲染（${tasks.length} 个任务，${levels.length} 层）`);
        
        // ⭐ 绑定全貌视图按钮
        const overviewBtn = document.getElementById('pertOverview');
        if (overviewBtn) {
            overviewBtn.onclick = () => {
                switchPertToOverview(svg, canvasWidth, canvasHeight);
            };
        }
    }

    /**
     * ⭐ 辅助函数：计算任务层级（拓扑排序）
     */
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

    /**
     * ⭐ 新增：PERT 图全貌视图
     */
    function switchPertToOverview(svg, contentWidth, contentHeight) {
        const canvas = document.getElementById('pertCanvas');
        if (!canvas) return;
        
        const containerWidth = canvas.clientWidth;
        const containerHeight = canvas.clientHeight;
        
        // 预留边距
        const marginH = 40;
        const marginV = 60;
        
        // 计算缩放比例
        const scaleX = (containerWidth - marginH * 2) / contentWidth;
        const scaleY = (containerHeight - marginV * 2) / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1.0); // 最大不超过 100%
        
        // 计算居中偏移
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;
        const offsetX = (containerWidth - scaledWidth) / 2;
        const offsetY = (containerHeight - scaledHeight) / 2;
        
        // 应用缩放和偏移
        svg.setAttribute('width', containerWidth);
        svg.setAttribute('height', containerHeight);
        
        const content = svg.querySelector('g') || svg;
        if (content.tagName === 'g') {
            content.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${scale})`);
        } else {
            // 如果没有 g 元素，创建一个
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${scale})`);
            while (svg.firstChild && svg.firstChild !== svg.querySelector('defs')) {
                g.appendChild(svg.firstChild);
            }
            svg.appendChild(g);
        }
        
        addLog(`╔═══════════════════════════════════════════════════════════╗`);
        addLog(`║  🔭 已切换到 PERT 全貌视图                                ║`);
        addLog(`╠═══════════════════════════════════════════════════════════╣`);
        addLog(`  📊 任务总数: ${tasks.length} 个`);
        addLog(`  📐 内容尺寸: ${contentWidth} × ${contentHeight} px`);
        addLog(`  🖥️ 容器尺寸: ${containerWidth} × ${containerHeight} px`);
        addLog(`  🔍 缩放比例: ${Math.round(scale * 100)}%`);
        addLog(`  📍 偏移位置: (${Math.round(offsetX)}, ${Math.round(offsetY)})`);
        addLog(`╚═══════════════════════════════════════════════════════════╝`);
    }

    // 导出全局变量
    global.isPertView = isPertView;
    global.pertChart = pertChart;

    // ==================== 设置面板交互 ====================
    
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

    // ==================== 日志面板开关 ====================
    
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

    // ==================== 其他设置项 ====================
    
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

    // ==================== 日志面板折叠 ====================
    
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

    console.log('✅ app-settings.js loaded successfully (Delta8 - 增强版)');

})(typeof window !== 'undefined' ? window : this);
