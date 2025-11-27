// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Epsilon45-Unabridged                                     ▓▓
// ▓▓ 状态: 100% 完整代码，包含所有解析逻辑和历史追赶初始化          ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 应用启动入口
     */
    async function initApp() {
        // 1. 立即初始化空 UI（骨架屏效果），防止页面空白
        const emptyTasks = [];
        // 实例化 GanttChart，此时 tasks 为空
        const gantt = new GanttChart('#gantt', emptyTasks, { showTaskNames: true });
        global.gantt = gantt; // 挂载全局实例
        
        // 绑定窗口调整事件 (使用防抖)
        if (typeof debounce === 'function') {
            window.addEventListener('resize', debounce(() => gantt.updateHeight(), 100), { passive: true });
        } else {
            window.addEventListener('resize', () => gantt.updateHeight(), { passive: true });
        }
        
        // 触发布局
        gantt.updateHeight();
        console.log('⚡ UI 框架已就绪');

        // 2. 异步加载真实数据
        await loadDataStrategy();
    }

    /**
     * 数据加载策略：云端 KV -> 本地 JSON -> 最小数据集
     */
    async function loadDataStrategy() {
        let loaded = false;

        // 策略A: 尝试从云端 KV 获取最新存档
        try {
            console.log('☁️ 正在检查云端存档...');
            if (typeof listKVFiles === 'function') {
                const files = await listKVFiles();
                // 过滤掉历史记录文件，只看主项目文件
                const projectFiles = files.filter(f => !f.name.endsWith('_history.json'));

                if (projectFiles && projectFiles.length > 0) {
                    // 按时间倒序，第一个是其最新的
                    const latestFile = projectFiles[0];
                    if(typeof addLog === 'function') addLog(`☁️ 正在同步云端数据: ${latestFile.name}`);

                    const cloudData = await loadFromKV(latestFile.name);
                    
                    const tasksRaw = Array.isArray(cloudData) ? cloudData : (cloudData.tasks || []);
                    const projectInfo = cloudData.project || { name: latestFile.name };
                    
                    // ⭐ 获取快照锚点 ID (用于增量追赶)
                    const lastActionId = projectInfo.lastActionId || null;

                    // 标准化数据 (确保有ID)
                    const tasks = tasksRaw.map(t => ({
                        ...t,
                        id: t.id || generateId(),
                        dependencies: t.dependencies || []
                    }));

                    initializeGanttData(tasks, projectInfo);
                    
                    // ⭐ 初始化历史管理器并追赶进度
                    if (window.historyManager) {
                        await window.historyManager.init(latestFile.name, lastActionId);
                        // 追赶后刷新视图确保最新状态
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
            // 不 alert，静默降级到本地数据
        }

        // 策略B: 加载本地演示数据 (initial-tasks.json)
        if (!loaded) {
            try {
                console.log('📂 正在加载本地演示数据...');
                const response = await fetch('data/initial-tasks.json?v=1.0');
                if (response.ok) {
                    const data = await response.json();
                    
                    // 解析逻辑
                    const tasks = parseJSONTasks(data);
                    
                    initializeGanttData(tasks, data.project);
                    loaded = true;
                    
                    // 本地演示数据：生成一个临时文件名，初始化历史
                    const tempName = `Demo_Project_${Date.now()}.json`;
                    if (window.historyManager) window.historyManager.init(tempName, null);
                    
                    if(typeof addLog === 'function') addLog('📂 已加载本地演示数据');
                }
            } catch (error) {
                console.warn('⚠️ 本地数据加载失败:', error);
            }
        }

        // 策略C: 最小数据集兜底
        if (!loaded) {
            console.warn('⚠️ 所有加载策略均失败，使用最小数据集');
            const minTasks = getMinimalTasks();
            initializeGanttData(minTasks, { name: '新项目' });
            
            // ⭐ 关键：新建项目立即分配文件名，确保历史记录可用
            const newFileName = `Project_Untitled_${Date.now()}.json`;
            if (window.historyManager) window.historyManager.init(newFileName, null);
            
            if(typeof addLog === 'function') addLog('⚠️ 已初始化空项目');
        }
    }

    /**
     * 数据标准化与清洗
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
        if (versionEl) versionEl.textContent = projVersion;
    }

    // ==================== 辅助解析函数 (完整保留) ====================

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
            const task = tasks[i];
            
            task.parentId = resolveRef(jt.parentId, uidToIdMap, 'temp-parent-');
            
            task.children = (jt.children || [])
                .map(ref => resolveRef(ref, uidToIdMap, 'temp-child-'))
                .filter(Boolean);
            
            task.dependencies = (jt.dependencies || [])
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

    // 启动应用
    initApp();

})(typeof window !== 'undefined' ? window : this);