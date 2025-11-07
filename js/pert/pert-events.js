// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 图事件处理模块                                             ▓▓
// ▓▓ 路径: js/pert/pert-events.js                                   ▓▓
// ▓▓ 版本: Delta8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 绑定 PERT 图事件
     */
    PertChart.prototype.attachPertEvents = function() {
        // 节点点击事件
        this.container.querySelectorAll('.pert-node').forEach(node => {
            node.onclick = (e) => {
                const taskId = node.dataset.taskId;
                this.selectNode(taskId);
            };
        });

        // 工具栏按钮事件
        const zoomInBtn = document.getElementById('pertZoomIn');
        const zoomOutBtn = document.getElementById('pertZoomOut');
        const resetBtn = document.getElementById('pertReset');
        const overviewBtn = document.getElementById('pertOverview');

        if (zoomInBtn) {
            zoomInBtn.onclick = () => this.zoomIn();
        }

        if (zoomOutBtn) {
            zoomOutBtn.onclick = () => this.zoomOut();
        }

        if (resetBtn) {
            resetBtn.onclick = () => this.resetView();
        }

        if (overviewBtn) {
            overviewBtn.onclick = () => this.switchToOverviewMode();
        }

        // 画布拖拽事件
        const canvas = document.getElementById('pertCanvas');
        if (canvas && this.options.enableDrag) {
            this.attachCanvasDrag(canvas);
        }

        // 鼠标滚轮缩放
        if (canvas && this.options.enableZoom) {
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.zoom(delta);
            }, { passive: false });
        }
    };

    /**
     * 选中节点
     * @param {string} taskId - 任务ID
     */
    PertChart.prototype.selectNode = function(taskId) {
        this.selectedNode = taskId;
        
        // 更新节点样式
        this.container.querySelectorAll('.pert-node').forEach(node => {
            if (node.dataset.taskId === taskId) {
                node.classList.add('selected');
            } else {
                node.classList.remove('selected');
            }
        });

        // 高亮相关连接
        this.highlightConnections(taskId);

        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            addLog(`📌 已选中 PERT 节点: ${task.name}`);
        }
    };

    /**
     * 高亮相关连接线
     * @param {string} taskId - 任务ID
     */
    PertChart.prototype.highlightConnections = function(taskId) {
        this.container.querySelectorAll('.pert-connection').forEach(conn => {
            const from = conn.dataset.from;
            const to = conn.dataset.to;
            
            if (from === taskId || to === taskId) {
                conn.classList.add('highlight');
                conn.setAttribute('marker-end', 'url(#pert-arrow-highlight)');
            } else {
                conn.classList.remove('highlight');
                conn.setAttribute('marker-end', 'url(#pert-arrow)');
            }
        });
    };

    /**
     * 放大
     */
    PertChart.prototype.zoomIn = function() {
        this.zoom(0.2);
    };

    /**
     * 缩小
     */
    PertChart.prototype.zoomOut = function() {
        this.zoom(-0.2);
    };

    /**
     * 缩放
     * @param {number} delta - 缩放增量
     */
    PertChart.prototype.zoom = function(delta) {
        const newScale = this.scale + delta;
        
        if (newScale < PERT_CONFIG.MIN_SCALE || newScale > PERT_CONFIG.MAX_SCALE) {
            return;
        }
        
        this.scale = newScale;
        this.options.isOverviewMode = false;
        this.render();
        
        addLog(`🔍 缩放: ${Math.round(this.scale * 100)}%`);
    };

    /**
     * 重置视图
     */
    PertChart.prototype.resetView = function() {
        this.scale = 1.0;
        this.offset = { x: 0, y: 0 };
        this.options.isOverviewMode = false;
        this.render();
        addLog('🔄 已重置 PERT 视图');
    };

    /**
     * 绑定画布拖拽
     * @param {HTMLElement} canvas - 画布元素
     */
    PertChart.prototype.attachCanvasDrag = function(canvas) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startOffsetX = 0;
        let startOffsetY = 0;

        canvas.onmousedown = (e) => {
            if (e.target.closest('.pert-node')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startOffsetX = this.offset.x;
            startOffsetY = this.offset.y;
            canvas.style.cursor = 'grabbing';
        };

        canvas.onmousemove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.offset.x = startOffsetX + deltaX;
            this.offset.y = startOffsetY + deltaY;
            
            const content = document.getElementById('pertContent');
            if (content) {
                content.setAttribute('transform', 
                    `translate(${this.offset.x}, ${this.offset.y}) scale(${this.scale})`);
            }
        };

        canvas.onmouseup = () => {
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = 'grab';
            }
        };

        canvas.onmouseleave = () => {
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = 'grab';
            }
        };

        canvas.style.cursor = 'grab';
    };

    console.log('✅ pert-events.js loaded successfully');

})();
