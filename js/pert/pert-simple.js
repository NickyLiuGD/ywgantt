// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 图独立模块                                                 ▓▓
// ▓▓ 路径: js/pert/pert-simple.js                                   ▓▓
// ▓▓ 版本: Delta9 - 完整版（支持实时刷新）                          ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // PERT 全局状态
    const PertState = {
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        selectedNode: null,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        hoveredNode: null
    };

    /**
     * ⭐ 渲染 PERT 图（主入口 - 支持实时刷新）
     */
    function renderPertChart(tasks) {
        const container = document.getElementById('pertContainer');
        if (!container) {
            console.error('❌ pertContainer 不存在');
            return;
        }
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: white; border-radius: 8px;">
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 4rem; opacity: 0.3;">📊</div>
                        <div style="font-size: 1.3rem; font-weight: 600; color: #495057; margin-top: 1rem;">暂无任务数据</div>
                        <div style="font-size: 0.95rem; color: #6c757d; margin-top: 0.5rem;">请先在甘特图中添加任务</div>
                    </div>
                </div>
            `;
            return;
        }
        
        const config = {
            nodeWidth: 160,
            nodeHeight: 100,
            horizontalGap: 200,
            verticalGap: 140,
            padding: 60
        };
        
        const levels = calculateTaskLevels(tasks);
        const positions = calculateNodePositions(levels, config);
        const canvasSize = calculateCanvasSize(levels, config);
        
        createPertHTML(tasks, levels, canvasSize);
        
        setTimeout(() => {
            drawPertGraph(tasks, positions, config, canvasSize);
            attachPertEvents(canvasSize);
        }, 50);
    }

    /**
     * 创建 HTML 结构
     */
    function createPertHTML(tasks, levels, canvasSize) {
        const container = document.getElementById('pertContainer');
        container.innerHTML = `
            <div class="pert-wrapper" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; overflow: hidden;">
                <div class="pert-toolbar" style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: rgba(255,255,255,0.98); border-bottom: 2px solid #dee2e6; box-shadow: 0 2px 12px rgba(0,0,0,0.08); flex-shrink: 0;">
                    <div style="display: flex; gap: 8px; padding: 4px; background: #f8f9fa; border-radius: 8px;">
                        <button id="pertZoomIn" title="放大" style="padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                            <span style="font-size: 1.1rem;">🔍</span>
                            <span style="font-size: 1.2rem; font-weight: 700;">+</span>
                        </button>
                        <button id="pertZoomOut" title="缩小" style="padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                            <span style="font-size: 1.1rem;">🔍</span>
                            <span style="font-size: 1.2rem; font-weight: 700;">−</span>
                        </button>
                        <button id="pertReset" title="重置" style="padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                            <span style="font-size: 1.1rem;">🔄</span>
                        </button>
                    </div>
                    <div style="width: 1px; height: 28px; background: linear-gradient(to bottom, transparent, #dee2e6 50%, transparent);"></div>
                    <button id="pertOverview" title="全貌" style="padding: 9px 16px; background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.08)); border: 1.5px dashed rgba(16,185,129,0.5); border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; font-weight: 600; color: #10b981; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2rem;">🔭</span>
                        <span>项目全貌</span>
                    </button>
                    <div style="margin-left: auto; display: flex; align-items: center; gap: 16px; font-size: 0.85rem; color: #6c757d;">
                        <span>缩放: <strong id="pertScaleValue" style="color: #667eea;">100%</strong></span>
                        <span style="width: 1px; height: 16px; background: #dee2e6;"></span>
                        <span>任务: <strong style="color: #667eea;">${tasks.length}</strong></span>
                        <span style="width: 1px; height: 16px; background: #dee2e6;"></span>
                        <span>层级: <strong style="color: #667eea;">${levels.length}</strong></span>
                    </div>
                </div>
                <div id="pertCanvas" style="flex: 1; overflow: auto; background: white; position: relative; cursor: grab;">
                    <div id="pertSvgContainer"></div>
                </div>
                <div id="pertTooltip" style="display: none; position: absolute; background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(33,37,41,0.95)); color: white; padding: 14px 18px; border-radius: 10px; font-size: 0.85rem; pointer-events: none; z-index: 2000; box-shadow: 0 8px 24px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);"></div>
                <div style="position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; pointer-events: none; opacity: 0.8;">
                    💡 悬停节点查看详情 | 拖拽移动 | 滚轮缩放
                </div>
            </div>
        `;
    }

    function calculateTaskLevels(tasks) {
        const levels = [];
        const visited = new Set();
        const taskMap = {};
        const inDegree = {};
        
        tasks.forEach(t => {
            taskMap[t.id] = t;
            inDegree[t.id] = 0;
        });
        
        tasks.forEach(task => {
            if (task.dependencies && task.dependencies.length > 0) {
                task.dependencies.forEach(depId => {
                    if (taskMap[depId]) inDegree[task.id]++;
                });
            }
        });
        
        let currentLevel = 0;
        let remainingTasks = [...tasks];
        
        while (remainingTasks.length > 0) {
            const currentLevelTasks = remainingTasks.filter(task => inDegree[task.id] === 0);
            
            if (currentLevelTasks.length === 0) {
                console.warn('⚠️ 循环依赖');
                levels[currentLevel] = remainingTasks;
                break;
            }
            
            levels[currentLevel] = currentLevelTasks;
            
            currentLevelTasks.forEach(task => {
                visited.add(task.id);
                tasks.forEach(t => {
                    if (t.dependencies && t.dependencies.includes(task.id)) {
                        inDegree[t.id]--;
                    }
                });
            });
            
            remainingTasks = remainingTasks.filter(task => !visited.has(task.id));
            currentLevel++;
        }
        
        return levels;
    }

    function calculateNodePositions(levels, config) {
        const positions = {};
        levels.forEach((levelTasks, levelIndex) => {
            levelTasks.forEach((task, taskIndex) => {
                positions[task.id] = {
                    x: config.padding + levelIndex * (config.nodeWidth + config.horizontalGap),
                    y: config.padding + taskIndex * (config.nodeHeight + config.verticalGap),
                    task: task
                };
            });
        });
        return positions;
    }

    function calculateCanvasSize(levels, config) {
        const width = config.padding * 2 + levels.length * (config.nodeWidth + config.horizontalGap) - config.horizontalGap;
        const maxTasks = Math.max(...levels.map(l => l.length));
        const height = config.padding * 2 + maxTasks * (config.nodeHeight + config.verticalGap) - config.verticalGap;
        return { width, height };
    }

    function drawPertGraph(tasks, positions, config, canvasSize) {
        const svgContainer = document.getElementById('pertSvgContainer');
        if (!svgContainer) return;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'pertSvg';
        svg.setAttribute('width', canvasSize.width);
        svg.setAttribute('height', canvasSize.height);
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="pert-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
            </marker>
            <marker id="pert-arrow-highlight" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
            <marker id="pert-arrow-selected" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffc107" />
            </marker>
            <linearGradient id="pert-nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.15" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.05" />
            </linearGradient>
            <linearGradient id="pert-nodeGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.15" />
            </linearGradient>
            <linearGradient id="pert-nodeGradientSelected" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#ffc107;stop-opacity:0.35" />
                <stop offset="100%" style="stop-color:#ff9800;stop-opacity:0.15" />
            </linearGradient>
            <filter id="pert-nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        `;
        svg.appendChild(defs);
        
        const content = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        content.id = 'pertContent';
        svg.appendChild(content);
        
        svgContainer.appendChild(svg);
        
        drawConnections(tasks, positions, config, content);
        drawNodes(tasks, positions, config, content);
    }

    function drawConnections(tasks, positions, config, content) {
        const gap = 10;
        const hLength = 50;
        
        tasks.forEach(task => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            task.dependencies.forEach(depId => {
                const from = positions[depId];
                const to = positions[task.id];
                if (!from || !to) return;
                
                const x1 = from.x + config.nodeWidth;
                const y1 = from.y + config.nodeHeight / 2;
                const x2 = to.x;
                const y2 = to.y + config.nodeHeight / 2;
                
                let pathData = Math.abs(y2 - y1) < 5 
                    ? `M ${x1} ${y1} L ${x2 - gap} ${y2}`
                    : `M ${x1} ${y1} L ${x1 + hLength} ${y1} L ${x2 - hLength} ${y2} L ${x2 - gap} ${y2}`;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.className = 'pert-connection';
                path.setAttribute('data-from', depId);
                path.setAttribute('data-to', task.id);
                path.setAttribute('d', pathData);
                path.setAttribute('stroke', '#dc3545');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('marker-end', 'url(#pert-arrow)');
                path.style.transition = 'all 0.3s ease';
                path.style.opacity = '0.7';
                
                content.appendChild(path);
            });
        });
    }

    function drawNodes(tasks, positions, config, content) {
        tasks.forEach(task => {
            const pos = positions[task.id];
            if (!pos) return;
            
            const duration = daysBetween(task.start, task.end) + 1;
            const taskName = task.name.length > 18 ? task.name.substring(0, 16) + '...' : task.name;
            
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.className = 'pert-node';
            g.setAttribute('data-task-id', task.id);
            g.setAttribute('data-task-name', task.name);
            g.setAttribute('data-task-start', task.start);
            g.setAttribute('data-task-end', task.end);
            g.setAttribute('data-task-duration', duration);
            g.setAttribute('data-task-progress', task.progress);
            g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
            g.style.cursor = 'pointer';
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.className = 'node-rect';
            rect.setAttribute('width', config.nodeWidth);
            rect.setAttribute('height', config.nodeHeight);
            rect.setAttribute('rx', '14');
            rect.setAttribute('fill', 'url(#pert-nodeGradient)');
            rect.setAttribute('stroke', '#667eea');
            rect.setAttribute('stroke-width', '2');
            rect.style.transition = 'all 0.3s ease';
            rect.style.filter = 'url(#pert-nodeShadow)';
            g.appendChild(rect);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', config.nodeWidth / 2);
            text.setAttribute('y', '32');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '15');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#2c3e50');
            text.textContent = taskName;
            g.appendChild(text);
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '20');
            line.setAttribute('y1', '48');
            line.setAttribute('x2', config.nodeWidth - 20);
            line.setAttribute('y2', '48');
            line.setAttribute('stroke', '#dee2e6');
            line.setAttribute('stroke-width', '1.5');
            g.appendChild(line);
            
            const durationText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            durationText.setAttribute('x', config.nodeWidth / 2);
            durationText.setAttribute('y', '66');
            durationText.setAttribute('text-anchor', 'middle');
            durationText.setAttribute('font-size', '13');
            durationText.setAttribute('fill', '#495057');
            durationText.textContent = `📅 ${duration}天`;
            g.appendChild(durationText);
            
            const progressText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            progressText.setAttribute('x', config.nodeWidth / 2);
            progressText.setAttribute('y', '83');
            progressText.setAttribute('text-anchor', 'middle');
            progressText.setAttribute('font-size', '13');
            progressText.setAttribute('fill', task.progress >= 100 ? '#10b981' : '#667eea');
            progressText.setAttribute('font-weight', '600');
            progressText.textContent = `${task.progress}%`;
            g.appendChild(progressText);
            
            const progressBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            progressBg.setAttribute('x', '20');
            progressBg.setAttribute('y', config.nodeHeight - 18);
            progressBg.setAttribute('width', config.nodeWidth - 40);
            progressBg.setAttribute('height', '8');
            progressBg.setAttribute('rx', '4');
            progressBg.setAttribute('fill', '#e9ecef');
            g.appendChild(progressBg);
            
            const progressBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            progressBar.setAttribute('x', '20');
            progressBar.setAttribute('y', config.nodeHeight - 18);
            progressBar.setAttribute('width', (config.nodeWidth - 40) * task.progress / 100);
            progressBar.setAttribute('height', '8');
            progressBar.setAttribute('rx', '4');
            progressBar.setAttribute('fill', task.progress >= 100 ? '#10b981' : '#667eea');
            g.appendChild(progressBar);
            
            const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dateText.setAttribute('x', config.nodeWidth / 2);
            dateText.setAttribute('y', config.nodeHeight + 22);
            dateText.setAttribute('text-anchor', 'middle');
            dateText.setAttribute('font-size', '11');
            dateText.setAttribute('fill', '#adb5bd');
            dateText.textContent = `${formatDate(new Date(task.start)).substring(5)} ~ ${formatDate(new Date(task.end)).substring(5)}`;
            g.appendChild(dateText);
            
            content.appendChild(g);
        });
    }

    function attachPertEvents(canvasSize) {
        const tooltip = document.getElementById('pertTooltip');
        const canvas = document.getElementById('pertCanvas');
        const nodes = document.querySelectorAll('.pert-node');
        
        nodes.forEach(node => {
            const taskId = node.dataset.taskId;
            const rect = node.querySelector('.node-rect');
            
            node.onmouseenter = (e) => {
                PertState.hoveredNode = taskId;
                if (PertState.selectedNode !== taskId) {
                    rect.setAttribute('fill', 'url(#pert-nodeGradientHover)');
                    rect.setAttribute('stroke', '#5568d3');
                    rect.setAttribute('stroke-width', '3');
                    rect.style.transform = 'scale(1.02)';
                }
                highlightConnections(taskId, 'hover');
                showTooltip(e, node, canvas, tooltip);
            };
            
            node.onmousemove = (e) => updateTooltipPos(e, canvas, tooltip);
            
            node.onmouseleave = () => {
                PertState.hoveredNode = null;
                if (PertState.selectedNode !== taskId) {
                    rect.setAttribute('fill', 'url(#pert-nodeGradient)');
                    rect.setAttribute('stroke', '#667eea');
                    rect.setAttribute('stroke-width', '2');
                    rect.style.transform = '';
                }
                highlightConnections(PertState.selectedNode || taskId, PertState.selectedNode ? 'selected' : 'none');
                tooltip.style.display = 'none';
            };
            
            node.onclick = (e) => {
                e.stopPropagation();
                selectNode(taskId, rect);
            };
        });

        document.getElementById('pertZoomIn')?.addEventListener('click', () => zoom(0.2));
        document.getElementById('pertZoomOut')?.addEventListener('click', () => zoom(-0.2));
        document.getElementById('pertReset')?.addEventListener('click', () => reset());
        document.getElementById('pertOverview')?.addEventListener('click', () => overview(canvasSize));

        canvas.onmousedown = (e) => {
            if (e.target.closest('.pert-node')) return;
            PertState.isDragging = true;
            PertState.dragStartX = e.clientX - PertState.offsetX;
            PertState.dragStartY = e.clientY - PertState.offsetY;
            canvas.style.cursor = 'grabbing';
        };

        canvas.onmousemove = (e) => {
            if (!PertState.isDragging) return;
            PertState.offsetX = e.clientX - PertState.dragStartX;
            PertState.offsetY = e.clientY - PertState.dragStartY;
            updateTransform();
        };

        canvas.onmouseup = () => {
            PertState.isDragging = false;
            canvas.style.cursor = 'grab';
        };

        canvas.onwheel = (e) => {
            e.preventDefault();
            zoom(e.deltaY > 0 ? -0.1 : 0.1);
        };

        canvas.onclick = (e) => {
            if (!e.target.closest('.pert-node')) deselect();
        };

        document.querySelectorAll('.pert-btn, #pertOverview').forEach(btn => {
            btn.onmouseenter = () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
            };
            btn.onmouseleave = () => {
                btn.style.transform = '';
                btn.style.boxShadow = '';
            };
        });
    }

    function showTooltip(e, node, canvas, tooltip) {
        const task = gantt.tasks.find(t => t.id === node.dataset.taskId);
        const depCount = task?.dependencies?.length || 0;
        const dependentCount = gantt.tasks.filter(t => t.dependencies?.includes(node.dataset.taskId)).length;
        
        tooltip.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 10px; font-size: 1rem; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px;">
                📋 ${node.dataset.taskName}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 0.85rem; line-height: 1.6;">
                <span style="color: #adb5bd;">📅 开始：</span><span style="color: #e9ecef; font-weight: 500;">${node.dataset.taskStart}</span>
                <span style="color: #adb5bd;">📅 结束：</span><span style="color: #e9ecef; font-weight: 500;">${node.dataset.taskEnd}</span>
                <span style="color: #adb5bd;">⏱️ 工期：</span><span style="color: #e9ecef; font-weight: 500;">${node.dataset.taskDuration} 天</span>
                <span style="color: #adb5bd;">📊 进度：</span><span style="color: ${node.dataset.taskProgress >= 100 ? '#10b981' : '#ffc107'}; font-weight: 700;">${node.dataset.taskProgress}%</span>
                ${depCount > 0 ? `<span style="color: #adb5bd;">⬅️ 前置：</span><span style="color: #dc3545; font-weight: 500;">${depCount} 个</span>` : ''}
                ${dependentCount > 0 ? `<span style="color: #adb5bd;">➡️ 后继：</span><span style="color: #10b981; font-weight: 500;">${dependentCount} 个</span>` : ''}
            </div>
        `;
        tooltip.style.display = 'block';
        updateTooltipPos(e, canvas, tooltip);
    }

    function updateTooltipPos(e, canvas, tooltip) {
        const rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left + 20;
        let y = e.clientY - rect.top + 20;
        
        const tRect = tooltip.getBoundingClientRect();
        if (x + tRect.width > rect.width - 10) x = e.clientX - rect.left - tRect.width - 20;
        if (y + tRect.height > rect.height - 10) y = e.clientY - rect.top - tRect.height - 20;
        
        tooltip.style.left = Math.max(10, x) + 'px';
        tooltip.style.top = Math.max(10, y) + 'px';
    }

    function selectNode(taskId, rect) {
        document.querySelectorAll('.node-rect').forEach(r => {
            if (r !== rect) {
                r.setAttribute('fill', 'url(#pert-nodeGradient)');
                r.setAttribute('stroke', '#667eea');
                r.setAttribute('stroke-width', '2');
                r.style.transform = '';
            }
        });
        
        PertState.selectedNode = taskId;
        rect.setAttribute('fill', 'url(#pert-nodeGradientSelected)');
        rect.setAttribute('stroke', '#ffc107');
        rect.setAttribute('stroke-width', '4');
        rect.style.transform = 'scale(1.05)';
        
        highlightConnections(taskId, 'selected');
        
        const task = gantt.tasks.find(t => t.id === taskId);
        if (task) addLog(`📌 选中: ${task.name}`);
    }

    function deselect() {
        if (!PertState.selectedNode) return;
        
        document.querySelectorAll('.node-rect').forEach(r => {
            r.setAttribute('fill', 'url(#pert-nodeGradient)');
            r.setAttribute('stroke', '#667eea');
            r.setAttribute('stroke-width', '2');
            r.style.transform = '';
        });
        
        highlightConnections(PertState.selectedNode, 'none');
        PertState.selectedNode = null;
        addLog('✅ 取消选中');
    }

    function highlightConnections(taskId, mode) {
        document.querySelectorAll('.pert-connection').forEach(conn => {
            if (conn.dataset.from === taskId || conn.dataset.to === taskId) {
                if (mode === 'hover') {
                    conn.setAttribute('stroke', '#10b981');
                    conn.setAttribute('stroke-width', '3');
                    conn.setAttribute('marker-end', 'url(#pert-arrow-highlight)');
                    conn.style.filter = 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))';
                    conn.style.opacity = '1';
                } else if (mode === 'selected') {
                    conn.setAttribute('stroke', '#ffc107');
                    conn.setAttribute('stroke-width', '3');
                    conn.setAttribute('marker-end', 'url(#pert-arrow-selected)');
                    conn.style.filter = 'drop-shadow(0 0 10px rgba(255, 193, 7, 0.7))';
                    conn.style.opacity = '1';
                } else {
                    conn.setAttribute('stroke', '#dc3545');
                    conn.setAttribute('stroke-width', '2');
                    conn.setAttribute('marker-end', 'url(#pert-arrow)');
                    conn.style.filter = '';
                    conn.style.opacity = '0.7';
                }
            }
        });
    }

    function zoom(delta) {
        PertState.scale = Math.max(0.3, Math.min(2.0, PertState.scale + delta));
        updateTransform();
        updateScale();
        addLog(`🔍 ${Math.round(PertState.scale * 100)}%`);
    }

    function reset() {
        PertState.scale = 1.0;
        PertState.offsetX = 0;
        PertState.offsetY = 0;
        updateTransform();
        updateScale();
        addLog('🔄 已重置');
    }

    function overview(canvasSize) {
        const canvas = document.getElementById('pertCanvas');
        const svg = document.getElementById('pertSvg');
        if (!canvas || !svg) return;
        
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        
        // ⭐ 修复：减少边距
        const marginH = 30;
        const marginV = 40;
        
        const scaleX = (cw - marginH * 2) / canvasSize.width;
        const scaleY = (ch - marginV * 2) / canvasSize.height;
        PertState.scale = Math.min(scaleX, scaleY, 1.0);
        
        const sw = canvasSize.width * PertState.scale;
        const sh = canvasSize.height * PertState.scale;
        PertState.offsetX = (cw - sw) / 2;
        PertState.offsetY = (ch - sh) / 2;
        
        svg.setAttribute('width', cw);
        svg.setAttribute('height', ch);
        
        updateTransform();
        updateScale();
        
        addLog(`🔭 全貌: ${Math.round(PertState.scale * 100)}%`);
    }

    function updateTransform() {
        const content = document.getElementById('pertContent');
        if (content) {
            content.setAttribute('transform', 
                `translate(${PertState.offsetX}, ${PertState.offsetY}) scale(${PertState.scale})`);
        }
    }

    function updateScale() {
        const el = document.getElementById('pertScaleValue');
        if (el) el.textContent = Math.round(PertState.scale * 100) + '%';
    }

    // ⭐ 刷新 PERT 视图（用于数据更新）
    function refreshPertView() {
        if (global.isPertView && typeof gantt !== 'undefined') {
            const pertContainer = document.getElementById('pertContainer');
            if (pertContainer && pertContainer.style.display !== 'none') {
                renderPertChart(gantt.tasks);
                addLog('🔄 PERT 已刷新');
            }
        }
    }

    // 导出
    global.renderPertChart = renderPertChart;
    global.refreshPertView = refreshPertView;
    global.PertState = PertState;

    console.log('✅ pert-simple.js loaded');

})(typeof window !== 'undefined' ? window : this);
