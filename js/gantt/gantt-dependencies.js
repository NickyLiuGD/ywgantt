// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图依赖关系模块                                              ▓▓
// ▓▓ 路径: js/gantt/gantt-dependencies.js                           ▓▓
// ▓▓ 版本: Gamma11                                                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 渲染依赖关系
     * @param {Array<Date>} dates - 日期数组
     */
    GanttChart.prototype.renderDependencies = function(dates) {
        const depSVG = this.container.querySelector('.gantt-dependencies');
        
        if (!depSVG) {
            console.warn('GanttChart: Dependencies SVG not found');
            return;
        }

        depSVG.style.width = `${dates.length * this.options.cellWidth}px`;
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
     * 生成依赖路径
     * @returns {string} SVG路径HTML字符串
     */
    GanttChart.prototype.generateDependencyPaths = function() {
        const w = this.options.cellWidth;
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
                const depEndOffset = daysBetween(this.startDate, depTask.end);
                const taskStartOffset = daysBetween(this.startDate, task.start);
                
                const x1 = depEndOffset * w + w;
                const x2 = taskStartOffset * w;
                const y1 = depIndex * h + h / 2;
                const y2 = taskIndex * h + h / 2;
                const d = Math.abs(taskIndex - depIndex);

                let coords;
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

    console.log('✅ gantt-dependencies.js loaded successfully');

})();
