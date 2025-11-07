// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 图渲染模块                                                 ▓▓
// ▓▓ 路径: js/pert/pert-render.js                                   ▓▓
// ▓▓ 版本: Delta8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 渲染 PERT 图
     */
    PertChart.prototype.render = function() {
        if (!this.container) {
            console.error('PertChart: Container not found');
            return;
        }

        // 创建 SVG 容器
        const svgWidth = this.canvasWidth * this.scale;
        const svgHeight = this.canvasHeight * this.scale;
        
        this.container.innerHTML = `
            <div class="pert-wrapper" id="pertWrapper">
                <div class="pert-toolbar">
                    <button class="pert-btn" id="pertZoomIn" title="放大">
                        <span class="pert-icon">🔍+</span>
                    </button>
                    <button class="pert-btn" id="pertZoomOut" title="缩小">
                        <span class="pert-icon">🔍-</span>
                    </button>
                    <button class="pert-btn" id="pertReset" title="重置视图">
                        <span class="pert-icon">🔄</span>
                    </button>
                    <button class="pert-btn pert-btn-overview" id="pertOverview" title="项目全貌">
                        <span class="pert-icon">🔭</span>
                    </button>
                    <span class="pert-scale-info">缩放: <strong id="pertScaleValue">100%</strong></span>
                </div>
                <div class="pert-canvas" id="pertCanvas">
                    <svg id="pertSvg" width="${svgWidth}" height="${svgHeight}">
                        <defs>
                            ${this.renderDefs()}
                        </defs>
                        <g id="pertContent" transform="translate(${this.offset.x}, ${this.offset.y}) scale(${this.scale})">
                            ${this.renderConnections()}
                            ${this.renderNodes()}
                        </g>
                    </svg>
                </div>
            </div>
        `;

        this.attachPertEvents();
        this.updateScaleDisplay();
    };

    /**
     * 渲染 SVG 定义（箭头、渐变等）
     */
    PertChart.prototype.renderDefs = function() {
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
            <marker id="pert-arrow-critical" viewBox="0 0 10 10" refX="9" refY="5" 
                    markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
            
            <!-- 节点渐变 -->
            <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.1" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.05" />
            </linearGradient>
            
            <!-- 选中节点渐变 -->
            <linearGradient id="nodeGradientSelected" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#ffc107;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#ff9800;stop-opacity:0.1" />
            </linearGradient>
        `;
    };

    /**
     * 渲染连接线（统一样式：水平-斜线-水平）
     */
    PertChart.prototype.renderConnections = function() {
        const connections = [];
        const nodeWidth = this.options.nodeWidth;
        const nodeHeight = this.options.nodeHeight;
        const gap = 10; // 箭头与节点的间隙
        const horizontalLength = 40; // 水平段长度
        
        this.tasks.forEach(task => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            task.dependencies.forEach(depId => {
                const fromPos = this.positions[depId];
                const toPos = this.positions[task.id];
                
                if (!fromPos || !toPos) return;
                
                // ⭐ 起点：前置任务右侧中心
                const x1 = fromPos.x + nodeWidth;
                const y1 = fromPos.y + nodeHeight / 2;
                
                // ⭐ 终点：后继任务左侧中心
                const x2 = toPos.x;
                const y2 = toPos.y + nodeHeight / 2;
                
                // ⭐ 统一路径：水平出发 → 斜线 → 水平到达
                let pathData = '';
                
                if (Math.abs(y2 - y1) < 5) {
                    // 同一水平线：直线连接
                    pathData = `M ${x1} ${y1} L ${x2 - gap} ${y2}`;
                } else {
                    // 不同水平线：水平-斜线-水平
                    const x1End = x1 + horizontalLength;
                    const x2Start = x2 - horizontalLength;
                    
                    pathData = `
                        M ${x1} ${y1}
                        L ${x1End} ${y1}
                        L ${x2Start} ${y2}
                        L ${x2 - gap} ${y2}
                    `;
                }
                
                connections.push(`
                    <path class="pert-connection" 
                          data-from="${depId}" 
                          data-to="${task.id}"
                          d="${pathData}"
                          stroke="#dc3545" 
                          stroke-width="2" 
                          fill="none"
                          marker-end="url(#pert-arrow)" />
                `);
            });
        });
        
        return connections.join('');
    };

    /**
     * 渲染节点
     */
    PertChart.prototype.renderNodes = function() {
        const nodes = [];
        const nodeWidth = this.options.nodeWidth;
        const nodeHeight = this.options.nodeHeight;
        
        this.tasks.forEach(task => {
            const pos = this.positions[task.id];
            if (!pos) return;
            
            const duration = daysBetween(task.start, task.end) + 1;
            const isSelected = this.selectedNode === task.id;
            
            nodes.push(`
                <g class="pert-node ${isSelected ? 'selected' : ''}" 
                   data-task-id="${task.id}"
                   transform="translate(${pos.x}, ${pos.y})">
                    
                    <!-- 节点矩形 -->
                    <rect width="${nodeWidth}" 
                          height="${nodeHeight}" 
                          rx="12" 
                          ry="12"
                          fill="url(#${isSelected ? 'nodeGradientSelected' : 'nodeGradient'})"
                          stroke="${isSelected ? '#ffc107' : '#667eea'}" 
                          stroke-width="${isSelected ? 3 : 2}"
                          class="node-rect" />
                    
                    <!-- 任务名称 -->
                    <text x="${nodeWidth / 2}" 
                          y="28" 
                          text-anchor="middle" 
                          font-size="14" 
                          font-weight="600"
                          fill="#333"
                          class="node-title">
                        ${this.truncateText(task.name, 16)}
                    </text>
                    
                    <!-- 分隔线 -->
                    <line x1="10" y1="40" x2="${nodeWidth - 10}" y2="40" 
                          stroke="#e0e0e0" stroke-width="1" />
                    
                    <!-- 工期信息 -->
                    <text x="${nodeWidth / 2}" 
                          y="56" 
                          text-anchor="middle" 
                          font-size="12"
                          fill="#666"
                          class="node-duration">
                        工期: ${duration}天
                    </text>
                    
                    <!-- 进度信息 -->
                    <text x="${nodeWidth / 2}" 
                          y="72" 
                          text-anchor="middle" 
                          font-size="12"
                          fill="#666"
                          class="node-progress">
                        进度: ${task.progress}%
                    </text>
                    
                    <!-- 日期范围 -->
                    <text x="${nodeWidth / 2}" 
                          y="${nodeHeight + 18}" 
                          text-anchor="middle" 
                          font-size="10"
                          fill="#999"
                          class="node-dates">
                        ${formatDate(new Date(task.start)).substring(5)} - ${formatDate(new Date(task.end)).substring(5)}
                    </text>
                </g>
            `);
        });
        
        return nodes.join('');
    };

    /**
     * 截断文本
     * @param {string} text - 文本
     * @param {number} maxLength - 最大长度
     * @returns {string} 截断后的文本
     */
    PertChart.prototype.truncateText = function(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 2) + '...';
    };

    /**
     * 更新缩放显示
     */
    PertChart.prototype.updateScaleDisplay = function() {
        const scaleValue = document.getElementById('pertScaleValue');
        if (scaleValue) {
            scaleValue.textContent = Math.round(this.scale * 100) + '%';
        }
    };

    console.log('✅ pert-render.js loaded successfully');

})();
