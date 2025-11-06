// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图依赖关系模块                                              ▓▓
// ▓▓ 路径: js/gantt/gantt-dependencies.js                           ▓▓
// ▓▓ 版本: Delta6 - 支持时间刻度缩放                                ▓▓
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
        let totalWidth;
        
        if (scale === 'day') {
            totalWidth = dates.length * this.options.cellWidth;
        } else {
            totalWidth = dates.reduce((sum, dateObj) => sum + (this.options.cellWidth * dateObj.span), 0);
        }

        depSVG.style.width = `${totalWidth}px`;
        depSVG.style.height = `${this.tasks.length * ROW_HEIGHT}px`;

        depSVG.innerHTML = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" 
                        markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
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
     * 生成依赖路径（支持不同时间刻度）
     * @returns {string} SVG路径HTML字符串
     */
    GanttChart.prototype.generateDependencyPaths = function() {
        const scale = this.options.timeScale || 'day';
        const h = ROW_HEIGHT;
        const radius = 8;
        const paths = [];

        this.tasks.forEach((task, taskIndex) => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            task.dependencies.forEach(depId => {
                const depTask = this.tasks.find(t => t.id === depId);
                if (!depTask) {
                    console.warn(`Dependency task not found: ${depId}`);
                    return;
                }
                
                const depIndex = this.tasks.findIndex(t => t.id === depId);
                
                // ⭐ 根据时间刻度计算位置
                let depPosition, taskPosition;
                
                if (scale === 'day') {
                    const depEndOffset = daysBetween(this.startDate, depTask.end);
                    const depDuration = daysBetween(depTask.start, depTask.end) + 1;
                    const taskStartOffset = daysBetween(this.startDate, task.start);
                    
                    depPosition = {
                        left: depEndOffset * this.options.cellWidth,
                        width: depDuration * this.options.cellWidth
                    };
                    taskPosition = {
                        left: taskStartOffset * this.options.cellWidth,
                        width: 0
                    };
                } else {
                    depPosition = calculateTaskPosition(depTask, this.startDate, scale, this.options.cellWidth);
                    taskPosition = calculateTaskPosition(task, this.startDate, scale, this.options.cellWidth);
                }
                
                const x1 = depPosition.left + depPosition.width;
                const x2 = taskPosition.left;
                const y1 = depIndex * h + h / 2;
                const y2 = taskIndex * h + h / 2;
                const d = Math.abs(taskIndex - depIndex);

                let coords;
                const w = this.options.cellWidth;
                
                if (depIndex < taskIndex) {
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + w / 2, y: y1},
                        {x: x1 + w / 2, y: y1 + h / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y1 + h / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y2},
                        {x: x2, y: y2}
                    ];
                } else if (depIndex > taskIndex) {
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + w / 2, y: y1},
                        {x: x1 + w / 2, y: y1 - h / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y1 - h / 8},
                        {x: x1 + w / 2 - (w / (2 * d) + w / 2), y: y2},
                        {x: x2, y: y2}
                    ];
                } else {
                    const sign = x2 > x1 ? 1 : -1;
                    const bend = 15;
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + sign * bend, y: y1},
                        {x: x1 + sign * bend, y: y2},
                        {x: x2, y: y2}
                    ];
                }

                const dPath = createRoundedPath(coords, radius, false);
                paths.push(`<path data-from="${depId}" data-to="${task.id}" d="${dPath}" 
                                  stroke="#dc3545" fill="none" stroke-width="2" 
                                  marker-end="url(#arrow)" />`);
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

    console.log('✅ gantt-dependencies.js loaded successfully (Delta6 - 支持时间刻度)');

})();
