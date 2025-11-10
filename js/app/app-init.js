// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Epsilon10 - 最终优化版（70行，消除所有冗余）             ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 从JSON文件加载初始任务
     */
    async function loadInitialTasks() {
        try {
            const response = await fetch('data/initial-tasks.json?t=' + Date.now());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const tasks = parseJSONTasks(data);
            
            initializeGantt(tasks, data.project);
            
        } catch (error) {
            console.warn('⚠️ 加载失败，使用最小数据集:', error.message);
            initializeGantt(getMinimalTasks(), { name: '默认项目' });
        }
    }

    /**
     * 解析JSON任务数据
     */
    function parseJSONTasks(data) {
        const today = new Date();
        const uidToIdMap = {};
        
        // 创建任务并建立映射
        const tasks = data.tasks.map(jt => {
            const task = createTask(jt, today);
            uidToIdMap[jt.uid] = task.id;
            return task;
        });
        
        // 处理关系引用
        data.tasks.forEach((jt, i) => {
            tasks[i].parentId = resolveRef(jt.parentId, uidToIdMap, 'temp-parent-');
            tasks[i].children = (jt.children || []).map(ref => resolveRef(ref, uidToIdMap, 'temp-child-')).filter(Boolean);
            tasks[i].dependencies = (jt.dependencies || []).map(dep => {
                const depId = resolveRef(typeof dep === 'object' ? dep.taskUid : dep, uidToIdMap);
                return depId ? { taskId: depId, type: dep.type || 'FS', lag: dep.lag || 0 } : null;
            }).filter(Boolean);
        });
        
        return tasks;
    }


    /**
     * 创建任务对象（支持工期类型）
     */
    function createTask(jt, baseDate) {
        const start = addDays(baseDate, jt.startOffset || 0);
        
        // ⭐ 根据工期类型计算结束日期
        const durationType = jt.durationType || 'workdays';
        const end = calculateEndDate(start, jt.duration || 0, durationType);
        
        return {
            id: generateId(),
            uid: jt.uid,
            name: jt.name,
            start: formatDate(start),
            end: formatDate(end),
            duration: jt.duration || 0,
            durationType: durationType,  // ⭐ 新增字段
            progress: jt.progress || 0,
            isMilestone: jt.isMilestone || false,
            isSummary: jt.isSummary || false,
            parentId: jt.parentId || null,
            children: jt.children || [],
            outlineLevel: jt.outlineLevel || 1,
            wbs: jt.wbs || '',
            priority: jt.priority || 'medium',
            notes: jt.notes || '',
            isCollapsed: jt.isCollapsed || false,
            dependencies: jt.dependencies || []
        };
    }


    /**
     * 解析临时引用
     */
    function resolveRef(ref, map, prefix = '') {
        if (!ref) return null;
        if (prefix && typeof ref === 'string' && ref.startsWith(prefix)) {
            const uid = parseInt(ref.replace(prefix, ''));
            return map[uid] || null;
        }
        return typeof ref === 'number' ? map[ref] : ref;
    }

    /**
     * 获取最小数据集（降级方案）
     */
    function getMinimalTasks() {
        const today = new Date();
        return [
            { name: '网站设计', start: formatDate(addDays(today, -5)), duration: 8, progress: 65 },
            { name: '内容编写', start: formatDate(addDays(today, 3)), duration: 8, progress: 30 },
            { name: '项目上线', start: formatDate(addDays(today, 12)), duration: 0, isMilestone: true }
        ];
    }

    /**
     * 初始化甘特图实例
     */
    function initializeGantt(tasks, projectInfo) {
        const gantt = new GanttChart('#gantt', tasks, { showTaskNames: true });
        global.gantt = gantt;
        
        // 窗口监听
        window.addEventListener('resize', debounce(() => gantt.updateHeight(), 100), { passive: true });
        
        // 日志
        if (projectInfo?.name) addLog(`📊 ${projectInfo.name}`);
        addLog(`✅ 甘特图已就绪（${tasks.length} 个任务）`);
        
        console.log('✅ app-init.js loaded (Epsilon10)');
        
        // 初始化高度
        setTimeout(() => gantt.updateHeight(), 500);
    }

    // 启动
    loadInitialTasks();

})(typeof window !== 'undefined' ? window : this);
