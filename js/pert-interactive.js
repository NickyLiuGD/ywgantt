// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 交互事件模块                                               ▓▓
// ▓▓ 路径: js/pert-interactive.js                                   ▓▓
// ▓▓ 版本: Epsilon29 - 完整版 (连线删除 + 坐标修正 + 悬停干扰修复)    ▓▓
// ▓▓ 职责: 手柄拖拽、节点选择、缩放平移、提示框、连线删除           ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 主事件绑定入口 ====================
    
    function attachPertInteractiveEvents(canvasSize) {
        const tooltip = document.getElementById('pertTooltip');
        const canvas = document.getElementById('pertCanvas');
        const nodes = document.querySelectorAll('.pert-node');
        
        if (!tooltip || !canvas) {
            console.warn('⚠️ PERT 交互元素未找到');
            return;
        }
        
        // 绑定手柄事件 (拖拽连线)
        attachHandleEvents();
        
        // 绑定节点事件 (悬停详情、选择)
        attachNodeEvents(nodes, tooltip, canvas);
        
        // 绑定工具栏按钮
        attachToolbarEvents(canvasSize);
        
        // 绑定画布事件 (平移、缩放、删除连线)
        attachCanvasEvents(canvas);
        
        // 绑定键盘事件 (ESC取消)
        attachKeyboardEvents();
        
        console.log('✅ PERT 交互事件已绑定 (Epsilon29 - 完整版)');
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
                // ⭐ 关键修复：阻止冒泡，防止触发父级 Node 的 tooltip
                e.stopPropagation();
                
                // 强制隐藏可能存在的节点提示框
                const tooltip = document.getElementById('pertTooltip');
                if (tooltip) tooltip.style.display = 'none';

                if (pertState.isLinkingDependency) {
                    // 拖拽中：检查是否可放置
                    if (canDropOnHandle(pertState.linkingFromTaskId, pertState.linkingFromHandle, taskId, side)) {
                        // 可放置样式：绿色高亮
                        circle.setAttribute('fill', pertConfig.handleActiveColor);
                        circle.setAttribute('stroke', pertConfig.handleActiveColor);
                        circle.setAttribute('r', pertConfig.handleSize / 2 + 2);
                        icon.setAttribute('fill', 'white');
                        glow.style.opacity = '1';
                        glow.setAttribute('fill', 'rgba(16, 185, 129, 0.4)');
                    }
                } else {
                    // 正常悬停样式：蓝色高亮
                    circle.setAttribute('stroke', pertConfig.handleHoverColor);
                    circle.setAttribute('stroke-width', '3');
                    icon.setAttribute('fill', pertConfig.handleHoverColor);
                    glow.style.opacity = '1';
                    label.style.opacity = '1';
                }
            });
            
            // 鼠标离开手柄
            handle.addEventListener('mouseleave', (e) => {
                // ⭐ 关键修复：阻止冒泡
                e.stopPropagation();

                if (!pertState.isLinkingDependency) {
                    // 恢复默认样式
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
                // 仅响应左键
                if (e.button !== 0) return;
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
    }

    /**
     * ⭐ 关键修复：创建临时连线
     * 将连线添加到 #pertContent 组中，而不是 SVG 根节点，使其能跟随缩放
     */
    function createTempLine(fromTaskId, fromHandle) {
        // 获取受缩放控制的内容组
        const contentGroup = document.getElementById('pertContent');
        if (!contentGroup) return;
        
        const fromNode = document.querySelector(`.pert-node[data-task-id="${fromTaskId}"]`);
        if (!fromNode) return;
        
        const transform = fromNode.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (!match) return;
        
        const nodeX = parseFloat(match[1]);
        const nodeY = parseFloat(match[2]);
        
        // 计算起始坐标（相对于 #pertContent）
        const startX = fromHandle === 'left' ? nodeX : nodeX + pertConfig.nodeWidth;
        const startY = nodeY + pertConfig.nodeHeight / 2;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('id', 'pertTempLine');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', startX); // 初始终点 = 起点
        line.setAttribute('y2', startY);
        line.setAttribute('stroke', '#06b6d4');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('marker-end', 'url(#pert-arrow-temp)');
        line.style.pointerEvents = 'none'; // 确保鼠标穿透连线，能触发下面的事件
        
        contentGroup.appendChild(line);
        pertState.tempLineElement = line;
    }

    /**
     * ⭐ 关键修复：更新临时连线位置
     * 引入 Scale 和 Offset 进行坐标逆变换，解决缩放后鼠标与连线箭头脱节的问题
     */
    function updateTempLine(e) {
        if (!pertState.tempLineElement) return;
        
        const svg = document.getElementById('pertSvg');
        if (!svg) return;
        
        const svgRect = svg.getBoundingClientRect();
        
        // 计算鼠标在 #pertContent 坐标系中的位置
        // 公式：(屏幕坐标 - SVG容器偏移 - 平移量) / 缩放比例
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
        
        // 规则：必须是 右(出) -> 左(入) 或者 左(入) -> 右(出)
        
        if (fromHandle === 'right' && toHandle === 'left') {
            const toTask = gantt.tasks.find(t => t.id === toTaskId);
            // 防止重复依赖
            if (toTask && toTask.dependencies && toTask.dependencies.some(d => (d.taskId || d) === fromTaskId)) {
                return false;
            }
            return true;
        }
        
        if (fromHandle === 'left' && toHandle === 'right') {
            const fromTask = gantt.tasks.find(t => t.id === fromTaskId);
            if (fromTask && fromTask.dependencies && fromTask.dependencies.some(d => (d.taskId || d) === toTaskId)) {
                return false;
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
            if (typeof addLog === 'function') addLog('❌ 无法建立连接：方向无效或依赖已存在');
            return;
        }
        
        // 确定依赖方向 (source -> target)
        // 我们统一逻辑：后继任务 依赖 前置任务
        let sourceTaskId, targetTaskId;
        
        if (fromHandle === 'right' && toHandle === 'left') {
            sourceTaskId = fromTaskId; // 前置
            targetTaskId = toTaskId;   // 后继
        } else if (fromHandle === 'left' && toHandle === 'right') {
            sourceTaskId = toTaskId;   // 前置
            targetTaskId = fromTaskId; // 后继
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
        
        // 使用全局校验函数进行循环依赖检查
        if (typeof canAddDependency === 'function') {
            const validation = canAddDependency(targetTaskId, sourceTaskId, gantt.tasks);
            if (!validation.canAdd) {
                alert(`无法添加依赖: ${validation.reason}`);
                cancelLinkingDependency();
                return;
            }
        }
        
        // 添加依赖
        if (!targetTask.dependencies) {
            targetTask.dependencies = [];
        }
        
        // 推入对象格式的依赖
        targetTask.dependencies.push({
            taskId: sourceTaskId,
            type: 'FS',
            lag: 0
        });
        
        if (typeof addLog === 'function') addLog(`✅ 已建立依赖：${targetTask.name} 依赖于 ${sourceTask.name}`);
            
        // 重新渲染 PERT 图
        if (typeof renderPertChart === 'function') {
            renderPertChart(gantt.tasks);
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
                // ⭐ 关键修复：如果正在连线，或者鼠标实际是在手柄上，不要显示节点信息框
                if (pertState.isLinkingDependency || e.target.closest('.pert-handle')) {
                    tooltip.style.display = 'none';
                    return;
                }

                pertState.hoveredNode = taskId;
                
                if (pertState.selectedNode !== taskId) {
                    rect.setAttribute('fill', 'url(#pert-nodeGradientHover)');
                    rect.setAttribute('stroke', '#5568d3');
                    rect.setAttribute('stroke-width', '3');
                    rect.style.transform = 'scale(1.02)'; // CSS transform
                }
                
                if (typeof highlightConnections === 'function') highlightConnections(taskId, 'hover');
                showPertTooltip(e, node, canvas);
            });
            
            // 鼠标在节点上移动
            node.addEventListener('mousemove', (e) => {
                // 拖拽连线时也不要更新 tooltip
                if (pertState.isLinkingDependency) return;
                updateTooltipPosition(e, canvas);
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
                        if (typeof highlightConnections === 'function') highlightConnections(pertState.selectedNode, 'selected');
                    } else {
                        if (typeof highlightConnections === 'function') highlightConnections(taskId, 'none');
                    }
                    tooltip.style.display = 'none';
                }
            });
            
            // 点击节点
            node.addEventListener('click', (e) => {
                // 如果点击的是手柄，不触发节点选择
                if (e.target.closest('.pert-handle')) return;
                e.stopPropagation();
                if (!pertState.isLinkingDependency && typeof selectPertNode === 'function') {
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
            t.dependencies && t.dependencies.some(d => {
                const id = typeof d === 'string' ? d : d.taskId;
                return id === node.dataset.taskId;
            })
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
        document.querySelectorAll('.pert-node .node-rect').forEach(r => {
            if (r !== rect) {
                r.setAttribute('fill', 'url(#pert-nodeGradient)');
                r.setAttribute('stroke', '#667eea');
                r.setAttribute('stroke-width', '2');
            }
        });
        
        pertState.selectedNode = taskId;
        rect.setAttribute('fill', 'url(#pert-nodeGradientSelected)');
        rect.setAttribute('stroke', '#ffc107');
        rect.setAttribute('stroke-width', '4');
        rect.style.transform = 'scale(1.05)';
        
        if (typeof highlightConnections === 'function') highlightConnections(taskId, 'selected');
        
        const task = gantt.tasks.find(t => t.id === taskId);
        if (task && typeof addLog === 'function') {
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
        
        if (typeof highlightConnections === 'function') highlightConnections(pertState.selectedNode, 'none');
        pertState.selectedNode = null;
        
        if (typeof addLog === 'function') addLog('✅ 已取消选中');
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
    
    function attachToolbarEvents(canvasSize) {
        const zoomInBtn = document.getElementById('pertZoomIn');
        const zoomOutBtn = document.getElementById('pertZoomOut');
        const resetBtn = document.getElementById('pertReset');
        const overviewBtn = document.getElementById('pertOverview');

        if (zoomInBtn) zoomInBtn.onclick = () => zoomPert(0.2);
        if (zoomOutBtn) zoomOutBtn.onclick = () => zoomPert(-0.2);
        if (resetBtn) resetBtn.onclick = () => resetPertView();
        if (overviewBtn) overviewBtn.onclick = () => switchPertToOverview(canvasSize.width, canvasSize.height);
        
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
    
    function attachCanvasEvents(canvas) {
        // 鼠标按下
        canvas.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pert-node') || e.target.closest('.pert-handle')) return;
            // ⭐ 关键修复：防止点连线时触发画布拖拽
            if (e.target.classList.contains('pert-connection')) return;
            
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
                if (typeof updatePertTransform === 'function') updatePertTransform();
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
                    if (typeof addLog === 'function') addLog('❌ 已取消依赖连线');
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
            if (typeof zoomPert === 'function') zoomPert(delta);
        }, { passive: false });

        // 点击空白取消选择
        canvas.addEventListener('click', (e) => {
            if (!e.target.closest('.pert-node') && !pertState.isLinkingDependency) {
                deselectPertNode();
            }
        });

        // ⭐ 新增：双击删除连线
        canvas.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('pert-connection')) {
                e.stopPropagation();
                handleDeleteConnection(e.target);
            }
        });
    }

    /**
     * ⭐ 新增：处理删除连线逻辑
     */
    function handleDeleteConnection(pathElement) {
        const toTaskId = pathElement.getAttribute('data-to');
        const originalFromId = pathElement.getAttribute('data-original-from');
        
        if (!toTaskId || !originalFromId) return;
        
        const toTask = gantt.tasks.find(t => t.id === toTaskId);
        const fromTask = gantt.tasks.find(t => t.id === originalFromId);
        
        if (!toTask || !fromTask) return;
        
        const confirmMsg = `确定要删除依赖关系吗？\n\n"${fromTask.name}" ➔ "${toTask.name}"`;
        
        if (confirm(confirmMsg)) {
            if (toTask.dependencies) {
                toTask.dependencies = toTask.dependencies.filter(dep => {
                    const id = typeof dep === 'string' ? dep : dep.taskId;
                    return id !== originalFromId;
                });
            }
            
            if (typeof addLog === 'function') {
                addLog(`🗑️ 已删除依赖: ${fromTask.name} ➔ ${toTask.name}`);
            }
            
            if (typeof renderPertChart === 'function') {
                renderPertChart(gantt.tasks);
            }
        }
    }

    function attachKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (pertState.isLinkingDependency) {
                    cancelLinkingDependency();
                    if (typeof addLog === 'function') addLog('❌ 已取消依赖连线 (ESC)');
                }
                if (pertState.selectedNode) {
                    deselectPertNode();
                }
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
            if (typeof addLog === 'function') addLog(`🔍 缩放: ${Math.round(pertState.scale * 100)}%`);
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
        if (typeof addLog === 'function') addLog('🔄 已重置 PERT 视图 (100%)');
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
        
        // 居中偏移
        const scaledWidth = contentWidth * pertState.scale;
        const scaledHeight = contentHeight * pertState.scale;
        pertState.offsetX = (containerWidth - scaledWidth) / 2;
        pertState.offsetY = (containerHeight - scaledHeight) / 2;
        
        // 扩展 SVG 尺寸以填充容器
        svg.setAttribute('width', Math.max(containerWidth, contentWidth));
        svg.setAttribute('height', Math.max(containerHeight, contentHeight));
        
        updatePertTransform();
        updateScaleDisplay();
        
        if (typeof addLog === 'function') {
            addLog(`🔭 PERT 全貌视图: ${Math.round(pertState.scale * 100)}%`);
        }
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

    console.log('✅ pert-interactive.js loaded successfully (Epsilon29 - 完整无省略版)');

})(typeof window !== 'undefined' ? window : this);