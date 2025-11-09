// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Epsilon8 - 从JSON文件加载初始数据                        ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 从JSON数据创建任务对象
     * @param {Object} jsonTask - JSON格式的任务数据
     * @param {Date} baseDate - 基准日期（今天）
     * @returns {Object} 完整的任务对象
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
     * 加载初始任务数据
     */
    async function loadInitialTasks() {
        try {
            const response = await fetch('data/initial-tasks.json?t=' + Date.now());
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const today = new Date();
            
            // 转换JSON数据为任务对象
            const tasks = data.tasks.map(jsonTask => createTaskFromJSON(jsonTask, today));
            
            // 创建甘特图实例
            const gantt = new GanttChart('#gantt', tasks, {
                showTaskNames: true
            });
            global.gantt = gantt;
            
            // 记录项目信息
            if (data.project) {
                addLog(`📊 项目：${data.project.name}`);
                addLog(`📝 说明：${data.project.description}`);
            }
            addLog(`✅ 已加载 ${tasks.length} 个初始任务`);
            
            // 绑定窗口大小监听
            setupWindowResize();
            
            // 初始化日志
            addLog('💡 提示：点击任务可编辑，支持里程碑和层级任务');
            addLog('🎯 新功能：汇总任务自动计算时间，WBS自动生成');
            addLog('📊 紧凑模式：行高40px，列宽50px');
            
            console.log('✅ app-init.js loaded successfully (Epsilon8)');
            console.log('📊 甘特图版本: Epsilon8 - 数据分离版');
            
            // 初始化高度
            setTimeout(() => {
                if (gantt && typeof gantt.updateHeight === 'function') {
                    gantt.updateHeight();
                    addLog('✅ 甘特图高度已初始化');
                }
            }, 500);
            
        } catch (error) {
            console.error('❌ 加载初始任务数据失败:', error);
            
            // 降级方案：使用内置默认数据
            addLog('⚠️ 无法加载 initial-tasks.json，使用内置默认数据');
            loadFallbackTasks();
        }
    }

    /**
     * 降级方案：加载内置默认任务
     */
    function loadFallbackTasks() {
        const today = new Date();
        
        const fallbackTasks = [
            {
                id: generateId(),
                uid: 1,
                name: '网站设计',
                start: formatDate(addDays(today, -5)),
                end: formatDate(addDays(today, 2)),
                duration: 8,
                progress: 65,
                isMilestone: false,
                isSummary: false,
                parentId: null,
                children: [],
                outlineLevel: 1,
                wbs: '1',
                priority: 'high',
                notes: '',
                isCollapsed: false,
                dependencies: []
            },
            {
                id: generateId(),
                uid: 2,
                name: '内容编写',
                start: formatDate(addDays(today, 3)),
                end: formatDate(addDays(today, 10)),
                duration: 8,
                progress: 30,
                isMilestone: false,
                isSummary: false,
                parentId: null,
                children: [],
                outlineLevel: 1,
                wbs: '2',
                priority: 'medium',
                notes: '',
                isCollapsed: false,
                dependencies: []
            },
            {
                id: generateId(),
                uid: 3,
                name: '项目上线',
                start: formatDate(addDays(today, 12)),
                end: formatDate(addDays(today, 12)),
                duration: 0,
                progress: 100,
                isMilestone: true,
                isSummary: false,
                parentId: null,
                children: [],
                outlineLevel: 1,
                wbs: '3',
                priority: 'high',
                notes: '项目正式上线',
                isCollapsed: false,
                dependencies: []
            }
        ];

        const gantt = new GanttChart('#gantt', fallbackTasks, {
            showTaskNames: true
        });
        global.gantt = gantt;
        
        setupWindowResize();
        
        addLog('✅ 甘特图已就绪（使用内置数据）');
        
        setTimeout(() => {
            if (gantt && typeof gantt.updateHeight === 'function') {
                gantt.updateHeight();
            }
        }, 500);
    }

    /**
     * 设置窗口大小监听
     */
    function setupWindowResize() {
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        const handleResize = debounce(() => {
            if (gantt && typeof gantt.updateHeight === 'function') {
                gantt.updateHeight();
            }
        }, 100);

        window.addEventListener('resize', handleResize, { passive: true });
    }

    // ==================== 启动应用 ====================
    loadInitialTasks();

})(typeof window !== 'undefined' ? window : this);
