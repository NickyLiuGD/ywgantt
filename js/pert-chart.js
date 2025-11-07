// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 网络图完整实现                                             ▓▓
// ▓▓ 路径: js/pert-chart.js                                         ▓▓
// ▓▓ 版本: Epsilon2 - 添加可拖拽手柄建立依赖关系                    ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== PERT 状态管理 ====================
    
    const pertState = {
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        selectedNode: null,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        hoveredNode: null,
        // ⭐ 新增：依赖连线拖拽状态
        isLinkingDependency: false,
        linkingFromTaskId: null,
        linkingFromHandle: null, // 'left' 或 'right'
        tempLineElement: null
    };

    // ==================== PERT 配置 ====================
    
    const pertConfig = {
        nodeWidth: 160,
        nodeHeight: 100,
        horizontalGap: 200,
        verticalGap: 140,
        padding: 60,
        minScale: 0.3,
        maxScale: 2.0,
        // ⭐ 手柄配置
        handleSize: 16,
        handleColor: '#667eea',
        handleHoverColor: '#5568d3',
        handleActiveColor: '#10b981'
    };

    // ==================== 主渲染函数 ====================
    
    function renderPertChart(tasks) {
        const pertContainer = document.getElementById('pertContainer');
        
        if (!pertContainer) {
            throw new Error('pertContainer 不存在');
        }
        
        if (!tasks || tasks.length === 0) {
            pertContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; background: white; border-radius: 8px;">
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.5;">📊</div>
                        <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 0.5rem; color: #495057;">暂无任务数据</div>
                        <div style="font-size: 0.95rem; color: #6c757d;">请先在甘特图中添加任务</div>
                    </div>
                </div>
            `;
            return;
        }
        
        const levels = calculateTaskLevels(tasks);
        const positions = calculateNodePositions(levels);
        const canvasSize = calculateCanvasSize(levels);
        
        createPertHTML(tasks, levels, canvasSize);
        
        setTimeout(() => {
            drawPertGraph(tasks, positions, canvasSize);
            attachPertEvents(canvasSize);
        }, 50);
    }

    // ==================== 布局算法 ====================
    
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
                    if (taskMap[depId]) {
                        inDegree[task.id]++;
                    }
                });
            }
        });
        
        let currentLevel = 0;
        let remainingTasks = [...tasks];
        
        while (remainingTasks.length > 0) {
            const currentLevelTasks = remainingTasks.filter(task => inDegree[task.id] === 0);
            
            if (currentLevelTasks.length === 0) {
                console.warn('⚠️ 检测到循环依赖');
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

    function calculateNodePositions(levels) {
        const positions = {};
        
        levels.forEach((levelTasks, levelIndex) => {
            levelTasks.forEach((task, taskIndex) => {
                positions[task.id] = {
                    x: pertConfig.padding + levelIndex * (pertConfig.nodeWidth + pertConfig.horizontalGap),
                    y: pertConfig.padding + taskIndex * (pertConfig.nodeHeight + pertConfig.verticalGap),
                    level: levelIndex,
                    indexInLevel: taskIndex,
                    task: task
                };
            });
        });
        
        return positions;
    }

    function calculateCanvasSize(levels) {
        const width = pertConfig.padding * 2 + levels.length * (pertConfig.nodeWidth + pertConfig.horizontalGap) - pertConfig.horizontalGap;
        const maxTasksInLevel = Math.max(...levels.map(l => l.length));
        const height = pertConfig.padding * 2 + maxTasksInLevel * (pertConfig.nodeHeight + pertConfig.verticalGap) - pertConfig.verticalGap;
        
        return { width, height };
    }

    // ==================== HTML 创建 ====================
    
    function createPertHTML(tasks, levels, canvasSize) {
        const pertContainer = document.getElementById('pertContainer');
        
        pertContainer.innerHTML = `
            <div class="pert-wrapper" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; overflow: hidden; box-shadow: inset 0 0 20px rgba(0,0,0,0.05);">
                <div class="pert-toolbar" style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: rgba(255,255,255,0.98); backdrop-filter: blur(10px); border-bottom: 2px solid #dee2e6; box-shadow: 0 2px 12px rgba(0,0,0,0.08); flex-shrink: 0;">
                    <div style="display: flex; gap: 8px; padding: 4px; background: #f8f9fa; border-radius: 8px;">
                        <button class="pert-btn" id="pertZoomIn" title="放大 (滚轮向上)" style="padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; font-weight: 500; color: #495057; display: flex; align-items: center; gap: 4px;">
                            <span style="font-size: 1.1rem;">🔍</span>
                            <span style="font-size: 1.2rem; font-weight: 700;">+</span>
                        </button>
                        <button class="pert-btn" id="pertZoomOut" title="缩小 (滚轮向下)" style="padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; font-weight: 500; color: #495057; display: flex; align-items: center; gap: 4px;">
                            <span style="font-size: 1.1rem;">🔍</span>
                            <span style="font-size: 1.2rem; font-weight: 700;">−</span>
                        </button>
                        <button class="pert-btn" id="pertReset" title="重置视图" style="padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; font-weight: 500; color: #495057; display: flex; align-items: center; gap: 4px;">
                            <span style="font-size: 1.1rem;">🔄</span>
                        </button>
                    </div>
                    <div style="width: 1px; height: 28px; background: linear-gradient(to bottom, transparent, #dee2e6 50%, transparent);"></div>
                    <button class="pert-btn pert-btn-overview" id="pertOverview" title="自适应窗口" style="padding: 9px 16px; background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.08)); border: 1.5px dashed rgba(16,185,129,0.5); border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; font-weight: 600; color: #10b981; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2rem;">🔭</span>
                        <span>项目全貌</span>
                    </button>
                    <div style="margin-left: auto; display: flex; align-items: center; gap: 16px; font-size: 0.85rem; color: #6c757d;">
                        <span>缩放: <strong id="pertScaleValue" style="color: #667eea; font-size: 0.95rem;">100%</strong></span>
                        <span style="width: 1px; height: 16px; background: #dee2e6;"></span>
                        <span>任务: <strong style="color: #667eea;">${tasks.length}</strong></span>
                        <span style="width: 1px; height: 16px; background: #dee2e6;"></span>
                        <span>层级: <strong style="color: #667eea;">${levels.length}</strong></span>
                    </div>
                </div>
                <div class="pert-canvas" id="pertCanvas" style="flex: 1; overflow: auto; background: white; position: relative; cursor: grab; box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);">
                    <div id="pertSvgContainer" style="width: 100%; height: 100%; min-width: ${canvasSize.width}px; min-height: ${canvasSize.height}px;"></div>
                </div>
                <div id="pertTooltip" style="display: none; position: absolute; background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(33,37,41,0.95)); color: white; padding: 14px 18px; border-radius: 10px; font-size: 0.85rem; pointer-events: none; z-index: 2000; box-shadow: 0 8px 24px rgba(0,0,0,0.4); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); max-width: 320px;"></div>
                <div style="position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; pointer-events: none; opacity: 0.8;">
                    💡 提示：拖拽节点手柄建立依赖关系 | 悬停查看详情 | 滚轮缩放
                </div>
            </div>
        `;
    }

    // ==================== SVG 绘制 ====================
    
    function drawPertGraph(tasks, positions, canvasSize) {
        const svgContainer = document.getElementById('pertSvgContainer');
        if (!svgContainer) {
            console.error('❌ SVG 容器未找到');
            return;
        }
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'pertSvg');
        svg.setAttribute('width', canvasSize.width);
        svg.setAttribute('height', canvasSize.height);
        svg.style.display = 'block';
        
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
            <marker id="pert-arrow-temp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
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
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3"/>
                </feComponentTransfer>
                <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <filter id="pert-handleGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        `;
        svg.appendChild(defs);
        
        const content = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        content.setAttribute('id', 'pertContent');
        svg.appendChild(content);
        
        svgContainer.appendChild(svg);
        
        drawConnections(tasks, positions, content);
        drawNodes(tasks, positions, content);
    }

    function drawConnections(tasks, positions, content) {
        const gap = 10;
        const hLength = 50;
        
        tasks.forEach(task => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            task.dependencies.forEach(depId => {
                const from = positions[depId];
                const to = positions[task.id];
                if (!from || !to) return;
                
                const x1 = from.x + pertConfig.nodeWidth;
                const y1 = from.y + pertConfig.nodeHeight / 2;
                const x2 = to.x;
                const y2 = to.y + pertConfig.nodeHeight / 2;
                
                let pathData = '';
                if (Math.abs(y2 - y1) < 5) {
                    pathData = `M ${x1} ${y1} L ${x2 - gap} ${y2}`;
                } else {
                    pathData = `M ${x1} ${y1} L ${x1 + hLength} ${y1} L ${x2 - hLength} ${y2} L ${x2 - gap} ${y2}`;
                }
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'pert-connection');
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

    function drawNodes(tasks, positions, content) {
        tasks.forEach(task => {
            const pos = positions[task.id];
            if (!pos) return;
            
            const duration = daysBetween(task.start, task.end) + 1;
            const taskName = task.name.length > 18 ? task.name.substring(0, 16) + '...' : task.name;
            
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'pert-node');
            g.setAttribute('data-task-id', task.id);
            g.setAttribute('data-task-name', task.name);
            g.setAttribute('data-task-start', task.start);
            g.setAttribute('data-task-end', task.end);
            g.setAttribute('data-task-duration', duration);
            g.setAttribute('data-task-progress', task.progress);
            g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
            g.style.cursor = 'pointer';
            g.style.transition = 'all 0.3s ease';
            
            // 节点矩形
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'node-rect');
            rect.setAttribute('width', pertConfig.nodeWidth);
            rect.setAttribute('height', pertConfig.nodeHeight);
            rect.setAttribute('rx', '14');
            rect.setAttribute('fill', 'url(#pert-nodeGradient)');
            rect.setAttribute('stroke', '#667eea');
            rect.setAttribute('stroke-width', '2');
            rect.style.transition = 'all 0.3s ease';
            rect.style.filter = 'url(#pert-nodeShadow)';
            g.appendChild(rect);
            
            // ⭐ 左侧手柄（接收依赖 - 被其他任务依赖）
            const leftHandle = createHandle('left', pertConfig.nodeHeight / 2, task.id);
            g.appendChild(leftHandle);
            
            // ⭐ 右侧手柄（创建依赖 - 依赖其他任务）
            const rightHandle = createHandle('right', pertConfig.nodeHeight / 2, task.id);
            g.appendChild(rightHandle);
            
            // 任务名称
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pertConfig.nodeWidth / 2);
            text.setAttribute('y', '32');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '15');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#2c3e50');
            text.textContent = taskName;
            g.appendChild(text);
            
            // 分隔线
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '20');
            line.setAttribute('y1', '48');
            line.setAttribute('x2', pertConfig.nodeWidth - 20);
            line.setAttribute('y2', '48');
            line.setAttribute('stroke', '#dee2e6');
            line.setAttribute('stroke-width', '1.5');
            g.appendChild(line);
            
            // 工期
            const durationText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            durationText.setAttribute('x', pertConfig.nodeWidth / 2);
            durationText.setAttribute('y', '66');
            durationText.setAttribute('text-anchor', 'middle');
            durationText.setAttribute('font-size', '13');
            durationText.setAttribute('fill', '#495057');
            durationText.setAttribute('font-weight', '500');
            durationText.textContent = `📅 ${duration}天`;
            g.appendChild(durationText);
            
            // 进度百分比
            const progressText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            progressText.setAttribute('x', pertConfig.nodeWidth / 2);
            progressText.setAttribute('y', '83');
            progressText.setAttribute('text-anchor', 'middle');
            progressText.setAttribute('font-size', '13');
            progressText.setAttribute('fill', task.progress >= 100 ? '#10b981' : '#667eea');
            progressText.setAttribute('font-weight', '600');
            progressText.textContent = `${task.progress}%`;
            g.appendChild(progressText);
            
            // 进度条背景
            const progressBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            progressBg.setAttribute('x', '20');
            progressBg.setAttribute('y', pertConfig.nodeHeight - 18);
            progressBg.setAttribute('width', pertConfig.nodeWidth - 40);
            progressBg.setAttribute('height', '8');
            progressBg.setAttribute('rx', '4');
            progressBg.setAttribute('fill', '#e9ecef');
            g.appendChild(progressBg);
            
            // 进度条
            const progressBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            progressBar.setAttribute('x', '20');
            progressBar.setAttribute('y', pertConfig.nodeHeight - 18);
            progressBar.setAttribute('width', Math.max((pertConfig.nodeWidth - 40) * task.progress / 100, 0));
            progressBar.setAttribute('height', '8');
            progressBar.setAttribute('rx', '4');
            progressBar.setAttribute('fill', task.progress >= 100 ? '#10b981' : '#667eea');
            progressBar.style.transition = 'width 0.3s ease';
            g.appendChild(progressBar);
            
            // 日期范围
            const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dateText.setAttribute('x', pertConfig.nodeWidth / 2);
            dateText.setAttribute('y', pertConfig.nodeHeight + 22);
            dateText.setAttribute('text-anchor', 'middle');
            dateText.setAttribute('font-size', '11');
            dateText.setAttribute('fill', '#adb5bd');
            dateText.setAttribute('font-weight', '500');
            const startStr = formatDate(new Date(task.start)).substring(5);
            const endStr = formatDate(new Date(task.end)).substring(5);
            dateText.textContent = `${startStr} ~ ${endStr}`;
            g.appendChild(dateText);
            
            content.appendChild(g);
        });
    }

    // ⭐ ==================== 创建拖拽手柄 ====================
    
    /**
     * 创建手柄（左侧或右侧）
     * @param {string} side - 'left' 或 'right'
     * @param {number} centerY - 中心 Y 坐标
     * @param {string} taskId - 任务 ID
     * @returns {SVGElement} 手柄组
     */
    function createHandle(side, centerY, taskId) {
        const handleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        handleGroup.setAttribute('class', `pert-handle pert-handle-${side}`);
        handleGroup.setAttribute('data-task-id', taskId);
        handleGroup.setAttribute('data-handle-side', side);
        handleGroup.style.cursor = 'crosshair';
        
        const x = side === 'left' ? 0 : pertConfig.nodeWidth;
        const size = pertConfig.handleSize;
        
        // 外圈（发光效果）
        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('cx', x);
        outerCircle.setAttribute('cy', centerY);
        outerCircle.setAttribute('r', size / 2 + 2);
        outerCircle.setAttribute('fill', 'rgba(102, 126, 234, 0.2)');
        outerCircle.setAttribute('class', 'handle-glow');
        outerCircle.style.opacity = '0';
        outerCircle.style.transition = 'all 0.3s ease';
        handleGroup.appendChild(outerCircle);
        
        // 主圆圈
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', centerY);
        circle.setAttribute('r', size / 2);
        circle.setAttribute('fill', 'white');
        circle.setAttribute('stroke', pertConfig.handleColor);
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('class', 'handle-circle');
        circle.style.transition = 'all 0.3s ease';
        circle.style.filter = 'url(#pert-handleGlow)';
        handleGroup.appendChild(circle);
        
        // 图标
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        icon.setAttribute('x', x);
        icon.setAttribute('y', centerY);
        icon.setAttribute('text-anchor', 'middle');
        icon.setAttribute('dominant-baseline', 'central');
        icon.setAttribute('font-size', '10');
        icon.setAttribute('fill', pertConfig.handleColor);
        icon.setAttribute('font-weight', '700');
        icon.setAttribute('class', 'handle-icon');
        icon.textContent = side === 'left' ? '◀' : '▶';
        icon.style.pointerEvents = 'none';
        icon.style.transition = 'all 0.3s ease';
        handleGroup.appendChild(icon);
        
        // 提示文字（初始隐藏）
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', side === 'left' ? x - 25 : x + 25);
        label.setAttribute('y', centerY);
        label.setAttribute('text-anchor', side === 'left' ? 'end' : 'start');
        label.setAttribute('dominant-baseline', 'central');
        label.setAttribute('font-size', '11');
        label.setAttribute('fill', '#667eea');
        label.setAttribute('font-weight', '600');
        label.setAttribute('class', 'handle-label');
        label.textContent = side === 'left' ? '被依赖' : '依赖';
        label.style.opacity = '0';
        label.style.pointerEvents = 'none';
        label.style.transition = 'all 0.3s ease';
        handleGroup.appendChild(label);
        
        return handleGroup;
    }

    // ⭐ ==================== 手柄交互事件 ====================
    
    /**
     * 绑定手柄事件
     */
    function attachHandleEvents() {
        const handles = document.querySelectorAll('.pert-handle');
        
        handles.forEach(handle => {
            const taskId = handle.dataset.taskId;
            const side = handle.dataset.handleSide;
            const circle = handle.querySelector('.handle-circle');
            const icon = handle.querySelector('.handle-icon');
            const glow = handle.querySelector('.handle-glow');
            const label = handle.querySelector('.handle-label');
            
            // 鼠标进入手柄
            handle.addEventListener('mouseenter', (e) => {
                if (pertState.isLinkingDependency) {
                    // 拖拽中：高亮可放置的目标
                    if (canDropOnHandle(pertState.linkingFromTaskId, pertState.linkingFromHandle, taskId, side)) {
                        circle.setAttribute('fill', pertConfig.handleActiveColor);
                        circle.setAttribute('stroke', pertConfig.handleActiveColor);
                        circle.setAttribute('r', pertConfig.handleSize / 2 + 2);
                        icon.setAttribute('fill', 'white');
                        glow.style.opacity = '1';
                        glow.setAttribute('fill', 'rgba(16, 185, 129, 0.4)');
                    }
                } else {
                    // 正常悬停
                    circle.setAttribute('stroke', pertConfig.handleHoverColor);
                    circle.setAttribute('stroke-width', '3');
                    icon.setAttribute('fill', pertConfig.handleHoverColor);
                    glow.style.opacity = '1';
                    label.style.opacity = '1';
                }
            });
            
            // 鼠标离开手柄
            handle.addEventListener('mouseleave', () => {
                if (!pertState.isLinkingDependency) {
                    circle.setAttribute('fill', 'white');
                    circle.setAttribute('stroke', pertConfig.handleColor);
                    circle.setAttribute('stroke-width', '2');
                    circle.setAttribute('r', pertConfig.handleSize / 2);
                    icon.setAttribute('fill', pertConfig.handleColor);
                    glow.style.opacity = '0';
                    label.style.opacity = '0';
                }
            });
            
            // 鼠标按下：开始拖拽连线
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                startLinkingDependency(taskId, side, e);
            });
        });
    }

    /**
     * 开始拖拽依赖连线
     */
    function startLinkingDependency(fromTaskId, fromHandle, e) {
        pertState.isLinkingDependency = true;
        pertState.linkingFromTaskId = fromTaskId;
        pertState.linkingFromHandle = fromHandle;
        
        const canvas = document.getElementById('pertCanvas');
        if (canvas) {
            canvas.style.cursor = 'crosshair';
        }
        
        // 创建临时连线
        createTempLine(fromTaskId, fromHandle);
        
        const task = gantt.tasks.find(t => t.id === fromTaskId);
        addLog(`🔗 开始创建依赖关系：从 "${task.name}" 的${fromHandle === 'left' ? '左侧' : '右侧'}手柄`);
    }

    /**
     * 创建临时连线
     */
    function createTempLine(fromTaskId, fromHandle) {
        const svg = document.getElementById('pertSvg');
        if (!svg) return;
        
        const fromNode = document.querySelector(`.pert-node[data-task-id="${fromTaskId}"]`);
        if (!fromNode) return;
        
        const transform = fromNode.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (!match) return;
        
        const nodeX = parseFloat(match[1]);
        const nodeY = parseFloat(match[2]);
        
        const startX = fromHandle === 'left' ? nodeX : nodeX + pertConfig.nodeWidth;
        const startY = nodeY + pertConfig.nodeHeight / 2;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('id', 'pertTempLine');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', startX);
        line.setAttribute('y2', startY);
        line.setAttribute('stroke', '#06b6d4');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('marker-end', 'url(#pert-arrow-temp)');
        line.style.pointerEvents = 'none';
        
        svg.appendChild(line);
        pertState.tempLineElement = line;
    }

    /**
     * 更新临时连线位置
     */
    function updateTempLine(e) {
        if (!pertState.tempLineElement) return;
        
        const canvas = document.getElementById('pertCanvas');
        const svg = document.getElementById('pertSvg');
        const content = document.getElementById('pertContent');
        
        if (!canvas || !svg || !content) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        
        // 计算鼠标在 SVG 中的坐标（考虑缩放和偏移）
        const mouseX = (e.clientX - svgRect.left - pertState.offsetX) / pertState.scale;
        const mouseY = (e.clientY - svgRect.top - pertState.offsetY) / pertState.scale;
        
        pertState.tempLineElement.setAttribute('x2', mouseX);
        pertState.tempLineElement.setAttribute('y2', mouseY);
    }

    /**
     * 判断是否可以在目标手柄上放置
     */
    function canDropOnHandle(fromTaskId, fromHandle, toTaskId, toHandle) {
        // 不能连接到自己
        if (fromTaskId === toTaskId) return false;
        
        // 右侧手柄只能连到其他节点的左侧手柄
        if (fromHandle === 'right' && toHandle === 'left') {
            // 检查是否会形成循环依赖
            const toTask = gantt.tasks.find(t => t.id === toTaskId);
            if (toTask && toTask.dependencies && toTask.dependencies.includes(fromTaskId)) {
                return false; // 已存在反向依赖
            }
            return true;
        }
        
        // 左侧手柄只能连到其他节点的右侧手柄
        if (fromHandle === 'left' && toHandle === 'right') {
            const fromTask = gantt.tasks.find(t => t.id === fromTaskId);
            if (fromTask && fromTask.dependencies && fromTask.dependencies.includes(toTaskId)) {
                return false; // 已存在反向依赖
            }
            return true;
        }
        
        return false;
    }

    /**
     * 完成依赖连线
     */
    function finishLinkingDependency(toTaskId, toHandle) {
        if (!pertState.isLinkingDependency) return;
        
        const fromTaskId = pertState.linkingFromTaskId;
        const fromHandle = pertState.linkingFromHandle;
        
        // 验证连接有效性
        if (!canDropOnHandle(fromTaskId, fromHandle, toTaskId, toHandle)) {
            cancelLinkingDependency();
            addLog('❌ 无法建立此依赖关系');
            return;
        }
        
        // 建立依赖关系
        let sourceTaskId, targetTaskId;
        
        if (fromHandle === 'right' && toHandle === 'left') {
            // 右手柄 → 左手柄：fromTask 依赖 toTask
            sourceTaskId = fromTaskId;
            targetTaskId = toTaskId;
        } else if (fromHandle === 'left' && toHandle === 'right') {
            // 左手柄 ← 右手柄：toTask 依赖 fromTask
            sourceTaskId = toTaskId;
            targetTaskId = fromTaskId;
        } else {
            cancelLinkingDependency();
            return;
        }
        
        const sourceTask = gantt.tasks.find(t => t.id === sourceTaskId);
        const targetTask = gantt.tasks.find(t => t.id === targetTaskId);
        
        if (!sourceTask || !targetTask) {
            cancelLinkingDependency();
            return;
        }
        
        // 添加依赖
        if (!sourceTask.dependencies) {
            sourceTask.dependencies = [];
        }
        
        if (sourceTask.dependencies.includes(targetTaskId)) {
            addLog(`⚠️ 任务 "${sourceTask.name}" 已依赖 "${targetTask.name}"`);
        } else {
            sourceTask.dependencies.push(targetTaskId);
            addLog(`✅ 已建立依赖：${sourceTask.name} → ${targetTask.name}`);
            
            // 重新渲染 PERT 图
            renderPertChart(gantt.tasks);
            
            // 如果在甘特图视图，也需要刷新
            if (typeof getCurrentView === 'function' && getCurrentView() === 'pert') {
                // 仅刷新 PERT
            } else {
                // 同时刷新甘特图
                if (gantt && typeof gantt.render === 'function') {
                    gantt.calculateDateRange();
                    gantt.render();
                }
            }
        }
        
        cancelLinkingDependency();
    }

    /**
     * 取消依赖连线
     */
    function cancelLinkingDependency() {
        if (pertState.tempLineElement && pertState.tempLineElement.parentElement) {
            pertState.tempLineElement.parentElement.removeChild(pertState.tempLineElement);
        }
        
        pertState.isLinkingDependency = false;
        pertState.linkingFromTaskId = null;
        pertState.linkingFromHandle = null;
        pertState.tempLineElement = null;
        
        const canvas = document.getElementById('pertCanvas');
        if (canvas) {
            canvas.style.cursor = 'grab';
        }
        
        // 重置所有手柄样式
        document.querySelectorAll('.pert-handle .handle-circle').forEach(circle => {
            circle.setAttribute('fill', 'white');
            circle.setAttribute('stroke', pertConfig.handleColor);
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('r', pertConfig.handleSize / 2);
        });
        
        document.querySelectorAll('.pert-handle .handle-icon').forEach(icon => {
            icon.setAttribute('fill', pertConfig.handleColor);
        });
        
        document.querySelectorAll('.pert-handle .handle-glow').forEach(glow => {
            glow.style.opacity = '0';
        });
    }

    // ==================== 事件处理 ====================
    
    function attachPertEvents(canvasSize) {
        const tooltip = document.getElementById('pertTooltip');
        const canvas = document.getElementById('pertCanvas');
        const nodes = document.querySelectorAll('.pert-node');
        
        if (!tooltip || !canvas) return;
        
        // ⭐ 绑定手柄事件
        attachHandleEvents();
        
        // 节点事件
        nodes.forEach(node => {
            const taskId = node.dataset.taskId;
            const rect = node.querySelector('.node-rect');
            
            node.addEventListener('mouseenter', (e) => {
                pertState.hoveredNode = taskId;
                
                if (pertState.selectedNode !== taskId && !pertState.isLinkingDependency) {
                    rect.setAttribute('fill', 'url(#pert-nodeGradientHover)');
                    rect.setAttribute('stroke', '#5568d3');
                    rect.setAttribute('stroke-width', '3');
                    rect.style.transform = 'scale(1.02)';
                }
                
                if (!pertState.isLinkingDependency) {
                    highlightConnections(taskId, 'hover');
                    showPertTooltip(e, node, canvas);
                }
            });
            
            node.addEventListener('mousemove', (e) => {
                if (!pertState.isLinkingDependency) {
                    updateTooltipPosition(e, canvas);
                }
            });
            
            node.addEventListener('mouseleave', () => {
                pertState.hoveredNode = null;
                
                if (pertState.selectedNode !== taskId && !pertState.isLinkingDependency) {
                    rect.setAttribute('fill', 'url(#pert-nodeGradient)');
                    rect.setAttribute('stroke', '#667eea');
                    rect.setAttribute('stroke-width', '2');
                    rect.style.transform = '';
                }
                
                if (!pertState.isLinkingDependency) {
                    if (pertState.selectedNode) {
                        highlightConnections(pertState.selectedNode, 'selected');
                    } else {
                        highlightConnections(taskId, 'none');
                    }
                    
                    tooltip.style.display = 'none';
                }
            });
            
            node.addEventListener('click', (e) => {
                // 如果点击的是手柄，不触发节点选择
                if (e.target.closest('.pert-handle')) return;
                
                e.stopPropagation();
                
                if (!pertState.isLinkingDependency) {
                    selectPertNode(taskId, rect);
                }
            });
        });

        // 工具栏按钮
        const zoomInBtn = document.getElementById('pertZoomIn');
        const zoomOutBtn = document.getElementById('pertZoomOut');
        const resetBtn = document.getElementById('pertReset');
        const overviewBtn = document.getElementById('pertOverview');

        if (zoomInBtn) zoomInBtn.onclick = () => zoomPert(0.2);
        if (zoomOutBtn) zoomOutBtn.onclick = () => zoomPert(-0.2);
        if (resetBtn) resetBtn.onclick = () => resetPertView();
        if (overviewBtn) overviewBtn.onclick = () => switchPertToOverview(canvasSize.width, canvasSize.height);

        // ⭐ 画布拖拽（排除手柄拖拽）
        canvas.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pert-node') || e.target.closest('.pert-handle')) return;
            
            pertState.isDragging = true;
            pertState.dragStartX = e.clientX - pertState.offsetX;
            pertState.dragStartY = e.clientY - pertState.offsetY;
            canvas.style.cursor = 'grabbing';
        });

        // ⭐ 鼠标移动（更新临时连线或拖拽画布）
        canvas.addEventListener('mousemove', (e) => {
            if (pertState.isLinkingDependency) {
                updateTempLine(e);
            } else if (pertState.isDragging) {
                pertState.offsetX = e.clientX - pertState.dragStartX;
                pertState.offsetY = e.clientY - pertState.dragStartY;
                updatePertTransform();
            }
        });

        // ⭐ 鼠标释放（完成连线或停止拖拽）
        canvas.addEventListener('mouseup', (e) => {
            if (pertState.isLinkingDependency) {
                // 检查是否释放在手柄上
                const targetHandle = e.target.closest('.pert-handle');
                if (targetHandle) {
                    const toTaskId = targetHandle.dataset.taskId;
                    const toHandle = targetHandle.dataset.handleSide;
                    finishLinkingDependency(toTaskId, toHandle);
                } else {
                    cancelLinkingDependency();
                    addLog('❌ 已取消依赖连线');
                }
            } else if (pertState.isDragging) {
                pertState.isDragging = false;
                canvas.style.cursor = 'grab';
            }
        });

        canvas.addEventListener('mouseleave', () => {
            if (pertState.isDragging) {
                pertState.isDragging = false;
                canvas.style.cursor = 'grab';
            }
        });

        // 滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            zoomPert(delta);
        }, { passive: false });

        // 点击空白取消选择
        canvas.addEventListener('click', (e) => {
            if (!e.target.closest('.pert-node') && !pertState.isLinkingDependency) {
                deselectPertNode();
            }
        });
        
        // ESC 键取消连线
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && pertState.isLinkingDependency) {
                cancelLinkingDependency();
                addLog('❌ 已取消依赖连线 (ESC)');
            }
        });
        
        // 按钮悬停效果
        document.querySelectorAll('.pert-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
                btn.style.boxShadow = '';
            });
        });
    }

    // ==================== 交互功能 ====================
    
    function showPertTooltip(e, node, canvas) {
        const tooltip = document.getElementById('pertTooltip');
        if (!tooltip) return;
        
        const taskName = node.dataset.taskName;
        const taskStart = node.dataset.taskStart;
        const taskEnd = node.dataset.taskEnd;
        const taskDuration = node.dataset.taskDuration;
        const taskProgress = node.dataset.taskProgress;
        
        const task = gantt.tasks.find(t => t.id === node.dataset.taskId);
        const depCount = task && task.dependencies ? task.dependencies.length : 0;
        const dependentCount = gantt.tasks.filter(t => 
            t.dependencies && t.dependencies.includes(node.dataset.taskId)
        ).length;
        
        tooltip.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 10px; font-size: 1rem; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px;">
                📋 ${taskName}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 0.85rem; line-height: 1.6;">
                <span style="color: #adb5bd;">📅 开始：</span><span style="color: #e9ecef; font-weight: 500;">${taskStart}</span>
                <span style="color: #adb5bd;">📅 结束：</span><span style="color: #e9ecef; font-weight: 500;">${taskEnd}</span>
                <span style="color: #adb5bd;">⏱️ 工期：</span><span style="color: #e9ecef; font-weight: 500;">${taskDuration} 天</span>
                <span style="color: #adb5bd;">📊 进度：</span><span style="color: ${taskProgress >= 100 ? '#10b981' : '#ffc107'}; font-weight: 700;">${taskProgress}%</span>
                ${depCount > 0 ? `<span style="color: #adb5bd;">⬅️ 前置：</span><span style="color: #dc3545; font-weight: 500;">${depCount} 个任务</span>` : ''}
                ${dependentCount > 0 ? `<span style="color: #adb5bd;">➡️ 后继：</span><span style="color: #10b981; font-weight: 500;">${dependentCount} 个任务</span>` : ''}
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem; color: #adb5bd;">
                💡 拖拽手柄建立依赖关系
            </div>
        `;
        
        tooltip.style.display = 'block';
        updateTooltipPosition(e, canvas);
    }

    function updateTooltipPosition(e, canvas) {
        const tooltip = document.getElementById('pertTooltip');
        if (!tooltip) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        let x = e.clientX - canvasRect.left + 20;
        let y = e.clientY - canvasRect.top + 20;
        
        const tooltipRect = tooltip.getBoundingClientRect();
        
        if (x + tooltipRect.width > canvasRect.width - 10) {
            x = e.clientX - canvasRect.left - tooltipRect.width - 20;
        }
        if (y + tooltipRect.height > canvasRect.height - 10) {
            y = e.clientY - canvasRect.top - tooltipRect.height - 20;
        }
        
        x = Math.max(10, x);
        y = Math.max(10, y);
        
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    function selectPertNode(taskId, rect) {
        document.querySelectorAll('.pert-node .node-rect').forEach(r => {
            if (r !== rect) {
                r.setAttribute('fill', 'url(#pert-nodeGradient)');
                r.setAttribute('stroke', '#667eea');
                r.setAttribute('stroke-width', '2');
                r.style.transform = '';
            }
        });
        
        pertState.selectedNode = taskId;
        rect.setAttribute('fill', 'url(#pert-nodeGradientSelected)');
        rect.setAttribute('stroke', '#ffc107');
        rect.setAttribute('stroke-width', '4');
        rect.style.transform = 'scale(1.05)';
        
        highlightConnections(taskId, 'selected');
        
        const task = gantt.tasks.find(t => t.id === taskId);
        if (task) {
            addLog(`📌 已选中 PERT 节点: ${task.name}`);
        }
    }

    function deselectPertNode() {
        if (!pertState.selectedNode) return;
        
        document.querySelectorAll('.pert-node .node-rect').forEach(r => {
            r.setAttribute('fill', 'url(#pert-nodeGradient)');
            r.setAttribute('stroke', '#667eea');
            r.setAttribute('stroke-width', '2');
            r.style.transform = '';
        });
        
        highlightConnections(pertState.selectedNode, 'none');
        pertState.selectedNode = null;
        
        addLog('✅ 已取消选中');
    }

    function highlightConnections(taskId, mode) {
        document.querySelectorAll('.pert-connection').forEach(conn => {
            const from = conn.dataset.from;
            const to = conn.dataset.to;
            
            if (from === taskId || to === taskId) {
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

    function zoomPert(delta) {
        const oldScale = pertState.scale;
        pertState.scale = Math.max(pertConfig.minScale, Math.min(pertConfig.maxScale, pertState.scale + delta));
        
        if (oldScale !== pertState.scale) {
            updatePertTransform();
            updateScaleDisplay();
            addLog(`🔍 缩放: ${Math.round(pertState.scale * 100)}%`);
        }
    }

    function resetPertView() {
        pertState.scale = 1.0;
        pertState.offsetX = 0;
        pertState.offsetY = 0;
        updatePertTransform();
        updateScaleDisplay();
        
        const svg = document.getElementById('pertSvg');
        if (svg) {
            const canvasWidth = parseInt(svg.getAttribute('width'));
            const canvasHeight = parseInt(svg.getAttribute('height'));
            svg.setAttribute('width', canvasWidth);
            svg.setAttribute('height', canvasHeight);
        }
        
        addLog('🔄 已重置 PERT 视图 (100%)');
    }

    function updatePertTransform() {
        const content = document.getElementById('pertContent');
        if (content) {
            content.setAttribute('transform', 
                `translate(${pertState.offsetX}, ${pertState.offsetY}) scale(${pertState.scale})`);
        }
    }

    function updateScaleDisplay() {
        const scaleValue = document.getElementById('pertScaleValue');
        if (scaleValue) {
            scaleValue.textContent = Math.round(pertState.scale * 100) + '%';
        }
    }

    function switchPertToOverview(contentWidth, contentHeight) {
        const canvas = document.getElementById('pertCanvas');
        const svg = document.getElementById('pertSvg');
        if (!canvas || !svg) return;
        
        const containerWidth = canvas.clientWidth;
        const containerHeight = canvas.clientHeight;
        
        const marginH = 30;
        const marginV = 40;
        
        const scaleX = (containerWidth - marginH * 2) / contentWidth;
        const scaleY = (containerHeight - marginV * 2) / contentHeight;
        pertState.scale = Math.min(scaleX, scaleY, 1.0);
        
        const scaledWidth = contentWidth * pertState.scale;
        const scaledHeight = contentHeight * pertState.scale;
        pertState.offsetX = (containerWidth - scaledWidth) / 2;
        pertState.offsetY = (containerHeight - scaledHeight) / 2;
        
        svg.setAttribute('width', containerWidth);
        svg.setAttribute('height', containerHeight);
        
        updatePertTransform();
        updateScaleDisplay();
        
        addLog(`╔═══════════════════════════════════════════════════════════╗`);
        addLog(`║  🔭 PERT 全貌视图                                         ║`);
        addLog(`╠═══════════════════════════════════════════════════════════╣`);
        addLog(`  📐 内容: ${contentWidth}×${contentHeight}px`);
        addLog(`  🖥️ 容器: ${containerWidth}×${containerHeight}px`);
        addLog(`  🔍 缩放: ${Math.round(pertState.scale * 100)}%`);
        addLog(`  📍 偏移: (${Math.round(pertState.offsetX)}, ${Math.round(pertState.offsetY)})`);
        addLog(`  ↔️ 边距: H=${marginH}px, V=${marginV}px`);
        addLog(`╚═══════════════════════════════════════════════════════════╝`);
    }

    // ==================== 导出到全局 ====================
    
    global.renderPertChart = renderPertChart;
    global.pertState = pertState;
    global.pertConfig = pertConfig;
    global.resetPertState = function() {
        pertState.scale = 1.0;
        pertState.offsetX = 0;
        pertState.offsetY = 0;
        pertState.selectedNode = null;
        pertState.isDragging = false;
        pertState.dragStartX = 0;
        pertState.dragStartY = 0;
        pertState.hoveredNode = null;
        pertState.isLinkingDependency = false;
        pertState.linkingFromTaskId = null;
        pertState.linkingFromHandle = null;
        pertState.tempLineElement = null;
    };

    console.log('✅ pert-chart.js loaded successfully (Epsilon2 - 可拖拽手柄)');

})(typeof window !== 'undefined' ? window : this);
