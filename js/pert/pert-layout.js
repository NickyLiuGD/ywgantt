// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ PERT 图布局算法模块                                             ▓▓
// ▓▓ 路径: js/pert/pert-layout.js                                   ▓▓
// ▓▓ 版本: Delta8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 计算任务层级（拓扑排序）
     * @returns {Array<Array>} 二维数组，每个子数组是一个层级的任务
     */
    PertChart.prototype.calculateLevels = function() {
        const levels = [];
        const taskMap = {};
        const inDegree = {}; // 入度计数
        const visited = new Set();
        
        // 初始化任务映射和入度
        this.tasks.forEach(task => {
            taskMap[task.id] = task;
            inDegree[task.id] = 0;
        });
        
        // 计算入度
        this.tasks.forEach(task => {
            if (task.dependencies && task.dependencies.length > 0) {
                task.dependencies.forEach(depId => {
                    if (taskMap[depId]) {
                        inDegree[task.id]++;
                    }
                });
            }
        });
        
        // ⭐ 拓扑排序（按层级分组）
        let currentLevel = 0;
        let remainingTasks = [...this.tasks];
        
        while (remainingTasks.length > 0) {
            // 找出当前层级的任务（入度为0的任务）
            const currentLevelTasks = remainingTasks.filter(task => inDegree[task.id] === 0);
            
            if (currentLevelTasks.length === 0) {
                console.warn('Circular dependency detected in PERT chart');
                break;
            }
            
            levels[currentLevel] = currentLevelTasks;
            
            // 标记已访问
            currentLevelTasks.forEach(task => {
                visited.add(task.id);
                
                // 减少后继任务的入度
                this.tasks.forEach(t => {
                    if (t.dependencies && t.dependencies.includes(task.id)) {
                        inDegree[t.id]--;
                    }
                });
            });
            
            // 移除已处理的任务
            remainingTasks = remainingTasks.filter(task => !visited.has(task.id));
            currentLevel++;
        }
        
        this.levels = levels;
        return levels;
    };

    /**
     * 计算节点位置
     */
    PertChart.prototype.calculateLayout = function() {
        const levels = this.calculateLevels();
        const positions = {};
        
        const nodeWidth = this.options.nodeWidth;
        const nodeHeight = this.options.nodeHeight;
        const hGap = this.options.horizontalGap;
        const vGap = this.options.verticalGap;
        const padding = this.options.padding;
        
        // 计算每个节点的位置
        levels.forEach((levelTasks, levelIndex) => {
            const levelHeight = levelTasks.length * (nodeHeight + vGap) - vGap;
            const startY = padding;
            
            levelTasks.forEach((task, taskIndex) => {
                positions[task.id] = {
                    x: padding + levelIndex * (nodeWidth + hGap),
                    y: startY + taskIndex * (nodeHeight + vGap),
                    level: levelIndex,
                    indexInLevel: taskIndex
                };
            });
        });
        
        this.positions = positions;
        
        // 计算画布尺寸
        this.canvasWidth = padding * 2 + levels.length * (nodeWidth + hGap) - hGap;
        this.canvasHeight = padding * 2 + Math.max(...levels.map(l => l.length)) * (nodeHeight + vGap) - vGap;
    };

    /**
     * 获取任务的层级
     * @param {string} taskId - 任务ID
     * @returns {number} 层级索引
     */
    PertChart.prototype.getTaskLevel = function(taskId) {
        const pos = this.positions[taskId];
        return pos ? pos.level : -1;
    };

    /**
     * 获取任务在层级中的索引
     * @param {string} taskId - 任务ID
     * @returns {number} 索引
     */
    PertChart.prototype.getTaskIndexInLevel = function(taskId) {
        const pos = this.positions[taskId];
        return pos ? pos.indexInLevel : -1;
    };

    console.log('✅ pert-layout.js loaded successfully');

})();
