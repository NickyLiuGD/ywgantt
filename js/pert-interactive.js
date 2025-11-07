// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 交互事件模块                                               ▓▓
// ▓▓ 路径: js/pert-interactive.js                                   ▓▓
// ▓▓ 版本: Epsilon3 - 交互逻辑（拆分版 2/2）                        ▓▓
// ▓▓ 职责: 手柄拖拽、节点选择、缩放平移、提示框                     ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 主事件绑定入口 ====================
    
    /**
     * 绑定所有 PERT 交互事件
     * @param {Object} canvasSize - 画布大小
     */
    function attachPertInteractiveEvents(canvasSize) {
        const tooltip = document.getElementById('pertTooltip');
        const canvas = document.getElementById('pertCanvas');
        const nodes = document.querySelectorAll('.pert-node');
        
        if (!tooltip || !canvas) {
            console.warn('⚠️ PERT 交互元素未找到');
            return;
        }
        
        // 绑定手柄事件
        attachHandleEvents();
        
        // 绑定节点事件
        attachNodeEvents(nodes, tooltip, canvas);
        
        // 绑定工具栏按钮
        attachToolbarEvents(canvasSize);
        
        // 绑定画布事件
        attachCanvasEvents(canvas);
        
        // 绑定键盘事件
        attachKeyboardEvents();
        
        console.log('✅ PERT 交互事件已全部绑定');
    }

    // ==================== 手柄交互 ====================
    
    /**
     * 绑定手柄拖拽事件
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
                    // 拖拽中：检查是否可放置
                    if (canDropOnHandle(pertState.linkingFromTaskId, pertState.linkingFromHandle, taskId, side)) {
                        circle.setAttribute('fill', pertConfig.handleActiveColor);
                        circle.setAttribute('stroke', pertConfig.handleActiveColor);
                        circle.setAttribute('r', pertConfig.handleSize / 2 + 2);
                        icon.setAttribute('fill', 'white');
                        glow.style.opacity = '1';
                        glow.setAttribute('fill', 'rgba(16, 185, 129, 0.4)');
                        glow.setAttribute('r', pertConfig.handleSize / 2 + 4);
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
        
        // 高亮源节点
        const sourceNode = document.querySelector(`.pert-node[data-task-id="${fromTaskId}"]`);
        if (sourceNode) {
            sourceNode.classList.add('linking-source');
        }
        
        const task = gantt.tasks.find(t => t.id === fromTaskId);
        addLog(`🔗 开始创建依赖：从 "${task.name}" 的${fromHandle === 'left' ? '左侧' : '右侧'}手柄`);
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
        
        if (!canvas || !svg) return;
        
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
        
        // 右侧手柄 → 左侧手柄：fromTask 依赖 toTask
        if (fromHandle === 'right' && toHandle === 'left') {
            const toTask = gantt.tasks.find(t => t.id === toTaskId);
            if (toTask && toTask.dependencies && toTask.dependencies.includes(fromTaskId)) {
                return false; // 已存在反向依赖
            }
            return true;
        }
        
        // 左侧手柄 → 右侧手柄：toTask 依赖 fromTask
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
            addLog('❌ 无法建立此依赖关系（可能形成循环或重复）');
            return;
        }
        
        // 确定依赖方向
        let sourceTaskId, targetTaskId;
        
        if (fromHandle === 'right' && toHandle === 'left') {
            sourceTaskId = fromTaskId;
            targetTaskId = toTaskId;
        } else if (fromHandle === 'left' && toHandle === 'right') {
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
            
            // 同步更新甘特图
            if (gantt && typeof gantt.render === 'function') {
                gantt.calculateDateRange();
                gantt.render();
            }
        }
        
        cancelLinkingDependency();
    }

    /**
     * 取消依赖连线
     */
    function cancelLinkingDependency() {
        // 移除临时连线
        if (pertState.tempLineElement && pertState.tempLineElement.parentElement) {
            pertState.tempLineElement.parentElement.removeChild(pertState.tempLineElement);
        }
        
        // 移除源节点高亮
        document.querySelectorAll('.pert-node.linking-source').forEach(node => {
            node.classList.remove('linking-source');
        });
        
        // 重置状态
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

    // ==================== 节点交互 ====================
    
    /**
     * 绑定节点事件
     */
    function attachNodeEvents(nodes, tooltip, canvas) {
        nodes.forEach(node => {
            const taskId = node.dataset.taskId;
            const rect = node.querySelector('.node-rect');
            
            // 鼠标进入节点
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
            
            // 鼠标在节点上移动
            node.addEventListener('mousemove', (e) => {
                if (!pertState.isLinkingDependency) {
                    updateTooltipPosition(e, canvas);
                }
            });
            
            // 鼠标离开节点
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
            
            // 点击节点
            node.addEventListener('click', (e) => {
                if (e.target.closest('.pert-handle')) return;
                
                e.stopPropagation();
                
                if (!pertState.isLinkingDependency) {
                    selectPertNode(taskId, rect);
                }
            });
        });
    }

    /**
     * 显示节点提示信息
     */
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
                💡 拖拽 <span style="color: #06b6d4;">▶</span> 右手柄建立依赖
            </div>
        `;
        
        tooltip.style.display = 'block';
        updateTooltipPosition(e, canvas);
    }

    /**
     * 更新提示框位置
     */
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

    /**
     * 选中节点
     */
    function selectPertNode(taskId, rect) {
        // 取消其他节点的选中状态
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

    /**
     * 取消选中节点
     */
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

    /**
     * 高亮连接线
     */
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

    // ==================== 工具栏按钮 ====================
    
    /**
     * 绑定工具栏按钮事件
     */
    function attachToolbarEvents(canvasSize) {
        const zoomInBtn = document.getElementById('pertZoomIn');
        const zoomOutBtn = document.getElementById('pertZoomOut');
        const resetBtn = document.getElementById('pertReset');
        const overviewBtn = document.getElementById('pertOverview');

        if (zoomInBtn) zoomInBtn.onclick = () => zoomPert(0.2);
        if (zoomOutBtn) zoomOutBtn.onclick = () => zoomPert(-0.2);
        if (resetBtn) resetBtn.onclick = () => resetPertView();
        if (overviewBtn) overviewBtn.onclick = () => switchPertToOverview(canvasSize.width, canvasSize.height);
        
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

    // ==================== 画布交互 ====================
    
    /**
     * 绑定画布事件
     */
    function attachCanvasEvents(canvas) {
        // 鼠标按下
        canvas.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pert-node') || e.target.closest('.pert-handle')) return;
            
            pertState.isDragging = true;
            pertState.dragStartX = e.clientX - pertState.offsetX;
            pertState.dragStartY = e.clientY - pertState.offsetY;
            canvas.style.cursor = 'grabbing';
        });

        // 鼠标移动
        canvas.addEventListener('mousemove', (e) => {
            if (pertState.isLinkingDependency) {
                updateTempLine(e);
            } else if (pertState.isDragging) {
                pertState.offsetX = e.clientX - pertState.dragStartX;
                pertState.offsetY = e.clientY - pertState.dragStartY;
                updatePertTransform();
            }
        });

        // 鼠标释放
        canvas.addEventListener('mouseup', (e) => {
            if (pertState.isLinkingDependency) {
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
    }

    /**
     * 绑定键盘事件
     */
    function attachKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && pertState.isLinkingDependency) {
                cancelLinkingDependency();
                addLog('❌ 已取消依赖连线 (ESC)');
            }
        });
    }

    // ==================== 缩放与平移 ====================
    
    /**
     * 缩放 PERT 图
     */
    function zoomPert(delta) {
        const oldScale = pertState.scale;
        pertState.scale = Math.max(pertConfig.minScale, Math.min(pertConfig.maxScale, pertState.scale + delta));
        
        if (oldScale !== pertState.scale) {
            updatePertTransform();
            updateScaleDisplay();
            addLog(`🔍 缩放: ${Math.round(pertState.scale * 100)}%`);
        }
    }

    /**
     * 重置 PERT 视图
     */
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

    /**
     * 更新 PERT 变换
     */
    function updatePertTransform() {
        const content = document.getElementById('pertContent');
        if (content) {
            content.setAttribute('transform', 
                `translate(${pertState.offsetX}, ${pertState.offsetY}) scale(${pertState.scale})`);
        }
    }

    /**
     * 更新缩放显示
     */
    function updateScaleDisplay() {
        const scaleValue = document.getElementById('pertScaleValue');
        if (scaleValue) {
            scaleValue.textContent = Math.round(pertState.scale * 100) + '%';
        }
    }

    /**
     * 切换到 PERT 全貌视图
     */
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
    
    global.attachPertInteractiveEvents = attachPertInteractiveEvents;
    global.selectPertNode = selectPertNode;
    global.deselectPertNode = deselectPertNode;
    global.highlightConnections = highlightConnections;
    global.zoomPert = zoomPert;
    global.resetPertView = resetPertView;
    global.updatePertTransform = updatePertTransform;
    global.switchPertToOverview = switchPertToOverview;
    global.cancelLinkingDependency = cancelLinkingDependency;

    console.log('✅ pert-interactive.js loaded successfully (Epsilon3 - 交互逻辑)');

})(typeof window !== 'undefined' ? window : this);
