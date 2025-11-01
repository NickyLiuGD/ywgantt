/**
 * 甘特图冲突检测模块
 * 负责检测任务依赖关系中的时间冲突
 */

/**
 * 检测单个任务的时间冲突
 * @param {Object} task - 当前任务
 * @param {Array} allTasks - 所有任务数组
 * @returns {Array} 冲突信息数组
 */
function detectTaskConflicts(task, allTasks) {
    const conflicts = [];
    
    // 如果任务没有依赖，则无冲突
    if (!task.dependencies || task.dependencies.length === 0) {
        return conflicts;
    }
    
    const taskStart = new Date(task.start);
    
    // 遍历所有依赖任务
    task.dependencies.forEach(depId => {
        const depTask = allTasks.find(t => t.id === depId);
        
        if (!depTask) {
            // 依赖任务不存在
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
        
        // 修正判断逻辑：任务开始时间 <= 依赖任务结束时间 就是冲突
        // 因为任务应该在依赖任务结束后的次日开始
        if (taskStart <= depEnd) {
            const daysDiff = daysBetween(taskStart, depEnd);
            
            // 计算正确的开始日期应该是什么
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
                daysDiff: daysDiff + 1, // 加1表示包含结束当天
                correctStart: correctStartStr,
                message: `任务"${task.name}"(${task.start}开始)与依赖任务"${depTask.name}"(${depTask.end}结束)冲突，应在${correctStartStr}之后开始，当前冲突${daysDiff + 1}天`
            });
        }
    });
    
    return conflicts;
}

/**
 * 检测所有任务的时间冲突
 * @param {Array} tasks - 任务数组
 * @returns {Object} 冲突检测结果
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

/**
 * 生成冲突报告（HTML格式）
 * @param {Object} result - detectAllConflicts 的返回结果
 * @returns {string} HTML 字符串
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
 * @param {Array} conflictTaskIds - 冲突任务ID数组
 * @param {HTMLElement} container - 甘特图容器
 */
function highlightConflictTasks(conflictTaskIds, container) {
    // 清除之前的高亮
    container.querySelectorAll('.gantt-bar').forEach(bar => {
        bar.classList.remove('conflict');
    });
    
    // 添加冲突高亮
    conflictTaskIds.forEach(taskId => {
        const bar = container.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
        if (bar) {
            bar.classList.add('conflict');
        }
    });
}

/**
 * 自动修复时间冲突（将任务移动到依赖任务结束后的次日）
 * @param {Array} tasks - 任务数组
 * @returns {Object} 修复结果
 */
function autoFixConflicts(tasks) {
    const fixes = [];
    
    tasks.forEach(task => {
        if (!task.dependencies || task.dependencies.length === 0) {
            return;
        }
        
        const taskStart = new Date(task.start);
        const taskDuration = daysBetween(task.start, task.end);
        
        // 找出所有依赖任务中最晚的结束时间
        let latestDepEnd = null;
        let latestDepName = '';
        task.dependencies.forEach(depId => {
            const depTask = tasks.find(t => t.id === depId);
            if (depTask) {
                const depEnd = new Date(depTask.end);
                if (!latestDepEnd || depEnd > latestDepEnd) {
                    latestDepEnd = depEnd;
                    latestDepName = depTask.name;
                }
            }
        });
        
        // 修正判断逻辑：如果任务开始 <= 依赖结束，则需要修复
        if (latestDepEnd && taskStart <= latestDepEnd) {
            const oldStart = task.start;
            const oldEnd = task.end;
            
            // 新开始时间 = 最晚依赖结束时间 + 1天
            const newStart = addDays(latestDepEnd, 1);
            const newEnd = addDays(newStart, taskDuration);
            
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
                message: `任务"${task.name}"从 ${oldStart}~${oldEnd} 调整为 ${task.start}~${task.end} (依赖任务"${latestDepName}"结束于${formatDate(latestDepEnd)})`
            });
        }
    });
    
    return {
        fixCount: fixes.length,
        fixes: fixes
    };
}

// ==================== GanttChart 类扩展 ====================

/**
 * 检测冲突并显示报告
 * @returns {Object} 冲突检测结果
 */
GanttChart.prototype.checkConflicts = function() {
    const result = detectAllConflicts(this.tasks);
    
    // 在日志区域显示报告
    const reportHtml = generateConflictReport(result);
    const logArea = document.getElementById('logArea');
    if (logArea) {
        logArea.innerHTML = reportHtml + logArea.innerHTML;
    }
    
    // 高亮显示冲突任务
    if (result.hasConflicts) {
        highlightConflictTasks(result.conflictTaskIds, this.container);
        addLog(`⚠️ 发现 ${result.conflictCount} 个时间冲突，涉及 ${result.conflictTaskCount} 个任务`);
        
        // 在日志中列出每个冲突的详细信息
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
 * @returns {Object} 修复结果
 */
GanttChart.prototype.autoFixConflicts = function() {
    const fixResult = autoFixConflicts(this.tasks);
    
    if (fixResult.fixCount > 0) {
        fixResult.fixes.forEach(fix => {
            addLog(`🔧 ${fix.message}`);
        });
        
        this.calculateDateRange();
        this.render();
        
        addLog(`✅ 已自动修复 ${fixResult.fixCount} 个时间冲突`);
        
        // 修复后再次检测，确认无遗留冲突
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
    this.container.querySelectorAll('.gantt-bar.conflict').forEach(bar => {
        bar.classList.remove('conflict');
    });
    addLog('🔄 已清除冲突高亮');
};