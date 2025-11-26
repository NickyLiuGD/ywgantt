// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 核心渲染模块                                               ▓▓
// ▓▓ 路径: js/pert-chart.js                                         ▓▓
// ▓▓ 版本: Epsilon29 - 终极完整版 (无省略)                          ▓▓
// ▓▓ 包含: 布局算法、SVG绘制、手柄创建、交互属性注入                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 状态管理 ====================
    
    const pertState = {
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        selectedNode: null,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        hoveredNode: null,
        isLinkingDependency: false,
        linkingFromTaskId: null,
        linkingFromHandle: null,
        tempLineElement: null
    };

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

    // ==================== 核心辅助函数 ====================

    /**
     * 安全提取依赖ID
     * 兼容字符串格式 ['id1'] 和对象格式 [{taskId:'id1'}]
     */
    function getDepId(dep) {
        if (!dep) return null;
        if (typeof dep === 'string') return dep;
        if (typeof dep === 'object') return dep.taskId || null;
        return null;
    }

    /**
     * 获取有效的依赖目标 ID
     * 如果依赖的目标任务（子任务）在当前视图中不可见（因为父任务已折叠），
     * 则将依赖关系“重定向”到其可见的父任务上。
     */
    function resolveEffectiveId(rawDepId, displayTasks, allTasks) {
        if (typeof getEffectiveDependency === 'function') {
            const effectiveId = getEffectiveDependency(rawDepId, allTasks, displayTasks);
            return effectiveId || rawDepId;
        }
        return rawDepId;
    }

    // ==================== 主渲染入口 ====================
    
    function renderPertChart(allTasks) {
        const pertContainer = document.getElementById('pertContainer');
        
        if (!pertContainer) {
            console.error('❌ pertContainer 不存在');
            return;
        }
        
        // 空数据处理
        if (!allTasks || allTasks.length === 0) {
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
        
        console.log('🔄 开始计算 PERT 布局...');

        // 1. 数据过滤：准备用于显示的节点列表
        // 获取甘特图当前的可见任务 (处理折叠逻辑)
        let displayTasks = (typeof getVisibleTasks === 'function') ? 
                           getVisibleTasks(allTasks) : [...allTasks];

        // 进一步过滤：剔除"已展开的摘要任务"
        // 逻辑：如果父任务展开了，PERT图里只显示它的子任务（具体执行者），父任务本身作为容器不显示
        displayTasks = displayTasks.filter(t => {
            if (t.isSummary && !t.isCollapsed) {
                return false; 
            }
            return true;
        });

        if (displayTasks.length === 0) {
            pertContainer.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#666;">无可见任务节点</div>`;
            return;
        }

        // 2. 计算层级布局 (传入过滤后的列表进行排版，传入全量列表用于查询关系)
        const levels = calculateTaskLevels(displayTasks, allTasks);
        
        // 3. 计算坐标位置
        const positions = calculateNodePositions(levels);
        
        // 4. 计算画布尺寸
        const canvasSize = calculateCanvasSize(levels);
        
        // 5. 创建 HTML 结构 (工具栏等)
        createPertHTML(displayTasks, levels, canvasSize);
        
        // 6. 绘制图形 (延迟以确保 DOM 就绪)
        setTimeout(() => {
            // 传入 displayTasks 用于绘制节点，传入 allTasks 用于查找父级名称
            drawPertGraph(displayTasks, positions, canvasSize, allTasks);
            
            // 绑定交互事件 (调用外部模块)
            if (typeof attachPertInteractiveEvents === 'function') {
                attachPertInteractiveEvents(canvasSize);
            }
        }, 50);
    }

    // ==================== 布局算法 ====================
    
    /**
     * 计算任务层级（拓扑排序 - Kahn算法）
     */
    function calculateTaskLevels(displayTasks, allTasks) {
        const levels = [];
        const visited = new Set();
        const taskMap = {};
        const inDegree = {};
        
        // 初始化：建立任务映射和入度表
        displayTasks.forEach(t => {
            taskMap[t.id] = t;
            inDegree[t.id] = 0;
        });
        
        // 计算入度
        displayTasks.forEach(task => {
            // 获取该任务的聚合依赖（包括它内部子任务对外的依赖）
            let depsToCheck = [];
            if (typeof getAggregatedDependencies === 'function') {
                depsToCheck = getAggregatedDependencies(task.id, allTasks);
            } else if (task.dependencies) {
                depsToCheck = task.dependencies.map(d => getDepId(d));
            }

            if (depsToCheck.length > 0) {
                depsToCheck.forEach(rawDepId => {
                    // 重定向依赖到可见节点
                    const effectiveDepId = resolveEffectiveId(rawDepId, displayTasks, allTasks);
                    
                    // 只有当依赖的目标在当前显示列表中时，才增加入度
                    // 并且避免自环 (effectiveDepId !== task.id)
                    if (effectiveDepId && taskMap[effectiveDepId] && effectiveDepId !== task.id) {
                        inDegree[task.id]++;
                    }
                });
            }
        });
        
        // 拓扑排序循环
        let currentLevel = 0;
        let remainingTasks = [...displayTasks];
        
        while (remainingTasks.length > 0) {
            // 找出入度为0的任务
            const currentLevelTasks = remainingTasks.filter(task => inDegree[task.id] === 0);
            
            if (currentLevelTasks.length === 0) {
                console.warn('⚠️ 检测到循环依赖，将剩余任务放入最后一层');
                levels[currentLevel] = remainingTasks;
                break;
            }
            
            levels[currentLevel] = currentLevelTasks;
            
            // 更新入度
            currentLevelTasks.forEach(completedTask => {
                visited.add(completedTask.id);
                
                // 遍历剩余任务，减少依赖当前完成任务的入度
                remainingTasks.forEach(t => {
                    let depsToCheck = [];
                    if (typeof getAggregatedDependencies === 'function') {
                        depsToCheck = getAggregatedDependencies(t.id, allTasks);
                    } else if (t.dependencies) {
                        depsToCheck = t.dependencies.map(d => getDepId(d));
                    }

                    if (depsToCheck.length > 0) {
                        // 检查 t 是否依赖 completedTask (需经过 ID 重定向)
                        const dependsOnCurrent = depsToCheck.some(rawDepId => {
                            const effectiveId = resolveEffectiveId(rawDepId, displayTasks, allTasks);
                            return effectiveId === completedTask.id;
                        });
                        
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
    
    function createPertHTML(tasks, levels, canvasSize) {
        const pertContainer = document.getElementById('pertContainer');
        
        // ⭐ 确保这里使用 Flex 布局，不写死高度
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
                        <span>节点: <strong style="color: #667eea;">${tasks.length}</strong></span>
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
                    💡 提示：拖拽手柄建立依赖 | 悬停查看详情 | 滚轮缩放 | 双击连线删除
                </div>
            </div>
        `;
    }

    // ==================== SVG 绘制 ====================
    
    function drawPertGraph(displayTasks, positions, canvasSize, allTasks) {
        const svgContainer = document.getElementById('pertSvgContainer');
        if (!svgContainer) return;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'pertSvg');
        svg.setAttribute('width', canvasSize.width);
        svg.setAttribute('height', canvasSize.height);
        svg.style.display = 'block';
        
        const defs = createSvgDefs();
        svg.appendChild(defs);
        
        const content = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        content.setAttribute('id', 'pertContent');
        svg.appendChild(content);
        
        svgContainer.appendChild(svg);
        
        drawConnections(displayTasks, positions, content, allTasks);
        drawNodes(displayTasks, positions, content, allTasks);
    }

    function createSvgDefs() {
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
        return defs;
    }

    /**
     * 绘制连接线
     * ⭐ 增强版：支持聚合依赖、重定向、删除操作
     */
    function drawConnections(displayTasks, positions, content, allTasks) {
        const gap = 10;
        const hLength = 50;
        let connectionCount = 0;
        
        displayTasks.forEach(task => {
            // 获取聚合依赖 (包括被折叠子任务的依赖)
            let aggregatedDeps = [];
            if (typeof getAggregatedDependencies === 'function') {
                aggregatedDeps = getAggregatedDependencies(task.id, allTasks);
            } else if (task.dependencies) {
                aggregatedDeps = task.dependencies.map(d => getDepId(d));
            }
            
            if (aggregatedDeps.length === 0) return;
            
            aggregatedDeps.forEach(rawDepId => {
                // 重定向依赖到可见节点
                const effectiveDepId = resolveEffectiveId(rawDepId, displayTasks, allTasks);
                
                const from = positions[effectiveDepId];
                const to = positions[task.id];
                
                // 避免自环或无效连接
                if (!from || !to || from === to) return;
                
                // 计算起点和终点
                const x1 = from.x + pertConfig.nodeWidth;
                const y1 = from.y + pertConfig.nodeHeight / 2;
                const x2 = to.x;
                const y2 = to.y + pertConfig.nodeHeight / 2;
                
                // 生成路径（水平-斜线-水平）
                let pathData = '';
                if (Math.abs(y2 - y1) < 5) {
                    pathData = `M ${x1} ${y1} L ${x2 - gap} ${y2}`;
                } else {
                    pathData = `M ${x1} ${y1} L ${x1 + hLength} ${y1} L ${x2 - hLength} ${y2} L ${x2 - gap} ${y2}`;
                }
                
                // 创建路径元素
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'pert-connection');
                
                // ⭐ 关键：记录 ID，方便点击删除和高亮
                path.setAttribute('data-from', effectiveDepId); 
                path.setAttribute('data-to', task.id);
                // ⭐ 新增：记录原始依赖ID (因为如果是聚合依赖，rawDepId 才是真正存储在 task.dependencies 里的数据)
                path.setAttribute('data-original-from', rawDepId); 
                
                path.setAttribute('d', pathData);
                path.setAttribute('stroke', '#dc3545');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('marker-end', 'url(#pert-arrow)');
                
                // ⭐ 新增：交互样式属性，允许鼠标捕捉线条
                path.setAttribute('pointer-events', 'stroke');
                
                // ⭐ 新增：添加提示标题
                const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                const fromTask = allTasks.find(t => t.id === rawDepId);
                const fromName = fromTask ? fromTask.name : '未知任务';
                title.textContent = `${fromName} ➔ ${task.name} (双击删除)`;
                path.appendChild(title);
                
                path.style.transition = 'all 0.2s ease';
                path.style.opacity = '0.7';
                
                content.appendChild(path);
                connectionCount++;
            });
        });
        
        console.log(`✅ PERT 连线绘制完成，共 ${connectionCount} 条`);
    }

    /**
     * 绘制节点
     */
    function drawNodes(displayTasks, positions, content, allTasks) {
        displayTasks.forEach(task => {
            const pos = positions[task.id];
            if (!pos) return;
            
            const duration = (typeof daysBetween === 'function') ? 
                daysBetween(task.start, task.end) + 1 : 
                (task.duration || 1);
            
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
            
            // 背景
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'node-rect');
            rect.setAttribute('width', pertConfig.nodeWidth);
            rect.setAttribute('height', pertConfig.nodeHeight);
            rect.setAttribute('rx', '14');
            rect.setAttribute('fill', 'url(#pert-nodeGradient)');
            rect.setAttribute('stroke', '#667eea');
            rect.setAttribute('stroke-width', '2');
            rect.style.filter = 'url(#pert-nodeShadow)';
            g.appendChild(rect);
            
            // 手柄
            g.appendChild(createHandle('left', pertConfig.nodeHeight / 2, task.id));
            g.appendChild(createHandle('right', pertConfig.nodeHeight / 2, task.id));
            
            // 父任务标签
            let parentLabel = '';
            if (task.parentId && allTasks) {
                const parent = allTasks.find(t => t.id === task.parentId);
                if (parent) {
                    parentLabel = `📂 ${parent.name}`;
                }
            }

            if (parentLabel) {
                const parentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                parentText.setAttribute('x', pertConfig.nodeWidth / 2);
                parentText.setAttribute('y', '18');
                parentText.setAttribute('text-anchor', 'middle');
                parentText.setAttribute('font-size', '10');
                parentText.setAttribute('fill', '#6c757d');
                parentText.textContent = parentLabel;
                g.appendChild(parentText);
            }

            const textY = parentLabel ? '38' : '32';
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pertConfig.nodeWidth / 2);
            text.setAttribute('y', textY);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '14');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#2c3e50');
            text.textContent = taskName;
            g.appendChild(text);
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '20');
            line.setAttribute('y1', '50');
            line.setAttribute('x2', pertConfig.nodeWidth - 20);
            line.setAttribute('y2', '50');
            line.setAttribute('stroke', '#dee2e6');
            line.setAttribute('stroke-width', '1.5');
            g.appendChild(line);
            
            const infoText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            infoText.setAttribute('x', pertConfig.nodeWidth / 2);
            infoText.setAttribute('y', '68');
            infoText.setAttribute('text-anchor', 'middle');
            infoText.setAttribute('font-size', '13');
            infoText.setAttribute('fill', '#495057');
            infoText.textContent = `📅 ${duration}天  📊 ${task.progress}%`;
            g.appendChild(infoText);
            
            const pBarBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            pBarBg.setAttribute('x', '20');
            pBarBg.setAttribute('y', pertConfig.nodeHeight - 18);
            pBarBg.setAttribute('width', pertConfig.nodeWidth - 40);
            pBarBg.setAttribute('height', '6');
            pBarBg.setAttribute('rx', '3');
            pBarBg.setAttribute('fill', '#e9ecef');
            g.appendChild(pBarBg);
            
            const pBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            pBar.setAttribute('x', '20');
            pBar.setAttribute('y', pertConfig.nodeHeight - 18);
            pBar.setAttribute('width', Math.max((pertConfig.nodeWidth - 40) * task.progress / 100, 0));
            pBar.setAttribute('height', '6');
            pBar.setAttribute('rx', '3');
            pBar.setAttribute('fill', task.progress >= 100 ? '#10b981' : '#667eea');
            g.appendChild(pBar);
            
            const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dateText.setAttribute('x', pertConfig.nodeWidth / 2);
            dateText.setAttribute('y', pertConfig.nodeHeight + 18);
            dateText.setAttribute('text-anchor', 'middle');
            dateText.setAttribute('font-size', '10');
            dateText.setAttribute('fill', '#adb5bd');
            
            const formatDateSafe = (d) => (typeof formatDate === 'function') ? formatDate(new Date(d)).substring(5) : '';
            dateText.textContent = `${formatDateSafe(task.start)}~${formatDateSafe(task.end)}`;
            g.appendChild(dateText);
            
            content.appendChild(g);
        });
    }

    function createHandle(side, centerY, taskId) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `pert-handle pert-handle-${side}`);
        g.setAttribute('data-task-id', taskId);
        g.setAttribute('data-handle-side', side);
        g.style.cursor = 'crosshair';
        
        const x = side === 'left' ? 0 : pertConfig.nodeWidth;
        
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        glow.setAttribute('cx', x);
        glow.setAttribute('cy', centerY);
        glow.setAttribute('r', pertConfig.handleSize / 2 + 2);
        glow.setAttribute('fill', 'rgba(102, 126, 234, 0.2)');
        glow.setAttribute('class', 'handle-glow');
        glow.style.opacity = '0';
        g.appendChild(glow);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', centerY);
        circle.setAttribute('r', pertConfig.handleSize / 2);
        circle.setAttribute('fill', 'white');
        circle.setAttribute('stroke', pertConfig.handleColor);
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('class', 'handle-circle');
        g.appendChild(circle);
        
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        icon.setAttribute('x', x);
        icon.setAttribute('y', centerY);
        icon.setAttribute('text-anchor', 'middle');
        icon.setAttribute('dominant-baseline', 'central');
        icon.setAttribute('font-size', '10');
        icon.setAttribute('fill', pertConfig.handleColor);
        icon.setAttribute('class', 'handle-icon');
        icon.textContent = side === 'left' ? '◀' : '▶';
        icon.style.pointerEvents = 'none';
        g.appendChild(icon);
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', side === 'left' ? x - 20 : x + 20);
        label.setAttribute('y', centerY);
        label.setAttribute('text-anchor', side === 'left' ? 'end' : 'start');
        label.setAttribute('dominant-baseline', 'central');
        label.setAttribute('font-size', '11');
        label.setAttribute('fill', '#667eea');
        label.setAttribute('class', 'handle-label');
        label.textContent = side === 'left' ? '被依赖' : '依赖';
        label.style.opacity = '0';
        label.style.pointerEvents = 'none';
        g.appendChild(label);
        
        return g;
    }

    // ==================== 导出到全局 ====================
    global.renderPertChart = renderPertChart;
    global.pertState = pertState;
    global.pertConfig = pertConfig;
    global.calculateTaskLevels = calculateTaskLevels;
    global.calculateNodePositions = calculateNodePositions;
    global.calculateCanvasSize = calculateCanvasSize;
    global.createHandle = createHandle;

    console.log('✅ pert-chart.js loaded successfully (Epsilon29 - 终极完整版)');

})(typeof window !== 'undefined' ? window : this);