// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图依赖关系模块                                              ▓▓
// ▓▓ 路径: js/gantt/gantt-dependencies.js                           ▓▓
// ▓▓ 版本: Delta8 - 统一箭头样式（水平-斜线-水平）                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 渲染依赖关系
     * @param {Array<Object>} dates - 日期对象数组
     */
    GanttChart.prototype.renderDependencies = function(dates) {
        const depSVG = this.container.querySelector('.gantt-dependencies');
        
        if (!depSVG) {
            console.warn('GanttChart: Dependencies SVG not found');
            return;
        }

        const scale = this.options.timeScale || 'day';
        
        // 计算SVG总宽度
        const totalWidth = calculateTotalWidth(dates, this.options.cellWidth);

        depSVG.style.width = `${totalWidth}px`;
        depSVG.style.height = `${this.tasks.length * ROW_HEIGHT}px`;

        depSVG.innerHTML = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" 
                        markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
                </marker>
                <marker id="arrow-highlight" viewBox="0 0 10 10" refX="9" refY="5" 
                        markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
            </defs>
        `;

        if (!this.options.showDependencies) {
            return;
        }

        const paths = this.generateDependencyPaths();
        depSVG.innerHTML += paths;
    };

    /**
     * 生成依赖路径（统一样式：水平-斜线-水平）
     * @returns {string} SVG路径HTML字符串
     */
    GanttChart.prototype.generateDependencyPaths = function() {
        const scale = this.options.timeScale || 'day';
        const h = ROW_HEIGHT;
        const radius = 8;
        const paths = [];

        this.tasks.forEach((task, taskIndex) => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            // 遍历当前任务的所有前置依赖
            task.dependencies.forEach(depId => {
                const depTask = this.tasks.find(t => t.id === depId);
                if (!depTask) {
                    console.warn(`Dependency task not found: ${depId}`);
                    return;
                }
                
                const depIndex = this.tasks.findIndex(t => t.id === depId);
                
                // 统一使用天数计算位置
                const depStartDays = daysBetween(this.startDate, new Date(depTask.start));
                const depDurationDays = daysBetween(depTask.start, depTask.end) + 1;
                const taskStartDays = daysBetween(this.startDate, new Date(task.start));
                
                // ⭐ 前置任务的右侧位置
                const x1 = (depStartDays + depDurationDays) * this.options.cellWidth;
                const y1 = depIndex * h + h / 2;
                
                // ⭐ 后继任务的左侧位置
                const x2 = taskStartDays * this.options.cellWidth;
                const y2 = taskIndex * h + h / 2;
                
                // ⭐ 统一的箭头样式：水平出发 → 斜线 → 水平到达
                const gap = 5; // 箭头与任务条的间隙
                const horizontalLength = 30; // 水平段长度
                
                let coords;
                
                // 计算中间点
                const midX = (x1 + x2) / 2;
                
                if (depIndex === taskIndex) {
                    // ⭐ 同一行：简单的水平箭头
                    coords = [
                        {x: x1, y: y1},
                        {x: x2 - gap, y: y2}
                    ];
                } else {
                    // ⭐ 不同行：水平-斜线-水平
                    coords = [
                        {x: x1, y: y1},                              // 起点：前置任务右侧
                        {x: x1 + horizontalLength, y: y1},           // 水平向右
                        {x: x2 - horizontalLength, y: y2},           // 斜线到目标行
                        {x: x2 - gap, y: y2}                         // 水平到达后继任务
                    ];
                }

                // 生成圆角路径
                const dPath = createRoundedPath(coords, radius, false);
                
                // 数据属性：from是前置任务，to是后继任务
                paths.push(`<path data-from="${depId}" data-to="${task.id}" d="${dPath}" 
                                  stroke="#dc3545" fill="none" stroke-width="2" 
                                  marker-end="url(#arrow)" 
                                  class="dependency-arrow" />`);
            });
        });

        return paths.join('');
    };

    /**
     * 获取任务的所有前置依赖ID（递归）
     * @param {string} taskId - 任务ID
     * @returns {Set<string>} 所有前置依赖ID集合
     */
    GanttChart.prototype.getAllDependencies = function(taskId) {
        const deps = new Set();
        const visited = new Set();
        const stack = [taskId];
        let iterations = 0;
        const maxIterations = this.tasks.length * 10;

        while (stack.length && iterations < maxIterations) {
            iterations++;
            const current = stack.pop();
            
            if (visited.has(current)) continue;
            visited.add(current);

            const task = this.tasks.find(t => t.id === current);
            if (task && Array.isArray(task.dependencies)) {
                task.dependencies.forEach(dep => {
                    if (!deps.has(dep)) {
                        deps.add(dep);
                        stack.push(dep);
                    }
                });
            }
        }

        if (iterations >= maxIterations) {
            console.warn('Possible circular dependency detected');
        }

        deps.delete(taskId);
        return deps;
    };

    console.log('✅ gantt-dependencies.js loaded successfully (Delta8 - 统一箭头样式)');

})();
