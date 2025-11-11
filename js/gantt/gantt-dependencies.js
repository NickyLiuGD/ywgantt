// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图依赖关系管理中心                                          ▓▓
// ▓▓ 路径: js/gantt/gantt-dependencies.js                           ▓▓
// ▓▓ 版本: Epsilon17 - 修复折叠任务箭头错位问题                     ▓▓
// ▓▓ 职责: 依赖关系的所有逻辑集中管理                               ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 第一部分：依赖格式处理 ====================

    /**
     * 统一依赖格式（字符串 → 对象）
     * @param {*} dep - 依赖数据（字符串或对象）
     * @returns {Object|null} 统一的依赖对象
     */
    function normalizeDependency(dep) {
        if (typeof dep === 'string') {
            return { taskId: dep, type: 'FS', lag: 0 };
        } else if (typeof dep === 'object' && dep.taskId) {
            return {
                taskId: dep.taskId,
                type: dep.type || 'FS',
                lag: dep.lag || 0
            };
        }
        return null;
    }

    /**
     * 提取依赖任务ID
     * @param {*} dep - 依赖数据
     * @returns {string|null} 任务ID
     */
    function extractDependencyId(dep) {
        if (typeof dep === 'string') {
            return dep;
        } else if (typeof dep === 'object' && dep.taskId) {
            return dep.taskId;
        }
        return null;
    }

    // ==================== 第二部分：祖先/后代查找 ====================

    /**
     * 获取任务的所有祖先ID（向上递归）
     * @param {string} taskId - 任务ID
     * @param {Array} allTasks - 所有任务数组
     * @returns {Set<string>} 所有祖先ID集合
     */
    function getAllAncestors(taskId, allTasks) {
        const ancestors = new Set();
        const task = allTasks.find(t => t.id === taskId);
        
        if (!task || !task.parentId) return ancestors;
        
        let current = task;
        let iterations = 0;
        const maxIterations = allTasks.length;
        
        while (current.parentId && iterations < maxIterations) {
            ancestors.add(current.parentId);
            current = allTasks.find(t => t.id === current.parentId);
            if (!current) break;
            iterations++;
        }
        
        if (iterations >= maxIterations) {
            console.warn('Possible circular parent relationship');
        }
        
        return ancestors;
    }

    /**
     * 获取任务的所有后代ID（向下递归）
     * @param {string} taskId - 任务ID
     * @param {Array} allTasks - 所有任务数组
     * @returns {Set<string>} 所有后代ID集合
     */
    function getAllDescendants(taskId, allTasks) {
        const descendants = new Set();
        const task = allTasks.find(t => t.id === taskId);
        
        if (!task || !task.children || task.children.length === 0) {
            return descendants;
        }
        
        const collectDescendants = (id) => {
            const t = allTasks.find(task => task.id === id);
            if (!t) return;
            
            if (t.children && t.children.length > 0) {
                t.children.forEach(childId => {
                    descendants.add(childId);
                    collectDescendants(childId);
                });
            }
        };
        
        collectDescendants(taskId);
        
        return descendants;
    }

    /**
     * 获取关系层级描述
     */
    function getRelationLevel(ancestorId, descendantId, allTasks) {
        let level = 0;
        let current = allTasks.find(t => t.id === descendantId);
        
        while (current && current.parentId && level < 10) {
            level++;
            if (current.parentId === ancestorId) {
                break;
            }
            current = allTasks.find(t => t.id === current.parentId);
        }
        
        const levelNames = ['', '直接', '二级', '三级', '四级', '五级'];
        return levelNames[level] || `${level}级`;
    }

    // ==================== 第三部分：依赖验证 ====================

    /**
     * 检查是否可以添加依赖关系
     * @param {string} fromTaskId - 依赖任务ID（被依赖的任务）
     * @param {string} toTaskId - 当前任务ID（要添加依赖的任务）
     * @param {Array} allTasks - 所有任务数组
     * @returns {Object} {canAdd: boolean, reason: string}
     */
    function canAddDependency(fromTaskId, toTaskId, allTasks) {
        // 1. 不能依赖自己
        if (fromTaskId === toTaskId) {
            return {
                canAdd: false,
                reason: '不能依赖自己'
            };
        }
        
        const fromTask = allTasks.find(t => t.id === fromTaskId);
        const toTask = allTasks.find(t => t.id === toTaskId);
        
        if (!fromTask || !toTask) {
            return {
                canAdd: false,
                reason: '任务不存在'
            };
        }
        
        // 2. 子任务不能依赖父任务（包括所有祖先）
        const toAncestors = getAllAncestors(toTaskId, allTasks);
        if (toAncestors.has(fromTaskId)) {
            const ancestorLevel = getRelationLevel(fromTaskId, toTaskId, allTasks);
            return {
                canAdd: false,
                reason: `子任务不能依赖${ancestorLevel}父任务 "${fromTask.name}"`
            };
        }
        
        // 3. 父任务不能依赖子任务（包括所有后代）
        const fromDescendants = getAllDescendants(fromTaskId, allTasks);
        if (fromDescendants.has(toTaskId)) {
            const descendantLevel = getRelationLevel(toTaskId, fromTaskId, allTasks);
            return {
                canAdd: false,
                reason: `父任务不能依赖${descendantLevel}子任务 "${toTask.name}"`
            };
        }
        
        // 4. 检查是否形成循环依赖
        if (wouldCreateCircularDependency(fromTaskId, toTaskId, allTasks)) {
            return {
                canAdd: false,
                reason: `会形成循环依赖`
            };
        }
        
        return {
            canAdd: true,
            reason: ''
        };
    }

    /**
     * 检查是否会形成循环依赖
     */
    function wouldCreateCircularDependency(fromTaskId, toTaskId, allTasks) {
        const toTask = allTasks.find(t => t.id === toTaskId);
        if (!toTask) return false;
        
        const allDeps = getAllDependencies(toTaskId, allTasks);
        return allDeps.has(fromTaskId);
    }

    /**
     * 获取任务的所有前置依赖ID（递归）
     */
    function getAllDependencies(taskId, allTasks) {
        const deps = new Set();
        const visited = new Set();
        const stack = [taskId];
        let iterations = 0;
        const maxIterations = allTasks.length * 10;

        while (stack.length && iterations < maxIterations) {
            iterations++;
            const current = stack.pop();
            
            if (visited.has(current)) continue;
            visited.add(current);

            const task = allTasks.find(t => t.id === current);
            if (task && Array.isArray(task.dependencies)) {
                task.dependencies.forEach(dep => {
                    const depId = extractDependencyId(dep);
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
    }

    // ==================== 第四部分：时间冲突检测 ====================

    /**
     * 检测单个任务的时间冲突
     */
    function detectTaskConflicts(task, allTasks) {
        const conflicts = [];
        
        if (!task.dependencies || task.dependencies.length === 0) {
            return conflicts;
        }
        
        const taskStart = new Date(task.start);
        
        task.dependencies.forEach(dep => {
            const depId = extractDependencyId(dep);
            
            if (!depId) {
                console.warn('Invalid dependency format:', dep);
                return;
            }
            
            const depTask = allTasks.find(t => t.id === depId);
            
            if (!depTask) {
                conflicts.push({
                    type: 'MISSING_DEPENDENCY',
                    taskId: task.id,
                    taskName: task.name,
                    dependencyId: depId,
                    message: `依赖任务 ID "${depId}" 不存在`
                });
                return;
            }
            
            const depEnd = new Date(depTask.end);
            
            if (taskStart <= depEnd) {
                const daysDiff = daysBetween(taskStart, depEnd);
                const correctStart = addDays(depEnd, 1);
                const correctStartStr = formatDate(correctStart);
                
                conflicts.push({
                    type: 'TIME_CONFLICT',
                    taskId: task.id,
                    taskName: task.name,
                    taskStart: task.start,
                    dependencyId: depTask.id,
                    dependencyName: depTask.name,
                    dependencyEnd: depTask.end,
                    daysDiff: daysDiff + 1,
                    correctStart: correctStartStr,
                    message: `任务"${task.name}"(${task.start}开始)与依赖任务"${depTask.name}"(${depTask.end}结束)冲突，应在${correctStartStr}之后开始，当前冲突${daysDiff + 1}天`
                });
            }
        });
        
        return conflicts;
    }

    /**
     * 检测所有任务的时间冲突
     */
    function detectAllConflicts(tasks) {
        const allConflicts = [];
        const conflictTasks = new Set();
        
        tasks.forEach(task => {
            const conflicts = detectTaskConflicts(task, tasks);
            if (conflicts.length > 0) {
                allConflicts.push(...conflicts);
                conflictTasks.add(task.id);
            }
        });
        
        return {
            hasConflicts: allConflicts.length > 0,
            conflictCount: allConflicts.length,
            conflictTaskCount: conflictTasks.size,
            conflicts: allConflicts,
            conflictTaskIds: Array.from(conflictTasks)
        };
    }

    // ==================== 第五部分：自动修复 ====================

    /**
     * 自动修复时间冲突
     */
    function autoFixConflicts(tasks) {
        const fixes = [];
        
        tasks.forEach(task => {
            if (!task.dependencies || task.dependencies.length === 0) {
                return;
            }
            
            if (task.isSummary || task.isMilestone) {
                return;
            }
            
            const taskStart = new Date(task.start);
            const taskDuration = task.duration || daysBetween(task.start, task.end);
            const taskDurationType = task.durationType || 'days';
            
            let latestDepEnd = null;
            let latestDepName = '';
            
            task.dependencies.forEach(dep => {
                const depId = extractDependencyId(dep);
                const depTask = tasks.find(t => t.id === depId);
                
                if (depTask) {
                    const depEnd = new Date(depTask.end);
                    if (!latestDepEnd || depEnd > latestDepEnd) {
                        latestDepEnd = depEnd;
                        latestDepName = depTask.name;
                    }
                }
            });
            
            if (latestDepEnd && taskStart <= latestDepEnd) {
                const oldStart = task.start;
                const oldEnd = task.end;
                
                const newStart = addDays(latestDepEnd, 1);
                const newEnd = calculateEndDate(newStart, taskDuration, taskDurationType);
                
                task.start = formatDate(newStart);
                task.end = formatDate(newEnd);
                
                fixes.push({
                    taskId: task.id,
                    taskName: task.name,
                    oldStart: oldStart,
                    oldEnd: oldEnd,
                    newStart: task.start,
                    newEnd: task.end,
                    dependencyName: latestDepName,
                    dependencyEnd: formatDate(latestDepEnd),
                    durationType: taskDurationType,
                    message: `任务"${task.name}"从 ${oldStart}~${oldEnd} 调整为 ${task.start}~${task.end} (依赖"${latestDepName}"结束于${formatDate(latestDepEnd)}，工期${taskDuration}${taskDurationType === 'workdays' ? '工作日' : '自然日'})`
                });
            }
        });
        
        return {
            fixCount: fixes.length,
            fixes: fixes
        };
    }

    // ==================== 第六部分：冲突报告生成 ====================

    /**
     * 生成冲突报告（HTML格式）
     */
    function generateConflictReport(result) {
        if (!result.hasConflicts) {
            return `
                <div class="alert alert-success">
                    <strong>✅ 无时间冲突</strong><br>
                    所有任务的依赖关系时间安排合理
                </div>
            `;
        }
        
        let html = `
            <div class="alert alert-danger">
                <strong>⚠️ 发现 ${result.conflictCount} 个时间冲突</strong><br>
                涉及 ${result.conflictTaskCount} 个任务
            </div>
            <div class="list-group mt-2">
        `;
        
        result.conflicts.forEach((conflict, index) => {
            if (conflict.type === 'TIME_CONFLICT') {
                html += `
                    <div class="list-group-item list-group-item-danger">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">🚨 冲突 #${index + 1}</h6>
                            <small class="text-danger">冲突 ${conflict.daysDiff} 天</small>
                        </div>
                        <p class="mb-1">
                            <strong>任务：</strong>${conflict.taskName}<br>
                            <strong>当前开始时间：</strong><span class="text-danger">${conflict.taskStart}</span><br>
                            <strong>依赖任务：</strong>${conflict.dependencyName}<br>
                            <strong>依赖结束时间：</strong>${conflict.dependencyEnd}<br>
                            <strong>建议开始时间：</strong><span class="text-success">${conflict.correctStart}</span>
                        </p>
                        <small class="text-danger">${conflict.message}</small>
                    </div>
                `;
            } else if (conflict.type === 'MISSING_DEPENDENCY') {
                html += `
                    <div class="list-group-item list-group-item-warning">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">⚠️ 缺失依赖 #${index + 1}</h6>
                        </div>
                        <p class="mb-1">
                            <strong>任务：</strong>${conflict.taskName}<br>
                            <strong>缺失的依赖ID：</strong>${conflict.dependencyId}
                        </p>
                        <small class="text-warning">${conflict.message}</small>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        return html;
    }

    /**
     * 在甘特图上高亮显示冲突任务
     */
    function highlightConflictTasks(conflictTaskIds, container) {
        container.querySelectorAll('.gantt-bar, .gantt-milestone').forEach(bar => {
            bar.classList.remove('conflict');
        });
        
        conflictTaskIds.forEach(taskId => {
            const bar = container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`) ||
                       container.querySelector(`.gantt-milestone[data-task-id="${taskId}"]`);
            if (bar) {
                bar.classList.add('conflict');
            }
        });
    }

    // ==================== 第七部分：⭐ SVG 箭头渲染（修复版） ====================

    /**
     * ⭐ 获取可见任务列表（排除折叠的子任务）
     */
    function getVisibleTasks(allTasks) {
        return allTasks.filter(task => {
            if (!task.parentId) return true;
            
            // 检查所有祖先是否有折叠的
            let current = task;
            while (current.parentId) {
                const parent = allTasks.find(t => t.id === current.parentId);
                if (!parent) break;
                
                if (parent.isCollapsed) {
                    return false; // 祖先折叠，此任务不可见
                }
                
                current = parent;
            }
            
            return true;
        });
    }

    /**
     * ⭐ 获取任务在可见任务列表中的索引
     */
    function getVisibleTaskIndex(taskId, visibleTasks) {
        return visibleTasks.findIndex(t => t.id === taskId);
    }

    /**
     * ⭐ 获取有效的依赖关系（处理折叠任务）
     * 如果依赖的任务被折叠，则向上查找可见的父任务
     */
    function getEffectiveDependency(depId, allTasks, visibleTasks) {
        let depTask = allTasks.find(t => t.id === depId);
        if (!depTask) return null;
        
        // 如果依赖任务可见，直接返回
        if (visibleTasks.find(t => t.id === depId)) {
            return depId;
        }
        
        // 如果依赖任务被折叠，向上查找可见的父任务
        while (depTask && depTask.parentId) {
            const parent = allTasks.find(t => t.id === depTask.parentId);
            if (!parent) break;
            
            if (visibleTasks.find(t => t.id === parent.id)) {
                return parent.id; // 返回可见的父任务
            }
            
            depTask = parent;
        }
        
        return null;
    }

    /**
     * 渲染依赖关系箭头（修复版）
     */
    GanttChart.prototype.renderDependencies = function(dates) {
        const depSVG = this.container.querySelector('.gantt-dependencies');
        
        if (!depSVG) {
            console.warn('GanttChart: Dependencies SVG not found');
            return;
        }

        const totalWidth = calculateTotalWidth(dates, this.options.cellWidth);
        
        // ⭐ 获取可见任务列表
        const visibleTasks = getVisibleTasks(this.tasks);
        const visibleTasksHeight = visibleTasks.length * ROW_HEIGHT;

        depSVG.style.width = `${totalWidth}px`;
        depSVG.style.height = `${visibleTasksHeight}px`;

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

        const paths = this.generateDependencyPaths(visibleTasks);
        depSVG.innerHTML += paths;
        
        const arrowCount = paths.split('<path').length - 1;
        console.log(`✅ 已渲染 ${arrowCount} 条依赖箭头（可见任务: ${visibleTasks.length}/${this.tasks.length}）`);
    };

    /**
     * 生成依赖路径（修复版 - 支持折叠任务）
     */
    GanttChart.prototype.generateDependencyPaths = function(visibleTasks) {
        const h = ROW_HEIGHT;
        const radius = 8;
        const paths = [];

        // ⭐ 遍历可见任务
        visibleTasks.forEach((task, taskIndex) => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            
            const depIds = task.dependencies.map(dep => extractDependencyId(dep)).filter(id => id);

            depIds.forEach(depId => {
                // ⭐ 获取有效的依赖任务（处理折叠情况）
                const effectiveDepId = getEffectiveDependency(depId, this.tasks, visibleTasks);
                
                if (!effectiveDepId) {
                    console.warn(`Dependency task not visible: ${depId}`);
                    return;
                }
                
                const depTask = this.tasks.find(t => t.id === effectiveDepId);
                if (!depTask) return;
                
                // ⭐ 使用可见任务列表的索引
                const depIndex = getVisibleTaskIndex(effectiveDepId, visibleTasks);
                
                if (depIndex === -1) {
                    console.warn(`Dependency task index not found: ${effectiveDepId}`);
                    return;
                }
                
                const depStartDays = daysBetween(this.startDate, new Date(depTask.start));
                const depDurationDays = daysBetween(depTask.start, depTask.end) + 1;
                const taskStartDays = daysBetween(this.startDate, new Date(task.start));
                
                const x1 = (depStartDays + depDurationDays) * this.options.cellWidth;
                const y1 = depIndex * h + h / 2;
                
                const x2 = taskStartDays * this.options.cellWidth;
                const y2 = taskIndex * h + h / 2;
                
                const gap = 5;
                const horizontalLength = 30;
                
                let coords;
                
                if (depIndex === taskIndex) {
                    coords = [
                        {x: x1, y: y1},
                        {x: x2 - gap, y: y2}
                    ];
                } else {
                    coords = [
                        {x: x1, y: y1},
                        {x: x1 + horizontalLength, y: y1},
                        {x: x2 - horizontalLength, y: y2},
                        {x: x2 - gap, y: y2}
                    ];
                }

                const dPath = createRoundedPath(coords, radius, false);
                
                paths.push(`<path data-from="${effectiveDepId}" data-to="${task.id}" d="${dPath}" 
                                  stroke="#dc3545" fill="none" stroke-width="2" 
                                  marker-end="url(#arrow)" 
                                  class="dependency-arrow" />`);
            });
        });

        return paths.join('');
    };

    // ==================== 第八部分：⭐ 折叠任务的依赖聚合 ====================

    /**
     * ⭐ 获取任务的聚合依赖（包括被折叠的子任务的依赖）
     * @param {string} taskId - 任务ID
     * @param {Array} allTasks - 所有任务数组
     * @returns {Array} 聚合后的依赖ID数组
     */
    function getAggregatedDependencies(taskId, allTasks) {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return [];
        
        const aggregatedDeps = new Set();
        
        // 添加自己的依赖
        if (task.dependencies && task.dependencies.length > 0) {
            task.dependencies.forEach(dep => {
                const depId = extractDependencyId(dep);
                if (depId) aggregatedDeps.add(depId);
            });
        }
        
        // 如果任务被折叠，添加所有子任务的依赖
        if (task.isCollapsed && task.children && task.children.length > 0) {
            const collectChildDeps = (childId) => {
                const child = allTasks.find(t => t.id === childId);
                if (!child) return;
                
                // 添加子任务的依赖
                if (child.dependencies && child.dependencies.length > 0) {
                    child.dependencies.forEach(dep => {
                        const depId = extractDependencyId(dep);
                        if (depId) {
                            // 排除内部依赖（子任务之间的依赖）
                            const depTask = allTasks.find(t => t.id === depId);
                            if (depTask && depTask.parentId !== taskId) {
                                aggregatedDeps.add(depId);
                            }
                        }
                    });
                }
                
                // 递归处理孙任务
                if (child.children && child.children.length > 0) {
                    child.children.forEach(grandchildId => {
                        collectChildDeps(grandchildId);
                    });
                }
            };
            
            task.children.forEach(childId => {
                collectChildDeps(childId);
            });
        }
        
        return Array.from(aggregatedDeps);
    }

    /**
     * ⭐ 查找依赖此任务的所有可见任务（包括通过被折叠子任务的间接依赖）
     * @param {string} taskId - 任务ID
     * @param {Array} allTasks - 所有任务数组
     * @param {Array} visibleTasks - 可见任务数组
     * @returns {Array} 依赖此任务的可见任务ID数组
     */
    function getVisibleDependentTasks(taskId, allTasks, visibleTasks) {
        const dependents = [];
        
        visibleTasks.forEach(visibleTask => {
            const aggregatedDeps = getAggregatedDependencies(visibleTask.id, allTasks);
            
            // 检查是否依赖此任务或其后代
            if (aggregatedDeps.includes(taskId)) {
                dependents.push(visibleTask.id);
            } else {
                // 检查是否依赖此任务的任何后代
                const descendants = getAllDescendants(taskId, allTasks);
                if (aggregatedDeps.some(depId => descendants.has(depId))) {
                    dependents.push(visibleTask.id);
                }
            }
        });
        
        return dependents;
    }

    // ==================== 第九部分：GanttChart 类扩展 ====================

    /**
     * 获取任务的所有祖先（实例方法）
     */
    GanttChart.prototype.getAllAncestors = function(taskId) {
        return getAllAncestors(taskId, this.tasks);
    };

    /**
     * 获取任务的所有后代（实例方法）
     */
    GanttChart.prototype.getAllDescendants = function(taskId) {
        return getAllDescendants(taskId, this.tasks);
    };

    /**
     * 获取任务的所有依赖（实例方法）
     */
    GanttChart.prototype.getAllDependencies = function(taskId) {
        return getAllDependencies(taskId, this.tasks);
    };

    /**
     * ⭐ 获取任务的聚合依赖（实例方法）
     */
    GanttChart.prototype.getAggregatedDependencies = function(taskId) {
        return getAggregatedDependencies(taskId, this.tasks);
    };

    /**
     * 检查是否可以添加依赖（实例方法）
     */
    GanttChart.prototype.canAddDependency = function(fromTaskId, toTaskId) {
        return canAddDependency(fromTaskId, toTaskId, this.tasks);
    };

    /**
     * 获取关系层级（实例方法）
     */
    GanttChart.prototype.getRelationLevel = function(ancestorId, descendantId) {
        return getRelationLevel(ancestorId, descendantId, this.tasks);
    };

    /**
     * 检测冲突并显示报告
     */
    GanttChart.prototype.checkConflicts = function() {
        console.log('🔍 开始检测冲突...');
        
        const result = detectAllConflicts(this.tasks);
        
        console.log('冲突检测结果:', result);
        
        const reportHtml = generateConflictReport(result);
        const logArea = document.getElementById('logArea');
        if (logArea) {
            logArea.innerHTML = reportHtml + logArea.innerHTML;
        }
        
        if (result.hasConflicts) {
            highlightConflictTasks(result.conflictTaskIds, this.container);
            addLog(`⚠️ 发现 ${result.conflictCount} 个时间冲突，涉及 ${result.conflictTaskCount} 个任务`);
            
            result.conflicts.forEach((conflict, index) => {
                if (conflict.type === 'TIME_CONFLICT') {
                    addLog(`   ${index + 1}. "${conflict.taskName}"应在"${conflict.dependencyName}"完成后（${conflict.correctStart}）开始`);
                }
            });
        } else {
            addLog('✅ 所有任务时间安排合理，无冲突');
        }
        
        return result;
    };

    /**
     * 自动修复时间冲突
     */
    GanttChart.prototype.autoFixConflicts = function() {
        console.log('🔧 开始自动修复冲突...');
        
        const fixResult = autoFixConflicts(this.tasks);
        
        console.log('修复结果:', fixResult);
        
        if (fixResult.fixCount > 0) {
            fixResult.fixes.forEach(fix => {
                addLog(`🔧 ${fix.message}`);
                
                // 更新父任务
                const task = this.tasks.find(t => t.id === fix.taskId);
                if (task && task.parentId && typeof this.updateParentTasks === 'function') {
                    this.updateParentTasks(task.id);
                }
            });
            
            this.calculateDateRange();
            this.render();
            
            addLog(`✅ 已自动修复 ${fixResult.fixCount} 个时间冲突`);
            
            setTimeout(() => {
                const recheckResult = detectAllConflicts(this.tasks);
                if (recheckResult.hasConflicts) {
                    addLog(`⚠️ 警告：仍存在 ${recheckResult.conflictCount} 个冲突（可能存在循环依赖）`);
                } else {
                    addLog(`✅ 验证通过：所有冲突已解决`);
                }
            }, 100);
        } else {
            addLog('✅ 无需修复，所有任务时间安排合理');
        }
        
        return fixResult;
    };

    /**
     * 清除冲突高亮
     */
    GanttChart.prototype.clearConflictHighlights = function() {
        this.container.querySelectorAll('.gantt-bar.conflict, .gantt-milestone.conflict').forEach(bar => {
            bar.classList.remove('conflict');
        });
        addLog('🔄 已清除冲突高亮');
    };

    // ==================== 导出到全局 ====================

    // 工具函数
    global.normalizeDependency = normalizeDependency;
    global.extractDependencyId = extractDependencyId;
    
    // 查找函数
    global.getAllAncestors = getAllAncestors;
    global.getAllDescendants = getAllDescendants;
    global.getAllDependencies = getAllDependencies;
    global.getRelationLevel = getRelationLevel;
    
    // ⭐ 新增函数
    global.getVisibleTasks = getVisibleTasks;
    global.getVisibleTaskIndex = getVisibleTaskIndex;
    global.getEffectiveDependency = getEffectiveDependency;
    global.getAggregatedDependencies = getAggregatedDependencies;
    global.getVisibleDependentTasks = getVisibleDependentTasks;
    
    // 验证函数
    global.canAddDependency = canAddDependency;
    global.wouldCreateCircularDependency = wouldCreateCircularDependency;
    
    // 冲突检测
    global.detectTaskConflicts = detectTaskConflicts;
    global.detectAllConflicts = detectAllConflicts;
    global.generateConflictReport = generateConflictReport;
    global.highlightConflictTasks = highlightConflictTasks;
    
    // 自动修复
    global.autoFixConflicts = autoFixConflicts;

    console.log('✅ gantt-dependencies.js loaded successfully (Epsilon17 - 修复折叠任务箭头)');

})(typeof window !== 'undefined' ? window : this);
