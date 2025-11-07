// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 图核心类定义                                               ▓▓
// ▓▓ 路径: js/pert/pert-core.js                                     ▓▓
// ▓▓ 版本: Delta8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // PERT 图配置常量
    const PERT_CONFIG = {
        NODE_WIDTH: 140,
        NODE_HEIGHT: 90,
        HORIZONTAL_GAP: 180,
        VERTICAL_GAP: 120,
        PADDING: 50,
        MIN_SCALE: 0.3,
        MAX_SCALE: 2.0
    };

    /**
     * PertChart 构造函数
     * @param {string} selector - 容器选择器
     * @param {Array} tasks - 任务数组
     * @param {Object} options - 配置选项
     */
    function PertChart(selector, tasks, options) {
        if (!selector) {
            throw new Error('PertChart: selector is required');
        }

        this.selector = selector;
        this.tasks = Array.isArray(tasks) ? tasks : [];
        this.options = Object.assign({
            nodeWidth: PERT_CONFIG.NODE_WIDTH,
            nodeHeight: PERT_CONFIG.NODE_HEIGHT,
            horizontalGap: PERT_CONFIG.HORIZONTAL_GAP,
            verticalGap: PERT_CONFIG.VERTICAL_GAP,
            padding: PERT_CONFIG.PADDING,
            enableDrag: true,
            enableZoom: true,
            showCriticalPath: true,
            isOverviewMode: false
        }, options || {});

        this.selectedNode = null;
        this.scale = 1.0;
        this.offset = { x: 0, y: 0 };
        this.dragState = null;
        this.positions = {}; // 节点位置映射
        this.levels = [];    // 层级数组
        
        this.init();
    }

    /**
     * 初始化 PERT 图
     */
    PertChart.prototype.init = function() {
        this.container = document.querySelector(this.selector);
        
        if (!this.container) {
            console.error(`PertChart: Container "${this.selector}" not found`);
            return;
        }

        this.calculateLayout();
        this.render();
    };

    /**
     * 销毁实例
     */
    PertChart.prototype.destroy = function() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.tasks = null;
        this.container = null;
        this.positions = null;
        this.levels = null;
        
        console.log('PertChart instance destroyed');
    };

    // 导出到全局
    global.PertChart = PertChart;
    global.PERT_CONFIG = PERT_CONFIG;

    console.log('✅ pert-core.js loaded successfully');

})(typeof window !== 'undefined' ? window : this);
