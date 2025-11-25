// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 核心渲染模块                                               ▓▓
// ▓▓ 路径: js/pert-chart.js                                         ▓▓
// ▓▓ 版本: Epsilon25 - 完整版 (修复依赖对象格式兼容性问题)           ▓▓
// ▓▓ 职责: 布局算法、SVG绘制、手柄创建                              ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 状态管理 ====================
    
    /**
     * PERT 全局状态
     */
    const pertState = {
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        selectedNode: null,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        hoveredNode: null,
        // 依赖连线拖拽状态
        isLinkingDependency: false,
        linkingFromTaskId: null,
        linkingFromHandle: null,
        tempLineElement: null
    };

    /**
     * PERT 配置常量
     */
    const pertConfig = {
        nodeWidth: 160,
        nodeHeight: 100,
        horizontalGap: 200,
        verticalGap: 140,
        padding: 60,
        minScale: 0.3,
        maxScale: 2.0,
        handleSize: 16,
        handleColor: '#667eea',
        handleHoverColor: '#5568d3',
        handleActiveColor: '#10b981'
    };

    // ==================== 辅助函数 ====================

    /**
     * ⭐ 核心修复：安全提取依赖ID
     * 兼容字符串格式 ['id1'] 和对象格式 [{taskId:'id1'}]
     */
    function getDepId(dep) {
        if (typeof dep === 'string') return dep;
        if (typeof dep === 'object' && dep && dep.taskId) return dep.taskId;
        return null;
    }

    // ==================== 主渲染入口 ====================
    
    /**
     * 渲染 PERT 网络图（主入口）
     * @param {Array} tasks - 任务数组
     */
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
        
        // 计算布局
        const levels = calculateTaskLevels(tasks);
        const positions = calculateNodePositions(levels);
        const canvasSize = calculateCanvasSize(levels);
        
        // 创建 HTML 结构
        createPertHTML(tasks, levels, canvasSize);
        
        // 延迟绘制（确保 DOM 已生成）
        setTimeout(() => {
            drawPertGraph(tasks, positions, canvasSize);
            
            // 调用交互模块的事件绑定（由 pert-interactive.js 提供）
            if (typeof attachPertInteractiveEvents === 'function') {
                attachPertInteractiveEvents(canvasSize);
            }
        }, 50);
    }

    // ==================== 布局算法 ====================
    
    /**
     * 计算任务层级（拓扑排序 - Kahn算法）
     * @param {Array} tasks - 任务数组
     * @returns {Array<Array>} 层级数组，每层包含该层的任务
     */
    function calculateTaskLevels(tasks) {
        const levels = [];
        const visited = new Set();
        const taskMap = {};
        const inDegree = {};
        
        // 初始化：建立任务映射和入度表
        tasks.forEach(t => {
            taskMap[t.id] = t;
            inDegree[t.id] = 0;
        });
        
        // 计算入度
        tasks.forEach(task => {
            if (task.dependencies && task.dependencies.length > 0) {
                task.dependencies.forEach(dep => {
                    // ⭐ 修复：使用 getDepId 读取依赖
                    const depId = getDepId(dep);
                    if (depId && taskMap[depId]) {
                        inDegree[task.id]++;
                    }
                });
            }
        });
        
        // 拓扑排序
        let currentLevel = 0;
        let remainingTasks = [...tasks];
        
        while (remainingTasks.length > 0) {
            // 找出入度为0的任务（当前层级）
            const currentLevelTasks = remainingTasks.filter(task => inDegree[task.id] === 0);
            
            if (currentLevelTasks.length === 0) {
                console.warn('⚠️ 检测到循环依赖，将剩余任务放入最后一层');
                levels[currentLevel] = remainingTasks;
                break;
            }
            
            levels[currentLevel] = currentLevelTasks;
            
            // 更新入度
            currentLevelTasks.forEach(task => {
                visited.add(task.id);
                tasks.forEach(t => {
                    if (t.dependencies && t.dependencies.length > 0) {
                        // ⭐ 修复：检查 t 是否依赖 task.id
                        // 原逻辑直接比较字符串，现需兼容对象
                        const dependsOnCurrent = t.dependencies.some(d => getDepId(d) === task.id);
                        if (dependsOnCurrent) {
                            inDegree[t.id]--;
                        }
                    }
                });
            });
            
            remainingTasks = remainingTasks.filter(task => !visited.has(task.id));
            currentLevel++;
        }
        
        return levels;
    }

    /**
     * 计算节点位置
     * @param {Array<Array>} levels - 层级数组
     * @returns {Object} 位置映射 {taskId: {x, y, level, indexInLevel, task}}
     */
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

    /**
     * 计算画布大小
     * @param {Array<Array>} levels - 层级数组
     * @returns {Object} {width, height}
     */
    function calculateCanvasSize(levels) {
        const width = pertConfig.padding * 2 + 
                     levels.length * (pertConfig.nodeWidth + pertConfig.horizontalGap) - 
                     pertConfig.horizontalGap;
        
        const maxTasksInLevel = Math.max(...levels.map(l => l.length));
        const height = pertConfig.padding * 2 + 
                      maxTasksInLevel * (pertConfig.nodeHeight + pertConfig.verticalGap) - 
                      pertConfig.verticalGap;
        
        return { width, height };
    }

    // ==================== HTML 创建 ====================
    
    /**
     * 创建 PERT HTML 结构（工具栏 + 画布容器）
     * @param {Array} tasks - 任务数组
     * @param {Array<Array>} levels - 层级数组
     * @param {Object} canvasSize - 画布大小
     */
    function createPertHTML(tasks, levels, canvasSize) {
        const pertContainer = document.getElementById('pertContainer');
        
        pertContainer.innerHTML = `
            <div class="pert-wrapper" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; overflow: hidden; box-shadow: inset 0 0 20px rgba(0,0,0,0.05);">
                <!-- 工具栏 -->
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
                
                <!-- 画布容器 -->
                <div class="pert-canvas" id="pertCanvas" style="flex: 1; overflow: auto; background: white; position: relative; cursor: grab; box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);">
                    <div id="pertSvgContainer" style="width: 100%; height: 100%; min-width: ${canvasSize.width}px; min-height: ${canvasSize.height}px;"></div>
                </div>
                
                <!-- 提示框 -->
                <div id="pertTooltip" style="display: none; position: absolute; background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(33,37,41,0.95)); color: white; padding: 14px 18px; border-radius: 10px; font-size: 0.85rem; pointer-events: none; z-index: 2000; box-shadow: 0 8px 24px rgba(0,0,0,0.4); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); max-width: 320px;"></div>
                
                <!-- 底部提示 -->
                <div style="position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; pointer-events: none; opacity: 0.8;">
                    💡 提示：拖拽手柄建立依赖 | 悬停查看详情 | 滚轮缩放 | ESC取消
                </div>
            </div>
        `;
    }

    // ==================== SVG 绘制 ====================
    
    /**
     * 绘制 PERT 图形（SVG 主函数）
     * @param {Array} tasks - 任务数组
     * @param {Object} positions - 位置映射
     * @param {Object} canvasSize - 画布大小
     */
    function drawPertGraph(tasks, positions, canvasSize) {
        const svgContainer = document.getElementById('pertSvgContainer');
        if (!svgContainer) {
            console.error('❌ SVG 容器未找到');
            return;
        }
        
        // 创建 SVG 元素
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'pertSvg');
        svg.setAttribute('width', canvasSize.width);
        svg.setAttribute('height', canvasSize.height);
        svg.style.display = 'block';
        
        // 定义渐变、滤镜、箭头
        const defs = createSvgDefs();
        svg.appendChild(defs);
        
        // 创建内容组（用于缩放和平移）
        const content = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        content.setAttribute('id', 'pertContent');
        svg.appendChild(content);
        
        svgContainer.appendChild(svg);
        
        // 绘制连接线和节点
        drawConnections(tasks, positions, content);
        drawNodes(tasks, positions, content);
    }

    /**
     * 创建 SVG 定义（渐变、滤镜、箭头）
     * @returns {SVGDefsElement}
     */
    function createSvgDefs() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <!-- 箭头标记 -->
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
            
            <!-- 节点渐变 -->
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
            
            <!-- 阴影滤镜 -->
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
            
            <!-- 手柄发光滤镜 -->
            <filter id="pert-handleGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        `;
        return defs;
    }

    /**
     * 绘制连接线（任务依赖关系）
     * @param {Array} tasks - 任务数组
     * @param {Object} positions - 位置映射
     * @param {SVGElement} content - SVG 内容组
     */
    function drawConnections(tasks, positions, content) {
        const gap = 10;
        const hLength = 50;
        
        tasks.forEach(task => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            task.dependencies.forEach(dep => {
                // ⭐ 修复：使用 getDepId 提取依赖ID
                const depId = getDepId(dep);
                
                const from = positions[depId];
                const to = positions[task.id];
                if (!from || !to) return;
                
                // 计算起点和终点
                const x1 = from.x + pertConfig.nodeWidth;
                const y1 = from.y + pertConfig.nodeHeight / 2;
                const x2 = to.x;
                const y2 = to.y + pertConfig.nodeHeight / 2;
                
                // 生成路径（水平-斜线-水平）
                let pathData = '';
                if (Math.abs(y2 - y1) < 5) {
                    // 同一行：直线
                    pathData = `M ${x1} ${y1} L ${x2 - gap} ${y2}`;
                } else {
                    // 不同行：折线
                    pathData = `M ${x1} ${y1} L ${x1 + hLength} ${y1} L ${x2 - hLength} ${y2} L ${x2 - gap} ${y2}`;
                }
                
                // 创建路径元素
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

    /**
     * 绘制节点（任务卡片）
     * @param {Array} tasks - 任务数组
     * @param {Object} positions - 位置映射
     * @param {SVGElement} content - SVG 内容组
     */
    function drawNodes(tasks, positions, content) {
        tasks.forEach(task => {
            const pos = positions[task.id];
            if (!pos) return;
            
            const duration = (typeof daysBetween === 'function') ? 
                daysBetween(task.start, task.end) + 1 : 
                (task.duration || 1);
                
            const taskName = task.name.length > 18 ? task.name.substring(0, 16) + '...' : task.name;
            
            // 创建节点组
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
            
            // 节点背景矩形
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
            
            // 左侧手柄（接收依赖）
            const leftHandle = createHandle('left', pertConfig.nodeHeight / 2, task.id);
            g.appendChild(leftHandle);
            
            // 右侧手柄（创建依赖）
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
            
            const formatDateSafe = (d) => (typeof formatDate === 'function') ? formatDate(new Date(d)).substring(5) : '';
            const startStr = formatDateSafe(task.start);
            const endStr = formatDateSafe(task.end);
            dateText.textContent = `${startStr} ~ ${endStr}`;
            g.appendChild(dateText);
            
            content.appendChild(g);
        });
    }

    // ==================== 手柄创建 ====================
    
    /**
     * 创建拖拽手柄（左侧或右侧）
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
        
        // 外圈发光效果
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
        
        // 箭头图标
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
        
        // 提示文字
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

    // ==================== 导出到全局 ====================
    
    global.renderPertChart = renderPertChart;
    global.pertState = pertState;
    global.pertConfig = pertConfig;
    global.calculateTaskLevels = calculateTaskLevels;
    global.calculateNodePositions = calculateNodePositions;
    global.calculateCanvasSize = calculateCanvasSize;
    global.createHandle = createHandle;

    console.log('✅ pert-chart.js loaded successfully (Epsilon25 - 修复依赖对象格式)');

})(typeof window !== 'undefined' ? window : this);