// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 甘特图依赖关系管理中心                                          ▓▓
// ▓▓ 路径: js/gantt/gantt-dependencies.js                           ▓▓
// ▓▓ 版本: Epsilon20 - 原生/衍生依赖智能管理版                      ▓▓
// ▓▓ 核心原则：                                                      ▓▓
// ▓▓   1. 只有原子任务之间才有原生依赖关系                          ▓▓
// ▓▓   2. 汇总任务的依赖关系从子任务衍生                            ▓▓
// ▓▓   3. 展开时显示子任务依赖，折叠时显示汇总任务依赖              ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 依赖格式处理 ====================

    const normalizeDependency = dep => 
        typeof dep === 'string' ? { taskId: dep, type: 'FS', lag: 0 } :
        (dep?.taskId ? { taskId: dep.taskId, type: dep.type || 'FS', lag: dep.lag || 0 } : null);

    const extractDependencyId = dep => 
        typeof dep === 'string' ? dep : dep?.taskId || null;

    // ==================== 祖先/后代查找 ====================

    function getAllAncestors(taskId, allTasks) {
        const ancestors = new Set();
        let current = allTasks.find(t => t.id === taskId);
        let iterations = 0;
        
        while (current?.parentId && iterations++ < allTasks.length) {
            ancestors.add(current.parentId);
            current = allTasks.find(t => t.id === current.parentId);
        }
        
        return ancestors;
    }

    function getAllDescendants(taskId, allTasks) {
        const descendants = new Set();
        const queue = [taskId];
        
        while (queue.length) {
            const id = queue.shift();
            const task = allTasks.find(t => t.id === id);
            
            if (task?.children?.length) {
                task.children.forEach(childId => {
                    if (!descendants.has(childId)) {
                        descendants.add(childId);
                        queue.push(childId);
                    }
                });
            }
        }
        
        return descendants;
    }

    function getRelationLevel(ancestorId, descendantId, allTasks) {
        let level = 0;
        let current = allTasks.find(t => t.id === descendantId);
        
        while (current?.parentId && level < 10) {
            if (current.parentId === ancestorId) break;
            current = allTasks.find(t => t.id === current.parentId);
            level++;
        }
        
        const levels = ['', '直接', '二级', '三级', '四级', '五级'];
        return levels[level] || `${level}级`;
    }

    // ==================== ⭐ 衍生依赖计算（核心新功能） ====================

    /**
     * 计算汇总任务的衍生依赖关系
     * @param {Object} summaryTask - 汇总任务
     * @param {Array} allTasks - 所有任务
     * @returns {Array} 衍生的依赖关系数组
     */
    function calculateDerivedDependencies(summaryTask, allTasks) {
        if (!summaryTask.isSummary || !summaryTask.children?.length) {
            return [];
        }

        const derivedDeps = new Set();
        
        // 递归收集所有子任务的依赖
        const collectChildDependencies = (taskId) => {
            const task = allTasks.find(t => t.id === taskId);
            if (!task) return;
            
            // 如果是原子任务，收集其依赖
            if (!task.isSummary && task.dependencies?.length) {
                task.dependencies.forEach(dep => {
                    const depId = extractDependencyId(dep);
                    if (!depId) return;
                    
                    // 检查依赖任务是否在汇总任务外部
                    const depTask = allTasks.find(t => t.id === depId);
                    if (depTask && !isDescendantOf(depId, summaryTask.id, allTasks)) {
                        // 外部依赖：需要衍生到汇总任务
                        derivedDeps.add(depId);
                    }
                });
            }
            
            // 如果是子汇总任务，递归收集
            if (task.children?.length) {
                task.children.forEach(childId => {
                    collectChildDependencies(childId);
                });
            }
        };
        
        summaryTask.children.forEach(childId => {
            collectChildDependencies(childId);
        });
        
        return Array.from(derivedDeps).map(depId => ({
            taskId: depId,
            type: 'FS',
            lag: 0,
            isDerived: true // ⭐ 标记为衍生依赖
        }));
    }

    /**
     * 判断任务A是否是任务B的后代
     */
    function isDescendantOf(taskAId, taskBId, allTasks) {
        const descendants = getAllDescendants(taskBId, allTasks);
        return descendants.has(taskAId);
    }

    /**
     * ⭐ 获取任务的有效依赖关系（根据折叠状态）
     * @param {Object} task - 任务对象
     * @param {Array} allTasks - 所有任务
     * @returns {Array} 有效的依赖关系数组
     */
    function getEffectiveDependencies(task, allTasks) {
        // 原子任务：直接返回原生依赖
        if (!task.isSummary) {
            return task.dependencies || [];
        }
        
        // 汇总任务展开：不显示依赖（由子任务表达）
        if (!task.isCollapsed) {
            return [];
        }
        
        // 汇总任务折叠：返回衍生依赖
        return calculateDerivedDependencies(task, allTasks);
    }

    /**
     * ⭐ 获取所有可见任务的有效依赖关系
     * @param {Array} allTasks - 所有任务
     * @returns {Array} [{task, dependencies}] 任务及其有效依赖
     */
    function getVisibleTaskDependencies(allTasks) {
        const visibleDeps = [];
        
        allTasks.forEach(task => {
            // 跳过被折叠的子任务
            if (isTaskHidden(task, allTasks)) {
                return;
            }
            
            const effectiveDeps = getEffectiveDependencies(task, allTasks);
            
            if (effectiveDeps.length > 0) {
                visibleDeps.push({
                    task: task,
                    dependencies: effectiveDeps
                });
            }
        });
        
        return visibleDeps;
    }

    /**
     * 判断任务是否被父任务折叠隐藏
     */
    function isTaskHidden(task, allTasks) {
        if (!task.parentId) return false;
        
        let current = task;
        while (current.parentId) {
            const parent = allTasks.find(t => t.id === current.parentId);
            if (!parent) break;
            
            if (parent.isCollapsed) {
                return true;
            }
            
            current = parent;
        }
        
        return false;
    }

    // ==================== 依赖验证 ====================

    function canAddDependency(fromTaskId, toTaskId, allTasks) {
        if (fromTaskId === toTaskId) {
            return { canAdd: false, reason: '不能依赖自己' };
        }
        
        const fromTask = allTasks.find(t => t.id === fromTaskId);
        const toTask = allTasks.find(t => t.id === toTaskId);
        
        if (!fromTask || !toTask) {
            return { canAdd: false, reason: '任务不存在' };
        }
        
        // ⭐ 禁止汇总任务之间建立依赖
        if (fromTask.isSummary || toTask.isSummary) {
            return { canAdd: false, reason: '汇总任务不能直接建立依赖关系' };
        }
        
        const toAncestors = getAllAncestors(toTaskId, allTasks);
        if (toAncestors.has(fromTaskId)) {
            return {
                canAdd: false,
                reason: `子任务不能依赖${getRelationLevel(fromTaskId, toTaskId, allTasks)}父任务 "${fromTask.name}"`
            };
        }
        
        const fromDescendants = getAllDescendants(fromTaskId, allTasks);
        if (fromDescendants.has(toTaskId)) {
            return {
                canAdd: false,
                reason: `父任务不能依赖${getRelationLevel(toTaskId, fromTaskId, allTasks)}子任务 "${toTask.name}"`
            };
        }
        
        if (getAllDependencies(toTaskId, allTasks).has(fromTaskId)) {
            return { canAdd: false, reason: '会形成循环依赖' };
        }
        
        return { canAdd: true, reason: '' };
    }

    function getAllDependencies(taskId, allTasks) {
        const deps = new Set();
        const visited = new Set();
        const stack = [taskId];
        let iterations = 0;
        const maxIterations = allTasks.length * 10;

        while (stack.length && iterations++ < maxIterations) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            visited.add(current);

            const task = allTasks.find(t => t.id === current);
            task?.dependencies?.forEach(dep => {
                const depId = extractDependencyId(dep);
                if (depId && !deps.has(depId)) {
                    deps.add(depId);
                    stack.push(depId);
                }
            });
        }

        deps.delete(taskId);
        return deps;
    }

    // ==================== 冲突检测 ====================

    function detectTaskConflicts(task, allTasks) {
        if (!task.dependencies?.length) return [];
        
        const conflicts = [];
        const taskStart = new Date(task.start);
        
        task.dependencies.forEach(dep => {
            const depId = extractDependencyId(dep);
            if (!depId) return;
            
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
                const daysDiff = daysBetween(taskStart, depEnd) + 1;
                const correctStart = formatDate(addDays(depEnd, 1));
                
                conflicts.push({
                    type: 'TIME_CONFLICT',
                    taskId: task.id,
                    taskName: task.name,
                    taskStart: task.start,
                    dependencyId: depTask.id,
                    dependencyName: depTask.name,
                    dependencyEnd: depTask.end,
                    daysDiff,
                    correctStart,
                    message: `任务"${task.name}"(${task.start}开始)与依赖任务"${depTask.name}"(${depTask.end}结束)冲突，应在${correctStart}之后开始，当前冲突${daysDiff}天`
                });
            }
        });
        
        return conflicts;
    }

    function detectAllConflicts(tasks) {
        const allConflicts = [];
        const conflictTasks = new Set();
        
        tasks.forEach(task => {
            const conflicts = detectTaskConflicts(task, tasks);
            if (conflicts.length) {
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

    // ==================== 自动修复 ====================

    function autoFixConflicts(tasks) {
        const fixes = [];
        
        tasks.forEach(task => {
            if (!task.dependencies?.length || task.isSummary || task.isMilestone) return;
            
            const taskStart = new Date(task.start);
            const taskDuration = task.duration || daysBetween(task.start, task.end);
            const taskDurationType = task.durationType || 'days';
            
            let latestDepEnd = null;
            let latestDepName = '';
            
            task.dependencies.forEach(dep => {
                const depTask = tasks.find(t => t.id === extractDependencyId(dep));
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
                
                const typeLabel = taskDurationType === 'workdays' ? '工作日' : '自然日';
                
                fixes.push({
                    taskId: task.id,
                    taskName: task.name,
                    oldStart,
                    oldEnd,
                    newStart: task.start,
                    newEnd: task.end,
                    dependencyName: latestDepName,
                    dependencyEnd: formatDate(latestDepEnd),
                    durationType: taskDurationType,
                    message: `任务"${task.name}"从 ${oldStart}~${oldEnd} 调整为 ${task.start}~${task.end} (依赖"${latestDepName}"结束于${formatDate(latestDepEnd)}，工期${taskDuration}${typeLabel})`
                });
            }
        });
        
        return { fixCount: fixes.length, fixes };
    }

    // ==================== 冲突报告 ====================

    function generateConflictReport(result) {
        if (!result.hasConflicts) {
            return '<div class="alert alert-success"><strong>✅ 无时间冲突</strong><br>所有任务的依赖关系时间安排合理</div>';
        }
        
        const items = result.conflicts.map((c, i) => {
            if (c.type === 'TIME_CONFLICT') {
                return `
                    <div class="list-group-item list-group-item-danger">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">🚨 冲突 #${i + 1}</h6>
                            <small class="text-danger">冲突 ${c.daysDiff} 天</small>
                        </div>
                        <p class="mb-1">
                            <strong>任务：</strong>${c.taskName}<br>
                            <strong>当前开始：</strong><span class="text-danger">${c.taskStart}</span><br>
                            <strong>依赖任务：</strong>${c.dependencyName}<br>
                            <strong>依赖结束：</strong>${c.dependencyEnd}<br>
                            <strong>建议开始：</strong><span class="text-success">${c.correctStart}</span>
                        </p>
                    </div>`;
            } else {
                return `
                    <div class="list-group-item list-group-item-warning">
                        <h6 class="mb-1">⚠️ 缺失依赖 #${i + 1}</h6>
                        <p class="mb-1">
                            <strong>任务：</strong>${c.taskName}<br>
                            <strong>缺失ID：</strong>${c.dependencyId}
                        </p>
                    </div>`;
            }
        }).join('');
        
        return `
            <div class="alert alert-danger">
                <strong>⚠️ 发现 ${result.conflictCount} 个时间冲突</strong><br>
                涉及 ${result.conflictTaskCount} 个任务
            </div>
            <div class="list-group mt-2">${items}</div>
        `;
    }

    function highlightConflictTasks(conflictTaskIds, container) {
        container.querySelectorAll('.gantt-bar.conflict, .gantt-milestone.conflict')
            .forEach(bar => bar.classList.remove('conflict'));
        
        conflictTaskIds.forEach(taskId => {
            const bar = container.querySelector(
                `.gantt-bar[data-task-id="${taskId}"], .gantt-milestone[data-task-id="${taskId}"]`
            );
            if (bar) bar.classList.add('conflict');
        });
    }

    // ==================== ⭐ SVG 箭头渲染（智能依赖版） ====================

    /**
     * 渲染依赖箭头（智能版：根据折叠状态）
     */
    GanttChart.prototype.renderDependencies = function(dates) {
        const depSVG = this.container.querySelector('.gantt-dependencies');
        if (!depSVG) return;

        const totalWidth = calculateTotalWidth(dates, this.options.cellWidth);
        depSVG.style.cssText = `width: ${totalWidth}px; height: ${this.tasks.length * ROW_HEIGHT}px;`;

        const defs = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545"/>
                </marker>
                <marker id="arrow-highlight" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981"/>
                </marker>
                <marker id="arrow-derived" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6"/>
                </marker>
            </defs>
        `;

        if (!this.options.showDependencies) {
            depSVG.innerHTML = defs;
            return;
        }

        const paths = this.generateDependencyPaths();
        depSVG.innerHTML = defs + paths;
        
        const arrowCount = paths.split('<path').length - 1;
        const derivedCount = paths.split('arrow-derived').length - 1;
        
        if (derivedCount > 0) {
            console.log(`✅ 已渲染 ${arrowCount} 条箭头（${derivedCount} 条衍生依赖）`);
        } else {
            console.log(`✅ 已渲染 ${arrowCount} 条依赖箭头`);
        }
    };

    /**
     * ⭐ 生成依赖路径（智能版：区分原生/衍生依赖）
     */
    GanttChart.prototype.generateDependencyPaths = function() {
        const h = ROW_HEIGHT;
        const r = 8;
        const hLen = 30;
        const cw = this.options.cellWidth;
        const paths = [];

        // ⭐ 获取所有可见任务的有效依赖
        const visibleDeps = getVisibleTaskDependencies(this.tasks);

        visibleDeps.forEach(({task, dependencies}) => {
            const ti = this.tasks.indexOf(task);
            if (ti === -1) return;

            dependencies.forEach(dep => {
                const depId = extractDependencyId(dep);
                const depTask = this.tasks.find(t => t.id === depId);
                if (!depTask) return;
                
                // ⭐ 跳过被折叠隐藏的依赖任务
                if (isTaskHidden(depTask, this.tasks)) return;
                
                const di = this.tasks.indexOf(depTask);
                if (di === -1) return;
                
                // 起点：依赖任务右边缘
                const x1 = (daysBetween(this.startDate, new Date(depTask.start)) + 
                           daysBetween(depTask.start, depTask.end) + 1) * cw;
                const y1 = di * h + h / 2;
                
                // 终点：目标任务左边缘
                const x2 = daysBetween(this.startDate, new Date(task.start)) * cw;
                const y2 = ti * h + h / 2;
                
                // 生成路径坐标
                const coords = di === ti ? 
                    [{x: x1, y: y1}, {x: x2, y: y2}] :
                    [{x: x1, y: y1}, {x: x1 + hLen, y: y1}, {x: x2 - hLen, y: y2}, {x: x2, y: y2}];

                // ⭐ 区分原生依赖和衍生依赖
                const isDerived = dep.isDerived === true;
                const markerType = isDerived ? 'arrow-derived' : 'arrow';
                const strokeColor = isDerived ? '#8b5cf6' : '#dc3545';
                const strokeDasharray = isDerived ? '4,2' : 'none'; // 衍生依赖使用虚线

                paths.push(
                    `<path data-from="${depId}" data-to="${task.id}" ` +
                    `data-derived="${isDerived}" ` +
                    `d="${createRoundedPath(coords, r)}" ` +
                    `stroke="${strokeColor}" fill="none" stroke-width="2" ` +
                    `stroke-dasharray="${strokeDasharray}" ` +
                    `marker-end="url(#${markerType})" ` +
                    `class="dependency-arrow ${isDerived ? 'derived-arrow' : ''}"/>`
                );
            });
        });

        return paths.join('');
    };

    // ==================== 实例方法扩展 ====================

    Object.assign(GanttChart.prototype, {
        getAllAncestors(taskId) { return getAllAncestors(taskId, this.tasks); },
        getAllDescendants(taskId) { return getAllDescendants(taskId, this.tasks); },
        getAllDependencies(taskId) { return getAllDependencies(taskId, this.tasks); },
        canAddDependency(fromId, toId) { return canAddDependency(fromId, toId, this.tasks); },
        getRelationLevel(ancId, descId) { return getRelationLevel(ancId, descId, this.tasks); },
        
        // ⭐ 新增方法
        calculateDerivedDependencies(taskId) { 
            const task = this.tasks.find(t => t.id === taskId);
            return task ? calculateDerivedDependencies(task, this.tasks) : [];
        },
        
        getEffectiveDependencies(taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            return task ? getEffectiveDependencies(task, this.tasks) : [];
        },
        
        isTaskHidden(taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            return task ? isTaskHidden(task, this.tasks) : false;
        },
        
        /**
         * 检测冲突
         */
        checkConflicts() {
            const result = detectAllConflicts(this.tasks);
            const logArea = document.getElementById('logArea');
            
            if (logArea) {
                logArea.innerHTML = generateConflictReport(result) + logArea.innerHTML;
            }
            
            if (result.hasConflicts) {
                highlightConflictTasks(result.conflictTaskIds, this.container);
                addLog(`⚠️ 发现 ${result.conflictCount} 个时间冲突，涉及 ${result.conflictTaskCount} 个任务`);
                result.conflicts.forEach((c, i) => {
                    if (c.type === 'TIME_CONFLICT') {
                        addLog(`   ${i + 1}. "${c.taskName}"应在"${c.dependencyName}"完成后（${c.correctStart}）开始`);
                    }
                });
            } else {
                addLog('✅ 所有任务时间安排合理，无冲突');
            }
            
            return result;
        },
        
        /**
         * 自动修复冲突
         */
        autoFixConflicts() {
            const fixResult = autoFixConflicts(this.tasks);
            
            if (fixResult.fixCount > 0) {
                fixResult.fixes.forEach(fix => {
                    addLog(`🔧 ${fix.message}`);
                    
                    const task = this.tasks.find(t => t.id === fix.taskId);
                    if (task?.parentId && this.updateParentTasks) {
                        this.updateParentTasks(task.id);
                    }
                });
                
                this.calculateDateRange();
                this.render();
                addLog(`✅ 已自动修复 ${fixResult.fixCount} 个时间冲突`);
                
                setTimeout(() => {
                    const recheck = detectAllConflicts(this.tasks);
                    addLog(recheck.hasConflicts ? 
                        `⚠️ 仍存在 ${recheck.conflictCount} 个冲突` : 
                        '✅ 验证通过：所有冲突已解决'
                    );
                }, 100);
            } else {
                addLog('✅ 无需修复，所有任务时间安排合理');
            }
            
            return fixResult;
        },
        
        /**
         * 清除冲突高亮
         */
        clearConflictHighlights() {
            this.container.querySelectorAll('.gantt-bar.conflict, .gantt-milestone.conflict')
                .forEach(bar => bar.classList.remove('conflict'));
            addLog('🔄 已清除冲突高亮');
        }
    });

    // ==================== 导出到全局 ====================

    Object.assign(global, {
        normalizeDependency,
        extractDependencyId,
        getAllAncestors,
        getAllDescendants,
        getAllDependencies,
        getRelationLevel,
        canAddDependency,
        detectTaskConflicts,
        detectAllConflicts,
        generateConflictReport,
        highlightConflictTasks,
        autoFixConflicts,
        // ⭐ 新增导出
        calculateDerivedDependencies,
        getEffectiveDependencies,
        getVisibleTaskDependencies,
        isTaskHidden,
        isDescendantOf
    });

    console.log('✅ gantt-dependencies.js loaded (Epsilon20 - 原生/衍生依赖智能管理)');

})(typeof window !== 'undefined' ? window : this);
