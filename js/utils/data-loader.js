// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 数据加载工具模块                                                ▓▓
// ▓▓ 路径: js/utils/data-loader.js                                  ▓▓
// ▓▓ 版本: Epsilon8                                                 ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 从JSON文件加载任务数据
     * @param {string} url - JSON文件路径
     * @returns {Promise<Array>} 任务数组
     */
    async function loadTasksFromJSON(url) {
        try {
            const response = await fetch(url + '?t=' + Date.now());
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const today = new Date();
            
            // 第一遍：创建所有任务（建立ID映射）
            const uidToIdMap = {};
            const tasks = data.tasks.map(jsonTask => {
                const task = createTaskFromJSON(jsonTask, today);
                uidToIdMap[jsonTask.uid] = task.id;
                return task;
            });
            
            // 第二遍：处理父子关系和依赖关系
            data.tasks.forEach((jsonTask, index) => {
                const task = tasks[index];
                
                // 处理 parentId（从临时标记转换为真实ID）
                if (jsonTask.parentId && jsonTask.parentId.startsWith('temp-parent-')) {
                    const parentUid = parseInt(jsonTask.parentId.replace('temp-parent-', ''));
                    task.parentId = uidToIdMap[parentUid] || null;
                }
                
                // 处理 children（从临时标记转换为真实ID）
                if (jsonTask.children && jsonTask.children.length > 0) {
                    task.children = jsonTask.children.map(childRef => {
                        if (childRef.startsWith('temp-child-')) {
                            const childUid = parseInt(childRef.replace('temp-child-', ''));
                            return uidToIdMap[childUid];
                        }
                        return childRef;
                    }).filter(id => id);
                }
                
                // 处理依赖关系（从UID转换为ID）
                if (jsonTask.dependencies && jsonTask.dependencies.length > 0) {
                    task.dependencies = jsonTask.dependencies.map(dep => {
                        if (typeof dep === 'object' && dep.taskUid) {
                            return {
                                taskId: uidToIdMap[dep.taskUid] || null,
                                type: dep.type || 'FS',
                                lag: dep.lag || 0
                            };
                        }
                        return dep;
                    }).filter(dep => dep.taskId || typeof dep === 'string');
                }
            });
            
            return {
                tasks: tasks,
                project: data.project || {}
            };
            
        } catch (error) {
            console.error('loadTasksFromJSON error:', error);
            throw error;
        }
    }

    /**
     * 从JSON数据创建任务对象
     */
    function createTaskFromJSON(jsonTask, baseDate) {
        const startDate = addDays(baseDate, jsonTask.startOffset || 0);
        const endDate = jsonTask.duration === 0 ? 
            startDate : 
            addDays(startDate, jsonTask.duration - 1);
        
        return {
            id: generateId(),
            uid: jsonTask.uid,
            name: jsonTask.name,
            start: formatDate(startDate),
            end: formatDate(endDate),
            duration: jsonTask.duration,
            progress: jsonTask.progress || 0,
            isMilestone: jsonTask.isMilestone || false,
            isSummary: jsonTask.isSummary || false,
            parentId: jsonTask.parentId || null,
            children: jsonTask.children || [],
            outlineLevel: jsonTask.outlineLevel || 1,
            wbs: jsonTask.wbs || '',
            priority: jsonTask.priority || 'medium',
            notes: jsonTask.notes || '',
            isCollapsed: jsonTask.isCollapsed || false,
            dependencies: jsonTask.dependencies || []
        };
    }

    /**
     * 将任务数组转换为JSON格式（用于导出）
     * @param {Array} tasks - 任务数组
     * @param {Date} baseDate - 基准日期
     * @returns {Object} JSON格式数据
     */
    function convertTasksToJSON(tasks, baseDate) {
        const idToUidMap = {};
        
        const jsonTasks = tasks.map(task => {
            idToUidMap[task.id] = task.uid;
            
            const startDate = new Date(task.start);
            const startOffset = daysBetween(baseDate, startDate);
            
            return {
                uid: task.uid,
                name: task.name,
                startOffset: startOffset,
                duration: task.duration || 0,
                progress: task.progress || 0,
                isMilestone: task.isMilestone || false,
                isSummary: task.isSummary || false,
                parentId: task.parentId ? `temp-parent-${idToUidMap[task.parentId]}` : null,
                children: (task.children || []).map(childId => `temp-child-${idToUidMap[childId]}`),
                outlineLevel: task.outlineLevel || 1,
                wbs: task.wbs || '',
                priority: task.priority || 'medium',
                notes: task.notes || '',
                isCollapsed: task.isCollapsed || false,
                dependencies: (task.dependencies || []).map(dep => {
                    const depId = typeof dep === 'string' ? dep : dep.taskId;
                    return {
                        taskUid: idToUidMap[depId],
                        type: dep.type || 'FS',
                        lag: dep.lag || 0
                    };
                })
            };
        });
        
        return {
            project: {
                name: "导出的项目",
                version: "1.0",
                description: "",
                createdDate: new Date().toISOString(),
                author: ""
            },
            tasks: jsonTasks
        };
    }

    // 导出到全局
    global.loadTasksFromJSON = loadTasksFromJSON;
    global.createTaskFromJSON = createTaskFromJSON;
    global.convertTasksToJSON = convertTasksToJSON;

    console.log('✅ data-loader.js loaded successfully');

})(typeof window !== 'undefined' ? window : this);
