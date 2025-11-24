// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Epsilon21 - 完整逻辑复原 + 云端优先 + 非阻塞UI           ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 应用启动入口
     */
    async function initApp() {
        // 1. 立即初始化空 UI（骨架屏效果），防止页面空白
        const emptyTasks = [];
        const gantt = new GanttChart('#gantt', emptyTasks, { showTaskNames: true });
        global.gantt = gantt; // 挂载全局实例
        
        // 绑定窗口调整事件
        window.addEventListener('resize', debounce(() => gantt.updateHeight(), 100), { passive: true });
        
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
            const files = await listKVFiles();

            if (files && files.length > 0) {
                // 按时间倒序，第一个是其最新的
                const latestFile = files[0];
                addLog(`☁️ 正在同步云端数据: ${latestFile.name}`);

                const cloudData = await loadFromKV(latestFile.name);
                
                // 云端数据通常已经是标准格式，但也需防范
                const tasksRaw = Array.isArray(cloudData) ? cloudData : (cloudData.tasks || []);
                const projectInfo = cloudData.project || { name: latestFile.name };

                // 标准化数据 (确保有ID)
                const tasks = tasksRaw.map(t => ({
                    ...t,
                    id: t.id || generateId(),
                    dependencies: t.dependencies || []
                }));

                initializeGanttData(tasks, projectInfo);
                loaded = true;
                addLog(`✅ 云端同步完成 (${tasks.length} 个任务)`);
            } else {
                console.log('☁️ 云端无存档，跳过。');
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
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                
                // ⭐ 关键：复原的解析逻辑，处理相对日期
                const tasks = parseJSONTasks(data);
                
                initializeGanttData(tasks, data.project);
                loaded = true;
                addLog('📂 已加载本地演示数据');
            } catch (error) {
                console.warn('⚠️ 本地数据加载失败:', error);
            }
        }

        // 策略C: 最小数据集兜底
        if (!loaded) {
            console.warn('⚠️ 所有加载策略均失败，使用最小数据集');
            const minTasks = getMinimalTasks();
            initializeGanttData(minTasks, { name: '新项目' });
            addLog('⚠️ 已初始化空项目');
        }
    }

    /**
     * 更新 Gantt 实例的数据并渲染
     */
    function initializeGanttData(tasks, projectInfo) {
        if (!global.gantt) return;

        global.gantt.tasks = tasks;

        // 如果有任务，直接计算全貌参数并渲染
        if (tasks.length > 0) {
            // switchToOverviewMode 内部会包含 calculateDateRange 和 render
            global.gantt.switchToOverviewMode();
            console.log('🔭 已自动切换至全貌视图');
        } else {
            // 无任务时的降级处理
            global.gantt.calculateDateRange();
            global.gantt.render();
        }
        
        global.gantt.updateHeight();

        if (projectInfo && projectInfo.name) {
            document.title = `${projectInfo.name} - 云端甘特图`;
        }
    }

    // ==================== 复原的业务逻辑 (关键) ====================

    /**
     * 解析 JSON 任务数据 (处理 startOffset, UID映射, 父子关系)
     */
    function parseJSONTasks(data) {
        const today = new Date();
        const uidToIdMap = {};
        
        // 1. 第一遍：创建任务对象并建立 UID -> UUID 映射
        const tasks = data.tasks.map(jt => {
            const task = createTaskFromTemplate(jt, today);
            uidToIdMap[jt.uid] = task.id;
            return task;
        });
        
        // 2. 第二遍：解析引用关系 (parentId, children, dependencies)
        data.tasks.forEach((jt, i) => {
            // 解析父任务 ID
            tasks[i].parentId = resolveRef(jt.parentId, uidToIdMap, 'temp-parent-');
            
            // 解析子任务 ID 列表
            tasks[i].children = (jt.children || [])
                .map(ref => resolveRef(ref, uidToIdMap, 'temp-child-'))
                .filter(Boolean); // 过滤掉无效引用
            
            // 解析依赖关系
            tasks[i].dependencies = (jt.dependencies || [])
                .map(dep => {
                    // 兼容 {taskUid: 1} 和 直接UID 的写法
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
     * 从模板创建任务 (计算 startOffset)
     */
    function createTaskFromTemplate(jt, baseDate) {
        // 如果有 startOffset，基于 baseDate 计算；否则默认今天
        const startOffset = jt.startOffset !== undefined ? jt.startOffset : 0;
        const start = addDays(baseDate, startOffset);
        
        const durationType = jt.durationType || 'workdays';
        const duration = jt.duration !== undefined ? jt.duration : 1;
        
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
            parentId: null, // 稍后填充
            children: [],   // 稍后填充
            outlineLevel: jt.outlineLevel || 1,
            wbs: jt.wbs || '',
            priority: jt.priority || 'medium',
            notes: jt.notes || '',
            isCollapsed: !!jt.isCollapsed,
            dependencies: [] // 稍后填充
        };
    }

    /**
     * 解析引用 (辅助函数)
     * 支持直接 ID，或带有前缀的临时 ID 字符串
     */
    function resolveRef(ref, map, prefix = '') {
        if (ref === null || ref === undefined) return null;
        
        // 情况1: 已经是真实 UUID (虽然在导入模板时少见，但为了健壮性)
        if (typeof ref === 'string' && ref.startsWith('task-')) return ref;
        
        // 情况2: 带前缀的字符串 (e.g., "temp-parent-1")
        if (prefix && typeof ref === 'string' && ref.startsWith(prefix)) {
            const uid = parseInt(ref.replace(prefix, ''));
            return map[uid] || null;
        }
        
        // 情况3: 直接数字 UID
        if (typeof ref === 'number') {
            return map[ref] || null;
        }
        
        return null;
    }

    /**
     * 获取最小数据集（兜底方案）
     */
    function getMinimalTasks() {
        const today = new Date();
        return [
            { 
                id: generateId(),
                name: '项目启动', 
                start: formatDate(today), 
                duration: 1, 
                progress: 0 
            }
        ];
    }

    // 启动应用
    initApp();

})(typeof window !== 'undefined' ? window : this);