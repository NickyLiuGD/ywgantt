// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用设置与视图切换模块                                          ▓▓
// ▓▓ 路径: js/app/app-settings.js                                   ▓▓
// ▓▓ 版本: Delta9 - PERT 对象化交互版                               ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 全局状态 ====================
    let isPertView = false;
    let pertState = {
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        selectedNode: null,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0
    };
    
    const toggleButton = document.getElementById('toggleView');
    const ganttContainer = document.getElementById('ganttContainer');
    const pertContainer = document.getElementById('pertContainer');

    // ==================== 视图切换主函数 ====================
    
    if (toggleButton && ganttContainer && pertContainer) {
        toggleButton.onclick = () => {
            isPertView = !isPertView;
            
            if (isPertView) {
                // 切换到 PERT 视图
                ganttContainer.style.display = 'none';
                pertContainer.style.display = 'block';
                
                renderPertChart(gantt.tasks);
                addLog('✅ 已切换到 PERT 视图');
                
            } else {
                // 切换回甘特图视图
                ganttContainer.style.display = 'block';
                pertContainer.style.display = 'none';
                
                // 清理 PERT 状态
                pertState.selectedNode = null;
                pertState.scale = 1.0;
                pertState.offsetX = 0;
                pertState.offsetY = 0;
                
                gantt.updateHeight();
                addLog('✅ 已切换到甘特图视图');
            }
            
            const btnText = toggleButton.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isPertView ? '甘特视图' : 'PERT视图';
            }
        };
    }

    // ==================== PERT 图表渲染（对象化版本）====================
    
    /**
     * 渲染 PERT 图表（完整对象化版本）
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
        
        // PERT 图配置
        const nodeWidth = 160;
        const nodeHeight = 100;
        const horizontalGap = 200;
        const verticalGap = 140;
        const padding = 60;
        
        // 计算节点层级
        const levels = calculateTaskLevels(tasks);
        const positions = {};
        
        // 计算节点位置
        levels.forEach((levelTasks, level) => {
            levelTasks.forEach((task, index) => {
                positions[task.id] = {
                    x: padding + level * (nodeWidth + horizontalGap),
                    y: padding + index * (nodeHeight + verticalGap),
                    task: task
                };
            });
        });
        
        // 计算画布尺寸
        const canvasWidth = padding * 2 + levels.length * (nodeWidth + horizontalGap) - horizontalGap;
        const canvasHeight = padding * 2 + Math.max(...levels.map(l => l.length)) * (nodeHeight + verticalGap) - verticalGap;
        
        // 创建容器结构
        pertContainer.innerHTML = `
            <div class="pert-wrapper" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
                <!-- 工具栏 -->
                <div class="pert-toolbar" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.95); border-bottom: 1px solid #dee2e6; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <button class="pert-btn" id="pertZoomIn" title="放大">
                        <span style="font-size: 1rem;">🔍+</span>
                    </button>
                    <button class="pert-btn" id="pertZoomOut" title="缩小">
                        <span style="font-size: 1rem;">🔍-</span>
                    </button>
                    <button class="pert-btn" id="pertReset" title="重置">
                        <span style="font-size: 1rem;">🔄</span>
                    </button>
                    <button class="pert-btn pert-btn-overview" id="pertOverview" title="项目全貌">
                        <span style="font-size: 1rem;">🔭</span> 全貌
                    </button>
                    <span style="margin-left: auto; font-size: 0.8rem; color: #6c757d;">
                        缩放: <strong id="pertScaleValue" style="color: #667eea;">100%</strong> | 
                        任务: <strong style="color: #667eea;">${tasks.length}</strong> | 
                        层级: <strong style="color: #667eea;">${levels.length}</strong>
                    </span>
                </div>
                
                <!-- 画布 -->
                <div class="pert-canvas" id="pertCanvas" style="flex: 1; overflow: auto; background: white; position: relative; cursor: grab;">
                    <svg id="pertSvg" width="${canvasWidth}" height="${canvasHeight}">
                        <defs>
                            ${renderPertDefs()}
                        </defs>
                        <g id="pertContent" transform="translate(0, 0) scale(1)">
                            ${renderPertConnections(tasks, positions, nodeWidth, nodeHeight)}
                            ${renderPertNodes(tasks, positions, nodeWidth, nodeHeight)}
                        </g>
                    </svg>
                </div>
                
                <!-- ⭐ 悬停提示框 -->
                <div id="pertTooltip" style="display: none; position: absolute; background: rgba(0,0,0,0.9); color: white; padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; pointer-events: none; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); backdrop-filter: blur(10px);"></div>
            </div>
        `;
        
        // 绑定事件
        attachPertEvents(positions, nodeWidth, nodeHeight, canvasWidth, canvasHeight);
        
        addLog(`✅ PERT 图表已渲染（${tasks.length} 个任务，${levels.length} 层）`);
    }

    /**
     * ⭐ 渲染 SVG 定义
     */
    function renderPertDefs() {
        return `
            <!-- 箭头标记 -->
            <marker id="pert-arrow" viewBox="0 0 10 10" refX="9" refY="5" 
                    markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
            </marker>
            <marker id="pert-arrow-highlight" viewBox="0 0 10 10" refX="9" refY="5" 
                    markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
            
            <!-- 节点渐变 -->
            <linearGradient id="pert-nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.15" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.05" />
            </linearGradient>
            
            <!-- 选中节点渐变 -->
            <linearGradient id="pert-nodeGradientSelected" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#ffc107;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#ff9800;stop-opacity:0.1" />
            </linearGradient>
            
            <!-- 悬停节点渐变 -->
            <linearGradient id="pert-nodeGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.25" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.15" />
            </linearGradient>
        `;
    }

    /**
     * ⭐ 渲染连接线（统一样式）
     */
    function renderPertConnections(tasks, positions, nodeWidth, nodeHeight) {
        const connections = [];
        const gap = 10;
        const hLength = 40;
        
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
                
                let pathData = '';
                if (Math.abs(y2 - y1) < 5) {
                    pathData = `M ${x1} ${y1} L ${x2 - gap} ${y2}`;
                } else {
                    pathData = `M ${x1} ${y1} L ${x1 + hLength} ${y1} L ${x2 - hLength} ${y2} L ${x2 - gap} ${y2}`;
                }
                
                connections.push(`
                    <path class="pert-connection" 
                          data-from="${depId}" 
                          data-to="${task.id}"
                          d="${pathData}"
                          stroke="#dc3545" 
                          stroke-width="2" 
                          fill="none"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          marker-end="url(#pert-arrow)"
                          style="transition: all 0.3s ease;" />
                `);
            });
        });
        
        return connections.join('');
    }

    /**
     * ⭐ 渲染节点（对象化版本）
     */
    function renderPertNodes(tasks, positions, nodeWidth, nodeHeight) {
        const nodes = [];
        
        tasks.forEach(task => {
            const pos = positions[task.id];
            if (!pos) return;
            
            const duration = daysBetween(task.start, task.end) + 1;
            const taskName = task.name.length > 18 ? task.name.substring(0, 16) + '...' : task.name;
            
            nodes.push(`
                <g class="pert-node" 
                   data-task-id="${task.id}"
                   data-task-name="${task.name}"
                   data-task-start="${task.start}"
                   data-task-end="${task.end}"
                   data-task-duration="${duration}"
                   data-task-progress="${task.progress}"
                   transform="translate(${pos.x}, ${pos.y})"
                   style="cursor: pointer; transition: all 0.3s ease;">
                    
                    <!-- 节点背景矩形 -->
                    <rect class="node-rect"
                          width="${nodeWidth}" 
                          height="${nodeHeight}" 
                          rx="12" 
                          ry="12"
                          fill="url(#pert-nodeGradient)"
                          stroke="#667eea" 
                          stroke-width="2"
                          style="transition: all 0.3s ease;" />
                    
                    <!-- 任务名称 -->
                    <text x="${nodeWidth / 2}" 
                          y="30" 
                          text-anchor="middle" 
                          font-size="15" 
                          font-weight="600"
                          fill="#333"
                          style="pointer-events: none;">
                        ${taskName}
                    </text>
                    
                    <!-- 分隔线 -->
                    <line x1="15" y1="45" x2="${nodeWidth - 15}" y2="45" 
                          stroke="#e0e0e0" stroke-width="1" />
                    
                    <!-- 工期信息 -->
                    <text x="${nodeWidth / 2}" 
                          y="63" 
                          text-anchor="middle" 
                          font-size="13"
                          fill="#666"
                          style="pointer-events: none;">
                        📅 工期: ${duration}天
                    </text>
                    
                    <!-- 进度信息 -->
                    <text x="${nodeWidth / 2}" 
                          y="80" 
                          text-anchor="middle" 
                          font-size="13"
                          fill="#666"
                          style="pointer-events: none;">
                        📊 进度: ${task.progress}%
                    </text>
                    
                    <!-- 进度条 -->
                    <rect x="15" 
                          y="${nodeHeight - 15}" 
                          width="${nodeWidth - 30}" 
                          height="6" 
                          rx="3"
                          fill="#e0e0e0" />
                    <rect x="15" 
                          y="${nodeHeight - 15}" 
                          width="${(nodeWidth - 30) * task.progress / 100}" 
                          height="6" 
                          rx="3"
                          fill="#667eea" />
                    
                    <!-- 日期范围（节点下方） -->
                    <text x="${nodeWidth / 2}" 
                          y="${nodeHeight + 20}" 
                          text-anchor="middle" 
                          font-size="11"
                          fill="#999"
                          style="pointer-events: none;">
                        ${formatDate(new Date(task.start)).substring(5)} ~ ${formatDate(new Date(task.end)).substring(5)}
                    </text>
                </g>
            `);
        });
        
        return nodes.join('');
    }

    /**
     * ⭐ 绑定 PERT 事件（对象化交互）
     */
    function attachPertEvents(positions, nodeWidth, nodeHeight, canvasWidth, canvasHeight) {
        const svg = document.getElementById('pertSvg');
        const canvas = document.getElementById('pertCanvas');
        const tooltip = document.getElementById('pertTooltip');
        const content = document.getElementById('pertContent');
        
        if (!svg || !canvas || !tooltip || !content) return;

        // ⭐ 节点悬停事件
        document.querySelectorAll('.pert-node').forEach(node => {
            const taskId = node.dataset.taskId;
            const rect = node.querySelector('.node-rect');
            
            // 鼠标进入节点
            node.addEventListener('mouseenter', (e) => {
                // 高亮节点
                rect.setAttribute('fill', 'url(#pert-nodeGradientHover)');
                rect.setAttribute('stroke', '#5568d3');
                rect.setAttribute('stroke-width', '3');
                rect.style.filter = 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.4))';
                
                // 高亮相关连接线
                highlightConnections(taskId, true);
                
                // 显示详细信息提示框
                showPertTooltip(e, node);
            });
            
            // 鼠标在节点上移动
            node.addEventListener('mousemove', (e) => {
                updateTooltipPosition(e);
            });
            
            // 鼠标离开节点
            node.addEventListener('mouseleave', () => {
                // 恢复节点样式
                if (pertState.selectedNode !== taskId) {
                    rect.setAttribute('fill', 'url(#pert-nodeGradient)');
                    rect.setAttribute('stroke', '#667eea');
                    rect.setAttribute('stroke-width', '2');
                    rect.style.filter = '';
                }
                
                // 取消高亮连接线
                highlightConnections(taskId, false);
                
                // 隐藏提示框
                tooltip.style.display = 'none';
            });
            
            // ⭐ 节点点击事件
            node.addEventListener('click', () => {
                selectPertNode(taskId, rect);
            });
        });

        // ⭐ 工具栏按钮事件
        const zoomInBtn = document.getElementById('pertZoomIn');
        const zoomOutBtn = document.getElementById('pertZoomOut');
        const resetBtn = document.getElementById('pertReset');
        const overviewBtn = document.getElementById('pertOverview');

        if (zoomInBtn) {
            zoomInBtn.onclick = () => zoomPert(0.2);
        }

        if (zoomOutBtn) {
            zoomOutBtn.onclick = () => zoomPert(-0.2);
        }

        if (resetBtn) {
            resetBtn.onclick = () => resetPertView();
        }

        if (overviewBtn) {
            overviewBtn.onclick = () => switchPertToOverview(canvasWidth, canvasHeight);
        }

        // ⭐ 画布拖拽事件
        canvas.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pert-node')) return;
            
            pertState.isDragging = true;
            pertState.dragStartX = e.clientX - pertState.offsetX;
            pertState.dragStartY = e.clientY - pertState.offsetY;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!pertState.isDragging) return;
            
            pertState.offsetX = e.clientX - pertState.dragStartX;
            pertState.offsetY = e.clientY - pertState.dragStartY;
            
            updatePertTransform();
        });

        canvas.addEventListener('mouseup', () => {
            pertState.isDragging = false;
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('mouseleave', () => {
            pertState.isDragging = false;
            canvas.style.cursor = 'grab';
        });

        // ⭐ 鼠标滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            zoomPert(delta);
        }, { passive: false });

        // 添加工具栏按钮样式
        document.querySelectorAll('.pert-btn').forEach(btn => {
            btn.style.cssText = `
                padding: 8px 14px;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.85rem;
                font-weight: 500;
                color: #495057;
                display: flex;
                align-items: center;
                gap: 6px;
            `;
        });

        const overviewBtn = document.getElementById('pertOverview');
        if (overviewBtn) {
            overviewBtn.style.cssText += `
                background: linear-gradient(135deg, rgba(16,185,129,0.05), rgba(6,182,212,0.05));
                border: 1px dashed rgba(16,185,129,0.4);
            `;
        }
    }

    /**
     * ⭐ 显示悬停提示框
     */
    function showPertTooltip(e, node) {
        const tooltip = document.getElementById('pertTooltip');
        if (!tooltip) return;
        
        const taskName = node.dataset.taskName;
        const taskStart = node.dataset.taskStart;
        const taskEnd = node.dataset.taskEnd;
        const taskDuration = node.dataset.taskDuration;
        const taskProgress = node.dataset.taskProgress;
        
        tooltip.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.95rem; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 6px;">
                ${taskName}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 0.8rem;">
                <span style="color: #aaa;">开始：</span><span>${taskStart}</span>
                <span style="color: #aaa;">结束：</span><span>${taskEnd}</span>
                <span style="color: #aaa;">工期：</span><span>${taskDuration} 天</span>
                <span style="color: #aaa;">进度：</span><span style="color: #10b981; font-weight: 600;">${taskProgress}%</span>
            </div>
        `;
        
        tooltip.style.display = 'block';
        updateTooltipPosition(e);
    }

    /**
     * ⭐ 更新提示框位置
     */
    function updateTooltipPosition(e) {
        const tooltip = document.getElementById('pertTooltip');
        if (!tooltip) return;
        
        const canvas = document.getElementById('pertCanvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        let x = e.clientX - canvasRect.left + 15;
        let y = e.clientY - canvasRect.top + 15;
        
        // 防止超出边界
        const tooltipRect = tooltip.getBoundingClientRect();
        if (x + tooltipRect.width > canvasRect.width) {
            x = e.clientX - canvasRect.left - tooltipRect.width - 15;
        }
        if (y + tooltipRect.height > canvasRect.height) {
            y = e.clientY - canvasRect.top - tooltipRect.height - 15;
        }
        
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    /**
     * ⭐ 选中节点
     */
    function selectPertNode(taskId, rect) {
        // 取消之前的选中
        document.querySelectorAll('.pert-node .node-rect').forEach(r => {
            if (r !== rect) {
                r.setAttribute('fill', 'url(#pert-nodeGradient)');
                r.setAttribute('stroke', '#667eea');
                r.setAttribute('stroke-width', '2');
                r.style.filter = '';
            }
        });
        
        // 选中当前节点
        pertState.selectedNode = taskId;
        rect.setAttribute('fill', 'url(#pert-nodeGradientSelected)');
        rect.setAttribute('stroke', '#ffc107');
        rect.setAttribute('stroke-width', '3');
        rect.style.filter = 'drop-shadow(0 6px 16px rgba(255, 193, 7, 0.5))';
        
        const task = gantt.tasks.find(t => t.id === taskId);
        if (task) {
            addLog(`📌 已选中 PERT 节点: ${task.name}`);
        }
    }

    /**
     * ⭐ 高亮相关连接线
     */
    function highlightConnections(taskId, highlight) {
        document.querySelectorAll('.pert-connection').forEach(conn => {
            const from = conn.dataset.from;
            const to = conn.dataset.to;
            
            if (from === taskId || to === taskId) {
                if (highlight) {
                    conn.setAttribute('stroke', '#10b981');
                    conn.setAttribute('stroke-width', '3');
                    conn.setAttribute('marker-end', 'url(#pert-arrow-highlight)');
                    conn.style.filter = 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))';
                } else {
                    conn.setAttribute('stroke', '#dc3545');
                    conn.setAttribute('stroke-width', '2');
                    conn.setAttribute('marker-end', 'url(#pert-arrow)');
                    conn.style.filter = '';
                }
            }
        });
    }

    /**
     * ⭐ 缩放 PERT 图
     */
    function zoomPert(delta) {
        pertState.scale = Math.max(0.3, Math.min(2.0, pertState.scale + delta));
        updatePertTransform();
        updateScaleDisplay();
        addLog(`🔍 缩放: ${Math.round(pertState.scale * 100)}%`);
    }

    /**
     * ⭐ 重置 PERT 视图
     */
    function resetPertView() {
        pertState.scale = 1.0;
        pertState.offsetX = 0;
        pertState.offsetY = 0;
        updatePertTransform();
        updateScaleDisplay();
        addLog('🔄 已重置 PERT 视图');
    }

    /**
     * ⭐ 更新变换
     */
    function updatePertTransform() {
        const content = document.getElementById('pertContent');
        if (content) {
            content.setAttribute('transform', 
                `translate(${pertState.offsetX}, ${pertState.offsetY}) scale(${pertState.scale})`);
        }
    }

    /**
     * ⭐ 更新缩放显示
     */
    function updateScaleDisplay() {
        const scaleValue = document.getElementById('pertScaleValue');
        if (scaleValue) {
            scaleValue.textContent = Math.round(pertState.scale * 100) + '%';
        }
    }

    /**
     * ⭐ 切换到 PERT 全貌视图
     */
    function switchPertToOverview(contentWidth, contentHeight) {
        const canvas = document.getElementById('pertCanvas');
        const svg = document.getElementById('pertSvg');
        if (!canvas || !svg) return;
        
        const containerWidth = canvas.clientWidth;
        const containerHeight = canvas.clientHeight;
        
        // 预留边距
        const marginH = 60;
        const marginV = 80;
        
        // 计算缩放比例
        const scaleX = (containerWidth - marginH * 2) / contentWidth;
        const scaleY = (containerHeight - marginV * 2) / contentHeight;
        pertState.scale = Math.min(scaleX, scaleY, 1.0);
        
        // 计算居中偏移
        const scaledWidth = contentWidth * pertState.scale;
        const scaledHeight = contentHeight * pertState.scale;
        pertState.offsetX = (containerWidth - scaledWidth) / 2;
        pertState.offsetY = (containerHeight - scaledHeight) / 2;
        
        // 调整 SVG 尺寸
        svg.setAttribute('width', containerWidth);
        svg.setAttribute('height', containerHeight);
        
        // 应用变换
        updatePertTransform();
        updateScaleDisplay();
        
        addLog(`╔═══════════════════════════════════════════════════════════╗`);
        addLog(`║  🔭 已切换到 PERT 全貌视图                                ║`);
        addLog(`╠═══════════════════════════════════════════════════════════╣`);
        addLog(`  📐 内容尺寸: ${contentWidth} × ${contentHeight} px`);
        addLog(`  🖥️ 容器尺寸: ${containerWidth} × ${containerHeight} px`);
        addLog(`  🔍 缩放比例: ${Math.round(pertState.scale * 100)}%`);
        addLog(`  📍 偏移位置: (${Math.round(pertState.offsetX)}, ${Math.round(pertState.offsetY)})`);
        addLog(`╚═══════════════════════════════════════════════════════════╝`);
    }

    /**
     * 辅助函数：计算任务层级（拓扑排序）
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
            
            tasks.forEach(t => {
                if (t.dependencies && t.dependencies.includes(taskId)) {
                    getLevel(t.id, currentLevel + 1);
                }
            });
        }
        
        tasks.forEach(task => {
            if (!task.dependencies || task.dependencies.length === 0) {
                getLevel(task.id, 0);
            }
        });
        
        return levels;
    }

    // 导出全局变量
    global.isPertView = isPertView;
    global.pertState = pertState;

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

    console.log('✅ app-settings.js loaded successfully (Delta9 - PERT对象化版)');

})(typeof window !== 'undefined' ? window : this);
