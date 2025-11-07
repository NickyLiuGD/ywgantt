// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用设置与视图切换模块                                          ▓▓
// ▓▓ 路径: js/app/app-settings.js                                   ▓▓
// ▓▓ 版本: Delta9 - 修复版（完全可工作）                            ▓▓
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

    console.log('🔧 app-settings.js 初始化');
    console.log('  toggleButton:', toggleButton);
    console.log('  ganttContainer:', ganttContainer);
    console.log('  pertContainer:', pertContainer);

    // ==================== 视图切换主函数 ====================
    
    if (toggleButton && ganttContainer && pertContainer) {
        toggleButton.onclick = () => {
            console.log('🔄 切换视图按钮被点击');
            console.log('  当前状态 isPertView:', isPertView);
            
            isPertView = !isPertView;
            console.log('  新状态 isPertView:', isPertView);
            
            if (isPertView) {
                // ⭐ 切换到 PERT 视图
                console.log('📊 开始切换到 PERT 视图...');
                
                ganttContainer.style.display = 'none';
                pertContainer.style.display = 'block';
                
                console.log('  ganttContainer.display:', ganttContainer.style.display);
                console.log('  pertContainer.display:', pertContainer.style.display);
                console.log('  任务数据:', gantt.tasks);
                
                try {
                    renderPertChart(gantt.tasks);
                    addLog('✅ 已切换到 PERT 视图');
                } catch (error) {
                    console.error('❌ PERT 渲染失败:', error);
                    addLog('❌ PERT 渲染失败: ' + error.message);
                    
                    // 显示错误信息
                    pertContainer.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #dc3545;">
                            <div style="text-align: center; padding: 20px;">
                                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                                <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">PERT 图渲染失败</div>
                                <div style="font-size: 0.9rem; color: #666;">${error.message}</div>
                                <div style="margin-top: 1rem; font-size: 0.8rem; color: #999;">请检查浏览器控制台查看详细错误</div>
                            </div>
                        </div>
                    `;
                }
                
            } else {
                // ⭐ 切换回甘特图视图
                console.log('📊 切换回甘特图视图...');
                
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
            
            // 更新按钮文字
            const btnText = toggleButton.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isPertView ? '甘特视图' : 'PERT视图';
            }
        };
        
        console.log('✅ 视图切换按钮事件已绑定');
    } else {
        console.error('❌ 视图切换按钮绑定失败，缺少必要元素');
    }

    // ==================== PERT 图表渲染（完整对象化版本）====================
    
    /**
     * 渲染 PERT 图表
     */
    function renderPertChart(tasks) {
        console.log('🎨 renderPertChart() 开始');
        console.log('  任务数量:', tasks ? tasks.length : 0);
        
        if (!pertContainer) {
            console.error('❌ pertContainer 不存在');
            throw new Error('pertContainer 不存在');
        }
        
        if (!tasks || tasks.length === 0) {
            console.warn('⚠️ 无任务数据');
            pertContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
                    <div style="text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                        <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">暂无任务数据</div>
                        <div style="font-size: 0.9rem;">请先在甘特图中添加任务</div>
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
        
        console.log('📐 计算任务层级...');
        const levels = calculateTaskLevels(tasks);
        console.log('  层级数:', levels.length);
        levels.forEach((level, i) => {
            console.log(`    第 ${i} 层: ${level.length} 个任务`);
        });
        
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
        
        console.log('  节点位置计算完成:', Object.keys(positions).length);
        
        // 计算画布尺寸
        const canvasWidth = padding * 2 + levels.length * (nodeWidth + horizontalGap) - horizontalGap;
        const canvasHeight = padding * 2 + Math.max(...levels.map(l => l.length)) * (nodeHeight + verticalGap) - verticalGap;
        
        console.log(`  画布尺寸: ${canvasWidth} × ${canvasHeight}`);
        
        // ⭐ 创建完整的 HTML 结构
        const html = `
            <div class="pert-wrapper" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
                <!-- 工具栏 -->
                <div class="pert-toolbar" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.95); border-bottom: 1px solid #dee2e6; box-shadow: 0 2px 8px rgba(0,0,0,0.05); flex-shrink: 0;">
                    <button class="pert-btn" id="pertZoomIn" title="放大" style="padding: 8px 14px; background: white; border: 1px solid #dee2e6; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 1rem;">🔍+</span>
                    </button>
                    <button class="pert-btn" id="pertZoomOut" title="缩小" style="padding: 8px 14px; background: white; border: 1px solid #dee2e6; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 1rem;">🔍-</span>
                    </button>
                    <button class="pert-btn" id="pertReset" title="重置" style="padding: 8px 14px; background: white; border: 1px solid #dee2e6; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 1rem;">🔄</span>
                    </button>
                    <button class="pert-btn pert-btn-overview" id="pertOverview" title="项目全貌" style="padding: 8px 14px; background: linear-gradient(135deg, rgba(16,185,129,0.05), rgba(6,182,212,0.05)); border: 1px dashed rgba(16,185,129,0.4); border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 1rem; color: #10b981;">🔭</span> 全貌
                    </button>
                    <span style="margin-left: auto; font-size: 0.8rem; color: #6c757d;">
                        缩放: <strong id="pertScaleValue" style="color: #667eea;">100%</strong> | 
                        任务: <strong style="color: #667eea;">${tasks.length}</strong> | 
                        层级: <strong style="color: #667eea;">${levels.length}</strong>
                    </span>
                </div>
                
                <!-- 画布 -->
                <div class="pert-canvas" id="pertCanvas" style="flex: 1; overflow: auto; background: white; position: relative; cursor: grab;">
                    <svg id="pertSvg" width="${canvasWidth}" height="${canvasHeight}" style="display: block;">
                        <defs>
                            <!-- 箭头标记 -->
                            <marker id="pert-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
                            </marker>
                            <marker id="pert-arrow-highlight" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                            </marker>
                            
                            <!-- 节点渐变 -->
                            <linearGradient id="pert-nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.15" />
                                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.05" />
                            </linearGradient>
                            <linearGradient id="pert-nodeGradientSelected" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#ffc107;stop-opacity:0.3" />
                                <stop offset="100%" style="stop-color:#ff9800;stop-opacity:0.1" />
                            </linearGradient>
                            <linearGradient id="pert-nodeGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.25" />
                                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.15" />
                            </linearGradient>
                        </defs>
                        <g id="pertContent">
                            <!-- 连接线将在这里绘制 -->
                            <!-- 节点将在这里绘制 -->
                        </g>
                    </svg>
                </div>
                
                <!-- 悬停提示框 -->
                <div id="pertTooltip" style="display: none; position: absolute; background: rgba(0,0,0,0.9); color: white; padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; pointer-events: none; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px;"></div>
            </div>
        `;
        
        console.log('✅ HTML 结构已创建');
        
        // 获取 SVG 内容组
        const svg = document.getElementById('pertSvg');
        const content = document.getElementById('pertContent');
        
        if (!svg || !content) {
            console.error('❌ SVG 元素未找到');
            throw new Error('SVG 元素未找到');
        }
        
        console.log('🔗 开始绘制连接线...');
        
        // ⭐ 绘制连接线
        const gap = 10;
        const hLength = 40;
        let connectionCount = 0;
        
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
                
                content.appendChild(path);
                connectionCount++;
            });
        });
        
        console.log(`✅ 绘制了 ${connectionCount} 条连接线`);
        console.log('📦 开始绘制节点...');
        
        // ⭐ 绘制节点
        let nodeCount = 0;
        
        tasks.forEach(task => {
            const pos = positions[task.id];
            if (!pos) return;
            
            const duration = daysBetween(task.start, task.end) + 1;
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
            
            // 节点矩形
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'node-rect');
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('rx', '12');
            rect.setAttribute('ry', '12');
            rect.setAttribute('fill', 'url(#pert-nodeGradient)');
            rect.setAttribute('stroke', '#667eea');
            rect.setAttribute('stroke-width', '2');
            rect.style.transition = 'all 0.3s ease';
            g.appendChild(rect);
            
            // 任务名称
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', nodeWidth / 2);
            text.setAttribute('y', '30');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '15');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#333');
            text.style.pointerEvents = 'none';
            text.textContent = taskName;
            g.appendChild(text);
            
            // 分隔线
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '15');
            line.setAttribute('y1', '45');
            line.setAttribute('x2', nodeWidth - 15);
            line.setAttribute('y2', '45');
            line.setAttribute('stroke', '#e0e0e0');
            line.setAttribute('stroke-width', '1');
            g.appendChild(line);
            
            // 工期信息
            const durationText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            durationText.setAttribute('x', nodeWidth / 2);
            durationText.setAttribute('y', '63');
            durationText.setAttribute('text-anchor', 'middle');
            durationText.setAttribute('font-size', '13');
            durationText.setAttribute('fill', '#666');
            durationText.style.pointerEvents = 'none';
            durationText.textContent = `📅 工期: ${duration}天`;
            g.appendChild(durationText);
            
            // 进度信息
            const progressText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            progressText.setAttribute('x', nodeWidth / 2);
            progressText.setAttribute('y', '80');
            progressText.setAttribute('text-anchor', 'middle');
            progressText.setAttribute('font-size', '13');
            progressText.setAttribute('fill', '#666');
            progressText.style.pointerEvents = 'none';
            progressText.textContent = `📊 进度: ${task.progress}%`;
            g.appendChild(progressText);
            
            // 进度条背景
            const progressBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            progressBg.setAttribute('x', '15');
            progressBg.setAttribute('y', nodeHeight - 15);
            progressBg.setAttribute('width', nodeWidth - 30);
            progressBg.setAttribute('height', '6');
            progressBg.setAttribute('rx', '3');
            progressBg.setAttribute('fill', '#e0e0e0');
            g.appendChild(progressBg);
            
            // 进度条
            const progressBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            progressBar.setAttribute('x', '15');
            progressBar.setAttribute('y', nodeHeight - 15);
            progressBar.setAttribute('width', (nodeWidth - 30) * task.progress / 100);
            progressBar.setAttribute('height', '6');
            progressBar.setAttribute('rx', '3');
            progressBar.setAttribute('fill', '#667eea');
            g.appendChild(progressBar);
            
            // 日期范围
            const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dateText.setAttribute('x', nodeWidth / 2);
            dateText.setAttribute('y', nodeHeight + 20);
            dateText.setAttribute('text-anchor', 'middle');
            dateText.setAttribute('font-size', '11');
            dateText.setAttribute('fill', '#999');
            dateText.style.pointerEvents = 'none';
            dateText.textContent = `${formatDate(new Date(task.start)).substring(5)} ~ ${formatDate(new Date(task.end)).substring(5)}`;
            g.appendChild(dateText);
            
            content.appendChild(g);
            nodeCount++;
        });
        
        console.log(`✅ 绘制了 ${nodeCount} 个节点`);
        console.log('🔗 绑定事件...');
        
        // 延迟绑定事件，确保 DOM 完全生成
        setTimeout(() => {
            attachPertEvents(positions, nodeWidth, nodeHeight, canvasWidth, canvasHeight);
        }, 100);
    }

    /**
     * ⭐ 绑定 PERT 事件
     */
    function attachPertEvents(positions, nodeWidth, nodeHeight, canvasWidth, canvasHeight) {
        console.log('🔗 attachPertEvents() 开始');
        
        const tooltip = document.getElementById('pertTooltip');
        const canvas = document.getElementById('pertCanvas');
        
        if (!tooltip || !canvas) {
            console.error('❌ tooltip 或 canvas 未找到');
            return;
        }
        
        // ⭐ 节点事件
        const nodes = document.querySelectorAll('.pert-node');
        console.log(`  找到 ${nodes.length} 个节点`);
        
        nodes.forEach(node => {
            const taskId = node.dataset.taskId;
            const rect = node.querySelector('.node-rect');
            
            // 鼠标进入
            node.addEventListener('mouseenter', (e) => {
                if (pertState.selectedNode !== taskId) {
                    rect.setAttribute('fill', 'url(#pert-nodeGradientHover)');
                    rect.setAttribute('stroke', '#5568d3');
                    rect.setAttribute('stroke-width', '3');
                    rect.style.filter = 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.4))';
                }
                
                highlightConnections(taskId, true);
                showPertTooltip(e, node, canvas);
            });
            
            // 鼠标移动
            node.addEventListener('mousemove', (e) => {
                updateTooltipPosition(e, canvas);
            });
            
            // 鼠标离开
            node.addEventListener('mouseleave', () => {
                if (pertState.selectedNode !== taskId) {
                    rect.setAttribute('fill', 'url(#pert-nodeGradient)');
                    rect.setAttribute('stroke', '#667eea');
                    rect.setAttribute('stroke-width', '2');
                    rect.style.filter = '';
                }
                
                highlightConnections(taskId, false);
                tooltip.style.display = 'none';
            });
            
            // 点击选中
            node.addEventListener('click', () => {
                selectPertNode(taskId, rect);
            });
        });
        
        console.log('✅ 节点事件已绑定');

        // ⭐ 工具栏按钮
        const zoomInBtn = document.getElementById('pertZoomIn');
        const zoomOutBtn = document.getElementById('pertZoomOut');
        const resetBtn = document.getElementById('pertReset');
        const overviewBtn = document.getElementById('pertOverview');

        if (zoomInBtn) {
            zoomInBtn.onclick = () => zoomPert(0.2);
            console.log('✅ 放大按钮已绑定');
        }

        if (zoomOutBtn) {
            zoomOutBtn.onclick = () => zoomPert(-0.2);
            console.log('✅ 缩小按钮已绑定');
        }

        if (resetBtn) {
            resetBtn.onclick = () => resetPertView();
            console.log('✅ 重置按钮已绑定');
        }

        if (overviewBtn) {
            overviewBtn.onclick = () => switchPertToOverview(canvasWidth, canvasHeight);
            console.log('✅ 全貌按钮已绑定');
        }

        // ⭐ 画布拖拽
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

        // ⭐ 滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            zoomPert(delta);
        }, { passive: false });

        console.log('✅ 所有事件已绑定');
    }

    /**
     * ⭐ 显示提示框
     */
    function showPertTooltip(e, node, canvas) {
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
                <span style="color: #aaa;">📅 开始：</span><span>${taskStart}</span>
                <span style="color: #aaa;">📅 结束：</span><span>${taskEnd}</span>
                <span style="color: #aaa;">⏱️ 工期：</span><span>${taskDuration} 天</span>
                <span style="color: #aaa;">📊 进度：</span><span style="color: #10b981; font-weight: 600;">${taskProgress}%</span>
            </div>
        `;
        
        tooltip.style.display = 'block';
        updateTooltipPosition(e, canvas);
    }

    /**
     * ⭐ 更新提示框位置
     */
    function updateTooltipPosition(e, canvas) {
        const tooltip = document.getElementById('pertTooltip');
        if (!tooltip || !canvas) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        
        let x = e.clientX - canvasRect.left + 15;
        let y = e.clientY - canvasRect.top + 15;
        
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
        // 取消所有选中
        document.querySelectorAll('.pert-node .node-rect').forEach(r => {
            if (r !== rect) {
                r.setAttribute('fill', 'url(#pert-nodeGradient)');
                r.setAttribute('stroke', '#667eea');
                r.setAttribute('stroke-width', '2');
                r.style.filter = '';
            }
        });
        
        // 选中当前
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
     * ⭐ 高亮连接线
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
     * ⭐ 缩放
     */
    function zoomPert(delta) {
        pertState.scale = Math.max(0.3, Math.min(2.0, pertState.scale + delta));
        updatePertTransform();
        updateScaleDisplay();
        addLog(`🔍 缩放: ${Math.round(pertState.scale * 100)}%`);
    }

    /**
     * ⭐ 重置视图
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
     * ⭐ 全貌视图
     */
    function switchPertToOverview(contentWidth, contentHeight) {
        const canvas = document.getElementById('pertCanvas');
        const svg = document.getElementById('pertSvg');
        if (!canvas || !svg) return;
        
        const containerWidth = canvas.clientWidth;
        const containerHeight = canvas.clientHeight;
        
        const marginH = 60;
        const marginV = 80;
        
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
        addLog(`║  🔭 已切换到 PERT 全貌视图                                ║`);
        addLog(`╠═══════════════════════════════════════════════════════════╣`);
        addLog(`  📐 内容尺寸: ${contentWidth} × ${contentHeight} px`);
        addLog(`  🖥️ 容器尺寸: ${containerWidth} × ${containerHeight} px`);
        addLog(`  🔍 缩放比例: ${Math.round(pertState.scale * 100)}%`);
        addLog(`  📍 偏移: (${Math.round(pertState.offsetX)}, ${Math.round(pertState.offsetY)})`);
        addLog(`╚═══════════════════════════════════════════════════════════╝`);
    }

    /**
     * 计算任务层级
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

    // ==================== 设置面板（保持原有代码）====================
    
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

    console.log('✅ app-settings.js loaded successfully (Delta9 - 完整可工作版)');

})(typeof window !== 'undefined' ? window : this);
