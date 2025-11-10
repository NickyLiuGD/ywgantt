// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图依赖关系模块                                              ▓▓
// ▓▓ 路径: js/gantt/gantt-dependencies.js                           ▓▓
// ▓▓ 版本: Epsilon15 - 修复依赖格式兼容性                           ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
    'use strict';

    /**
     * 渲染依赖关系
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
        
        console.log(`✅ 已渲染 ${paths.split('<path').length - 1} 条依赖箭头`);
    };

    /**
     * 生成依赖路径（⭐ 修复依赖格式兼容性）
     */
    GanttChart.prototype.generateDependencyPaths = function() {
        const scale = this.options.timeScale || 'day';
        const h = ROW_HEIGHT;
        const radius = 8;
        const paths = [];

        this.tasks.forEach((task, taskIndex) => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            // ⭐ 兼容两种依赖格式：字符串数组 和 对象数组
            const depIds = task.dependencies.map(dep => {
                if (typeof dep === 'string') {
                    return dep; // 旧格式：直接是ID字符串
                } else if (typeof dep === 'object' && dep.taskId) {
                    return dep.taskId; // 新格式：对象包含 taskId
                }
                return null;
            }).filter(id => id);

            console.log(`任务 "${task.name}" 的依赖:`, depIds);

            // 遍历当前任务的所有前置依赖
            depIds.forEach(depId => {
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
                
                // 前置任务的右侧位置
                const x1 = (depStartDays + depDurationDays) * this.options.cellWidth;
                const y1 = depIndex * h + h / 2;
                
                // 后继任务的左侧位置
                const x2 = taskStartDays * this.options.cellWidth;
                const y2 = taskIndex * h + h / 2;
                
                // 统一的箭头样式：水平出发 → 斜线 → 水平到达
                const gap = 5;
                const horizontalLength = 30;
                
                let coords;
                
                if (depIndex === taskIndex) {
                    // 同一行：简单的水平箭头
                    coords = [
                        {x: x1, y: y1},
                        {x: x2 - gap, y: y2}
                    ];
                } else {
                    // 不同行：水平-斜线-水平
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + horizontalLength, y: y1},
                        {x: x2 - horizontalLength, y: y2},
                        {x: x2 - gap, y: y2}
                    ];
                }

                // 生成圆角路径
                const dPath = createRoundedPath(coords, radius, false);
                
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
                // ⭐ 兼容两种格式
                task.dependencies.forEach(dep => {
                    const depId = typeof dep === 'string' ? dep : (dep.taskId || dep);
                    if (depId && !deps.has(depId)) {
                        deps.add(depId);
                        stack.push(depId);
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

    console.log('✅ gantt-dependencies.js loaded successfully (Epsilon15 - 依赖格式兼容)');

})();
