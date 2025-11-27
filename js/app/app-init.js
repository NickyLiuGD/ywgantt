// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Epsilon60-TimestampSync                                  ▓▓
// ▓▓ 状态: 逻辑完整，向 HistoryManager 传递快照时间戳               ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    async function initApp() {
        const emptyTasks = [];
        const gantt = new GanttChart('#gantt', emptyTasks, { showTaskNames: true });
        global.gantt = gantt; 
        
        if (typeof debounce === 'function') {
            window.addEventListener('resize', debounce(() => gantt.updateHeight(), 100), { passive: true });
        } else {
            window.addEventListener('resize', () => gantt.updateHeight(), { passive: true });
        }
        
        gantt.updateHeight();
        console.log('⚡ UI 框架已就绪');

        await loadDataStrategy();
    }

    async function loadDataStrategy() {
        let loaded = false;

        // 策略A: 云端加载
        try {
            console.log('☁️ 正在检查云端存档...');
            if (typeof listKVFiles === 'function') {
                const files = await listKVFiles();
                const projectFiles = files.filter(f => {
                    const realKey = f.key || f.name; 
                    return !realKey.endsWith('_history.json');
                });

                if (projectFiles && projectFiles.length > 0) {
                    const latestFile = projectFiles[0];
                    const fileKey = latestFile.key || latestFile.name;
                    const displayName = latestFile.name;

                    if(typeof addLog === 'function') addLog(`☁️ 正在同步云端数据: ${displayName}`);

                    const cloudData = await loadFromKV(fileKey);
                    const tasksRaw = Array.isArray(cloudData) ? cloudData : (cloudData.tasks || []);
                    const projectInfo = cloudData.project || { name: displayName };
                    
                    // ⭐ 获取快照信息
                    const lastActionId = projectInfo.lastActionId || null;
                    const snapshotTimestamp = projectInfo.updated || 0;

                    const tasks = tasksRaw.map(t => ({...t, id: t.id || generateId(), dependencies: t.dependencies || []}));

                    initializeGanttData(tasks, projectInfo);
                    
                    // ⭐ 初始化历史，传入快照时间戳
                    if (window.historyManager) {
                        window.historyManager.filename = fileKey;
                        await window.historyManager.init(fileKey, lastActionId, snapshotTimestamp);
                        if (global.gantt) global.gantt.render();
                    }
                    
                    loaded = true;
                    if(typeof addLog === 'function') addLog(`✅ 云端同步完成 (${tasks.length} 个任务)`);
                } else {
                    console.log('☁️ 云端无存档，跳过。');
                }
            }
        } catch (error) {
            console.warn('⚠️ 云端连接失败/离线:', error.message);
        }

        // 策略B: 本地演示数据
        if (!loaded) {
            try {
                console.log('📂 正在加载本地演示数据...');
                const response = await fetch('data/initial-tasks.json?v=1.0');
                if (response.ok) {
                    const data = await response.json();
                    const tasks = parseJSONTasks(data);
                    initializeGanttData(tasks, data.project);
                    loaded = true;
                    const tempName = `Demo_Project_${Date.now()}.json`;
                    if (window.historyManager) window.historyManager.init(tempName, null);
                    if(typeof addLog === 'function') addLog('📂 已加载本地演示数据');
                }
            } catch(e){}
        }
        
        // 策略C: 新建空项目
        if (!loaded) {
            const minTasks = getMinimalTasks();
            initializeGanttData(minTasks, { name: '新项目' });
            const newFileName = typeof generateProjectInternalFilename === 'function' ? generateProjectInternalFilename() : `proj_${Date.now()}.json`;
            if (window.historyManager) window.historyManager.init(newFileName, null);
            if(typeof addLog === 'function') addLog('⚠️ 已初始化新项目');
        }
    }
    
    /**
     * 数据标准化与清洗
     * 确保任务数据的完整性，修复缺失字段
     */
    function normalizeAndFixTasks(tasks) {
        if (!Array.isArray(tasks)) return [];

        // console.log('🔧 正在执行数据标准化与工期校准...');
        
        return tasks.map(task => {
            // 1. 确保工期类型存在
            if (!task.durationType) {
                task.durationType = 'days'; 
            }

            // 2. 里程碑特殊处理
            if (task.isMilestone) {
                task.duration = 0;
                if (task.start && !task.end) task.end = task.start;
                return task;
            }

            // 3. 汇总任务特殊处理
            if (task.isSummary) {
                return task;
            }

            // 4. 普通任务：根据 Start 和 End 反算 Duration
            // 解决“显示为1天”的问题
            if (task.start && task.end) {
                const calculatedDuration = calculateDuration(task.start, task.end, task.durationType);
                
                if (calculatedDuration > 0) {
                    task.duration = parseInt(calculatedDuration);
                } else {
                    task.duration = 1;
                }
            } else if (task.start && !task.end) {
                task.duration = 1;
                task.end = task.start;
            } else {
                task.duration = 1;
            }

            // 5. 确保 duration 是数字类型
            task.duration = parseInt(task.duration) || 1;

            return task;
        });
    }

    /**
     * 更新 Gantt 实例的数据并渲染
     */
    function initializeGanttData(tasks, projectInfo) {
        if (!global.gantt) return;

        // 在赋值前，先进行数据清洗和工期校准
        const normalizedTasks = normalizeAndFixTasks(tasks);

        global.gantt.tasks = normalizedTasks;

        // 如果有任务，直接计算全貌参数并渲染
        if (normalizedTasks.length > 0) {
            global.gantt.switchToOverviewMode();
            console.log('🔭 已自动切换至全貌视图');
        } else {
            global.gantt.calculateDateRange();
            global.gantt.render();
        }
        
        global.gantt.updateHeight();

        const projName = (projectInfo && projectInfo.name) ? projectInfo.name : '未命名项目';
        const projVersion = (projectInfo && projectInfo.version) ? `v${projectInfo.version}` : 'v1.0';

        document.title = `${projName} - 云端甘特图`;
        
        const titleEl = document.getElementById('projectTitle');
        const versionEl = document.getElementById('versionBadge');
        
        if (titleEl) titleEl.textContent = projName;
        if (versionEl && projectInfo.version) versionEl.textContent = projVersion;
    }

    // ============================================================
    // 辅助解析函数 (完全展开复原)
    // ============================================================

    /**
     * 解析 JSON 任务数据
     * 将扁平或嵌套的 JSON 结构转换为 Gantt 核心需要的对象结构
     */
    function parseJSONTasks(data) {
        const today = new Date();
        const uidToIdMap = {};
        
        // 1. 第一遍循环：创建任务对象，建立 UID -> ID 映射
        const tasks = data.tasks.map(jt => {
            const task = createTaskFromTemplate(jt, today);
            uidToIdMap[jt.uid] = task.id;
            return task;
        });
        
        // 2. 第二遍循环：解析引用关系 (Parent/Children/Dependencies)
        data.tasks.forEach((jt, i) => {
            const task = tasks[i];
            
            // 解析父任务引用
            task.parentId = resolveRef(jt.parentId, uidToIdMap, 'temp-parent-');
            
            // 解析子任务引用
            task.children = (jt.children || [])
                .map(ref => resolveRef(ref, uidToIdMap, 'temp-child-'))
                .filter(Boolean); // 过滤掉无效ID
            
            // 解析依赖关系
            task.dependencies = (jt.dependencies || [])
                .map(dep => {
                    const targetUid = typeof dep === 'object' ? dep.taskUid : dep;
                    const depId = resolveRef(targetUid, uidToIdMap);
                    
                    // 如果找到了依赖ID，返回标准依赖对象
                    if (depId) {
                        return { 
                            taskId: depId, 
                            type: dep.type || 'FS', 
                            lag: dep.lag || 0 
                        };
                    }
                    return null;
                })
                .filter(Boolean);
        });
        
        return tasks;
    }

    /**
     * 从模板创建任务 (辅助 parseJSONTasks)
     */
    function createTaskFromTemplate(jt, baseDate) {
        const startOffset = jt.startOffset !== undefined ? jt.startOffset : 0;
        const start = addDays(baseDate, startOffset);
        
        const durationType = jt.durationType || 'workdays';
        const duration = parseInt(jt.duration) || 1;
        
        // 计算结束日期
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
     * 处理 temp-parent-123 或直接的数字 UID
     */
    function resolveRef(ref, map, prefix = '') {
        if (ref === null || ref === undefined) return null;
        
        // 如果已经是 task-xxx 格式的 ID，直接返回
        if (typeof ref === 'string' && ref.startsWith('task-')) return ref;
        
        // 如果是带前缀的字符串 (如 temp-parent-1)
        if (prefix && typeof ref === 'string' && ref.startsWith(prefix)) {
            const uid = parseInt(ref.replace(prefix, ''));
            return map[uid] || null;
        }
        
        // 如果是纯数字 UID
        if (typeof ref === 'number') {
            return map[ref] || null;
        }
        
        return null;
    }

    /**
     * 获取最小数据集 (用于初始化空项目)
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

    // 启动应用
    initApp();

})(typeof window !== 'undefined' ? window : this);