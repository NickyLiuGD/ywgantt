// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Epsilon22-Normalize - 强制数据标准化，修复工期问题         ▓▓
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
                
                // 解析逻辑
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
     * ⭐⭐⭐ 核心修复：数据标准化与清洗函数
     * 根据 Start 和 End 日期，反向计算并覆盖 Duration
     * 确保甘特图条（视觉）与编辑表单（数据）绝对一致
     */
    function normalizeAndFixTasks(tasks) {
        if (!Array.isArray(tasks)) return [];

        console.log('🔧 正在执行数据标准化与工期校准...');
        
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

            // 3. 汇总任务特殊处理（通常由子任务决定，但在初始加载时也需要基本校验）
            if (task.isSummary) {
                // 汇总任务不做工期强制计算，依赖 updateHeight 时的 recalculate
                return task;
            }

            // 4. ⭐ 普通任务：根据 Start 和 End 反算 Duration
            // 这是解决“显示为1天”问题的关键。我们信任日期（因为甘特图是按日期画的），
            // 然后强行修正 duration 字段，使其与日期匹配。
            if (task.start && task.end) {
                const calculatedDuration = calculateDuration(task.start, task.end, task.durationType);
                
                // 只有当计算出的工期有效且大于0时才覆盖
                if (calculatedDuration > 0) {
                    // 将字符串或错误的数字覆盖为正确的整数
                    task.duration = parseInt(calculatedDuration);
                } else {
                    // 异常情况兜底
                    task.duration = 1;
                }
            } else if (task.start && !task.end) {
                // 只有开始日期，缺省工期1天
                task.duration = 1;
                task.end = task.start; // 临时修正
            } else {
                // 数据严重缺失
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

        // ⭐ 在赋值前，先进行数据清洗和工期校准
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

        // 1. 更新浏览器标签页标题
        document.title = `${projName} - 云端甘特图`;

        // 2. 更新界面 Header 标题
        const titleEl = document.getElementById('projectTitle');
        const versionEl = document.getElementById('versionBadge');
        
        if (titleEl) titleEl.textContent = projName;
        if (versionEl) versionEl.textContent = projVersion;
    }

    // ==================== 复原的业务逻辑 (关键) ====================

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
                end: formatDate(today), // 确保有结束日期
                duration: 1, 
                durationType: 'days',
                progress: 0 
            }
        ];
    }

    // 启动应用
    initApp();

})(typeof window !== 'undefined' ? window : this);