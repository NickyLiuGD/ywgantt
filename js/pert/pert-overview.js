// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 图全貌视图模块                                             ▓▓
// ▓▓ 路径: js/pert/pert-overview.js                                 ▓▓
// ▓▓ 版本: Delta8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * ⭐ 切换到 PERT 图全貌视图
     * 自动缩放以适应容器大小
     */
    PertChart.prototype.switchToOverviewMode = function() {
        if (this.tasks.length === 0) {
            addLog('❌ 无任务数据，无法切换到全貌视图');
            return;
        }

        const canvas = document.getElementById('pertCanvas');
        if (!canvas) {
            addLog('❌ 无法获取画布容器');
            return;
        }

        // 1. 获取容器尺寸
        const containerWidth = canvas.clientWidth;
        const containerHeight = canvas.clientHeight;
        
        // 2. 获取内容尺寸（包括所有节点和标签）
        const contentWidth = this.canvasWidth;
        const contentHeight = this.canvasHeight;
        
        // 3. 预留边距（确保节点和日期标签完全可见）
        const marginH = 40; // 水平边距
        const marginV = 60; // 垂直边距（考虑节点下方的日期标签）
        
        // 4. 计算缩放比例
        const scaleX = (containerWidth - marginH * 2) / contentWidth;
        const scaleY = (containerHeight - marginV * 2) / contentHeight;
        
        // 5. 取较小的缩放比例，确保完整显示
        let optimalScale = Math.min(scaleX, scaleY);
        
        // 6. 限制缩放范围
        optimalScale = Math.max(PERT_CONFIG.MIN_SCALE, Math.min(optimalScale, PERT_CONFIG.MAX_SCALE));
        
        // 7. 计算居中偏移
        const scaledWidth = contentWidth * optimalScale;
        const scaledHeight = contentHeight * optimalScale;
        
        const offsetX = (containerWidth - scaledWidth) / 2;
        const offsetY = (containerHeight - scaledHeight) / 2;
        
        // 8. 应用设置
        this.scale = optimalScale;
        this.offset = { x: offsetX, y: offsetY };
        this.options.isOverviewMode = true;
        
        // 9. 更新视图
        const content = document.getElementById('pertContent');
        if (content) {
            content.setAttribute('transform', 
                `translate(${this.offset.x}, ${this.offset.y}) scale(${this.scale})`);
        }
        
        this.updateScaleDisplay();
        
        // 10. 记录日志
        addLog(`╔═══════════════════════════════════════════════════════════╗`);
        addLog(`║  🔭 已切换到 PERT 全貌视图                                ║`);
        addLog(`╠═══════════════════════════════════════════════════════════╣`);
        addLog(`  📊 任务总数: ${this.tasks.length} 个`);
        addLog(`  📐 层级数量: ${this.levels.length} 层`);
        addLog(`  📏 内容尺寸: ${contentWidth} × ${contentHeight} px`);
        addLog(`  🖥️ 容器尺寸: ${containerWidth} × ${containerHeight} px`);
        addLog(`  🔍 缩放比例: ${Math.round(optimalScale * 100)}%`);
        addLog(`  📍 偏移位置: (${Math.round(offsetX)}, ${Math.round(offsetY)})`);
        addLog(`╚═══════════════════════════════════════════════════════════╝`);
    };

    /**
     * 计算关键路径（Critical Path Method）
     * @returns {Array<string>} 关键路径上的任务ID数组
     */
    PertChart.prototype.calculateCriticalPath = function() {
        // 简化版：返回最长路径
        const criticalPath = [];
        const taskMap = {};
        
        this.tasks.forEach(t => taskMap[t.id] = t);
        
        // 计算每个任务的最早开始时间和最晚开始时间
        // 这里简化处理，实际应该使用 CPM 算法
        
        // TODO: 实现完整的 CPM 算法
        
        return criticalPath;
    };

    console.log('✅ pert-overview.js loaded successfully');

})();
