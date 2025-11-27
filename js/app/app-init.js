// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Epsilon26-Full-Restore                                   ▓▓
// ▓▓ 状态: 逻辑全量复原 (含解析助手) + 历史追赶集成                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 应用启动入口
     */
    async function initApp() {
        const emptyTasks = [];
        const gantt = new GanttChart('#gantt', emptyTasks, { showTaskNames: true });
        global.gantt = gantt;
        
        window.addEventListener('resize', debounce(() => gantt.updateHeight(), 100), { passive: true });
        
        gantt.updateHeight();
        console.log('⚡ UI 框架已就绪');

        await loadDataStrategy();
    }

    /**
     * 数据加载策略
     */
    async function loadDataStrategy() {
        let loaded = false;

        // 策略A: 尝试从云端 KV 获取最新存档
        try {
            console.log('☁️ 正在检查云端存档...');
            const files = await listKVFiles();
            const projectFiles = files.filter(f => !f.name.endsWith('_history.json'));

            if (projectFiles && projectFiles.length > 0) {
                const latestFile = projectFiles[0];
                if(typeof addLog === 'function') addLog(`☁️ 正在同步云端数据: ${latestFile.name}`);

                const cloudData = await loadFromKV(latestFile.name);
                
                const tasksRaw = Array.isArray(cloudData) ? cloudData : (cloudData.tasks || []);
                const projectInfo = cloudData.project || { name: latestFile.name };
                
                // ⭐ 获取快照锚点
                const lastActionId = projectInfo.lastActionId || null;

                const tasks = tasksRaw.map(t => ({
                    ...t,
                    id: t.id || generateId(),
                    dependencies: t.dependencies || []
                }));

                initializeGanttData(tasks, projectInfo);
                
                // ⭐ 初始化历史并追赶进度
                if (window.historyManager) {
                    await window.historyManager.init(latestFile.name, lastActionId);
                    // 追赶后刷新视图
                    if (global.gantt) global.gantt.render();
                }
                
                loaded = true;
                if(typeof addLog === 'function') addLog(`✅ 云端同步完成 (${tasks.length} 个任务)`);
            }
        } catch (error) {
            console.warn('⚠️ 云端连接失败/离线:', error.message);
        }

        // 策略B: 加载本地演示数据
        if (!loaded) {
            try {
                const response = await fetch('data/initial-tasks.json?v=1.0');
                if (response.ok) {
                    const data = await response.json();
                    const tasks = parseJSONTasks(data);
                    initializeGanttData(tasks, data.project);
                    loaded = true;
                    // 本地文件视为无历史
                    if (window.historyManager) window.historyManager.init(null, null);
                    if(typeof addLog === 'function') addLog('📂 已加载本地演示数据');
                }
            } catch (error) {
                console.warn('⚠️ 本地数据加载失败:', error);
            }
        }

        // 策略C: 最小数据集兜底
        if (!loaded) {
            const minTasks = getMinimalTasks();
            initializeGanttData(minTasks, { name: '新项目' });
            if (window.historyManager) window.historyManager.init(null, null);
            if(typeof addLog === 'function') addLog('⚠️ 已初始化空项目');
        }
    }

    /**
     * 数据标准化
     */
    function normalizeAndFixTasks(tasks) {
        if (!Array.isArray(tasks)) return [];
        
        return tasks.map(task => {
            if (!task.durationType) task.durationType = 'days'; 

            if (task.isMilestone) {
                task.duration = 0;
                if (task.start && !task.end) task.end = task.start;
                return task;
            }

            if (task.isSummary) return task;

            if (task.start && task.end) {
                const calculatedDuration = calculateDuration(task.start, task.end, task.durationType);
                if (calculatedDuration > 0) {
                    task.duration = parseInt(calculatedDuration);
                } else {
                    task.duration = 1;
                }
            } else if (task.start) {
                task.duration = 1;
                task.end = task.start;
            } else {
                task.duration = 1;
            }

            task.duration = parseInt(task.duration) || 1;
            return task;
        });
    }

    /**
     * 更新 Gantt 实例
     */
    function initializeGanttData(tasks, projectInfo) {
        if (!global.gantt) return;

        const normalizedTasks = normalizeAndFixTasks(tasks);
        global.gantt.tasks = normalizedTasks;

        if (normalizedTasks.length > 0) {
            global.gantt.switchToOverviewMode();
        } else {
            global.gantt.calculateDateRange();
            global.gantt.render();
        }
        
        global.gantt.updateHeight();

        const projName = (projectInfo && projectInfo.name) ? projectInfo.name : '未命名项目';
        document.title = `${projName} - 云端甘特图`;
        
        const titleEl = document.getElementById('projectTitle');
        const versionEl = document.getElementById('versionBadge');
        
        if (titleEl) titleEl.textContent = projName;
        if (versionEl && projectInfo.version) versionEl.textContent = `v${projectInfo.version}`;
    }

    // ==================== 复原的辅助解析函数 (不可省略) ====================

    /**
     * 解析 JSON 任务数据
     */
    function parseJSONTasks(data) {
        const today = new Date();
        const uidToIdMap = {};
        
        // 1. 第一遍：创建任务对象
        const tasks = data.tasks.map(jt => {
            const task = createTaskFromTemplate(jt, today);
            uidToIdMap[jt.uid] = task.id;
            return task;
        });
        
        // 2. 第二遍：解析引用关系
        data.tasks.forEach((jt, i) => {
            tasks[i].parentId = resolveRef(jt.parentId, uidToIdMap, 'temp-parent-');
            
            tasks[i].children = (jt.children || [])
                .map(ref => resolveRef(ref, uidToIdMap, 'temp-child-'))
                .filter(Boolean);
            
            tasks[i].dependencies = (jt.dependencies || [])
                .map(dep => {
                    const targetUid = typeof dep === 'object' ? dep.taskUid : dep;
                    const depId = resolveRef(targetUid, uidToIdMap);
                    
                    return depId ? { 
                        taskId: depId, 
                        type: dep.type || 'FS', 
                        lag: dep.lag || 0 
                    } : null;
                })
                .filter(Boolean);
        });
        
        return tasks;
    }

    /**
     * 从模板创建任务
     */
    function createTaskFromTemplate(jt, baseDate) {
        const startOffset = jt.startOffset !== undefined ? jt.startOffset : 0;
        const start = addDays(baseDate, startOffset);
        
        const durationType = jt.durationType || 'workdays';
        const duration = parseInt(jt.duration) || 1;
        
        const end = calculateEndDate(start, duration, durationType);
        
        return {
            id: generateId(),
            uid: jt.uid,
            name: jt.name || '未命名任务',
            start: formatDate(start),
            end: formatDate(end),
            duration: duration,
            durationType: durationType,
            progress: jt.progress || 0,
            isMilestone: !!jt.isMilestone,
            isSummary: !!jt.isSummary,
            parentId: null,
            children: [],
            outlineLevel: jt.outlineLevel || 1,
            wbs: jt.wbs || '',
            priority: jt.priority || 'medium',
            notes: jt.notes || '',
            isCollapsed: !!jt.isCollapsed,
            dependencies: []
        };
    }

    /**
     * 解析引用 (辅助函数)
     */
    function resolveRef(ref, map, prefix = '') {
        if (ref === null || ref === undefined) return null;
        if (typeof ref === 'string' && ref.startsWith('task-')) return ref;
        if (prefix && typeof ref === 'string' && ref.startsWith(prefix)) {
            const uid = parseInt(ref.replace(prefix, ''));
            return map[uid] || null;
        }
        if (typeof ref === 'number') {
            return map[ref] || null;
        }
        return null;
    }

    /**
     * 获取最小数据集
     */
    function getMinimalTasks() {
        const today = new Date();
        return [
            { 
                id: generateId(),
                name: '项目启动', 
                start: formatDate(today), 
                end: formatDate(today), 
                duration: 1, 
                durationType: 'days',
                progress: 0 
            }
        ];
    }

    initApp();

})(typeof window !== 'undefined' ? window : this);