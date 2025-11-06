// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图依赖关系模块                                              ▓▓
// ▓▓ 路径: js/gantt/gantt-dependencies.js                           ▓▓
// ▓▓ 版本: Delta6 - 修复箭头位置计算                                ▓▓
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
        
        // ⭐ 计算SVG总宽度（使用工具函数）
        const totalWidth = calculateTotalWidth(dates, this.options.cellWidth);

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
     * 生成依赖路径（修复版 - 正确的箭头方向和位置）
     * @returns {string} SVG路径HTML字符串
     */
    GanttChart.prototype.generateDependencyPaths = function() {
        const scale = this.options.timeScale || 'day';
        const h = ROW_HEIGHT;
        const radius = 8;
        const paths = [];

        this.tasks.forEach((task, taskIndex) => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            // ⭐ 遍历当前任务的所有前置依赖
            task.dependencies.forEach(depId => {
                const depTask = this.tasks.find(t => t.id === depId);
                if (!depTask) {
                    console.warn(`Dependency task not found: ${depId}`);
                    return;
                }
                
                const depIndex = this.tasks.findIndex(t => t.id === depId);
                
                // ⭐ 统一使用天数计算位置（与任务条计算保持一致）
                const depStartDays = daysBetween(this.startDate, new Date(depTask.start));
                const depDurationDays = daysBetween(depTask.start, depTask.end) + 1;
                const taskStartDays = daysBetween(this.startDate, new Date(task.start));
                
                // ⭐ 前置任务的右侧位置
                const x1 = (depStartDays + depDurationDays) * this.options.cellWidth;
                const y1 = depIndex * h + h / 2;
                
                // ⭐ 后继任务的左侧位置
                const x2 = taskStartDays * this.options.cellWidth;
                const y2 = taskIndex * h + h / 2;
                
                // 计算垂直距离（行数差）
                const rowDiff = Math.abs(taskIndex - depIndex);
                
                // 生成路径坐标
                let coords;
                const w = this.options.cellWidth * 7; // 基准宽度（约一周）
                const gap = 5; // 箭头与任务条的间隙
                
                if (depIndex < taskIndex) {
                    // ⭐ 前置任务在上方（向下的箭头）
                    if (x2 > x1) {
                        // 情况1：后继任务在前置任务右侧（正常流程）
                        const midX = (x1 + x2) / 2;
                        coords = [
                            {x: x1, y: y1},                    // 起点：前置任务右侧
                            {x: midX, y: y1},                  // 水平向右到中点
                            {x: midX, y: y2},                  // 垂直向下
                            {x: x2 - gap, y: y2}               // 水平到后继任务左侧
                        ];
                    } else {
                        // 情况2：后继任务在前置任务左侧（回折）
                        const bendOut = Math.min(w / 4, 30);
                        const bendDown = h / 3;
                        coords = [
                            {x: x1, y: y1},                    // 起点
                            {x: x1 + bendOut, y: y1},          // 向右弯出
                            {x: x1 + bendOut, y: y1 + bendDown}, // 向下
                            {x: x2 - bendOut, y: y2 - bendDown}, // 向左下
                            {x: x2 - bendOut, y: y2},          // 向下
                            {x: x2 - gap, y: y2}               // 到达后继任务
                        ];
                    }
                } else if (depIndex > taskIndex) {
                    // ⭐ 前置任务在下方（向上的箭头）
                    if (x2 > x1) {
                        // 情况1：后继任务在前置任务右侧
                        const midX = (x1 + x2) / 2;
                        coords = [
                            {x: x1, y: y1},                    // 起点
                            {x: midX, y: y1},                  // 水平向右
                            {x: midX, y: y2},                  // 垂直向上
                            {x: x2 - gap, y: y2}               // 到达后继任务
                        ];
                    } else {
                        // 情况2：后继任务在前置任务左侧
                        const bendOut = Math.min(w / 4, 30);
                        const bendUp = h / 3;
                        coords = [
                            {x: x1, y: y1},                    // 起点
                            {x: x1 + bendOut, y: y1},          // 向右弯出
                            {x: x1 + bendOut, y: y1 - bendUp}, // 向上
                            {x: x2 - bendOut, y: y2 + bendUp}, // 向左上
                            {x: x2 - bendOut, y: y2},          // 向上
                            {x: x2 - gap, y: y2}               // 到达后继任务
                        ];
                    }
                } else {
                    // ⭐ 前置任务和后继任务在同一行（水平箭头）
                    if (x2 > x1) {
                        // 情况1：后继任务在右侧（直线）
                        coords = [
                            {x: x1, y: y1},
                            {x: x2 - gap, y: y2}
                        ];
                    } else {
                        // 情况2：后继任务在左侧（弧形回折）
                        const bendHeight = h / 2;
                        const bendOut = Math.min(w / 6, 20);
                        coords = [
                            {x: x1, y: y1},                    // 起点
                            {x: x1 + bendOut, y: y1},          // 向右
                            {x: x1 + bendOut, y: y1 - bendHeight}, // 向上弯
                            {x: x2 - bendOut, y: y2 - bendHeight}, // 弧顶向左
                            {x: x2 - bendOut, y: y2},          // 向下
                            {x: x2 - gap, y: y2}               // 到达
                        ];
                    }
                }

                // 生成圆角路径
                const dPath = createRoundedPath(coords, radius, false);
                
                // ⭐ 数据属性：from是前置任务，to是后继任务
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

    console.log('✅ gantt-dependencies.js loaded successfully (Delta6 - 箭头位置修复版)');

})();
