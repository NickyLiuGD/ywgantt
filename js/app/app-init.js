// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Epsilon5 - 完整数据结构                                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    const today = new Date();
    
    // ⭐ 初始化任务数据（所有字段完整）
    const initialTasks = [
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
            name: '样式开发',
            start: formatDate(addDays(today, 5)),
            end: formatDate(addDays(today, 8)),
            duration: 4,
            progress: 45,
            isMilestone: false,
            isSummary: false,
            parentId: null,
            children: [],
            outlineLevel: 1,
            wbs: '3',
            priority: 'medium',
            notes: '',
            isCollapsed: false,
            dependencies: []
        },
        {
            id: generateId(),
            uid: 4,
            name: '测试审核',
            start: formatDate(addDays(today, -2)),
            end: formatDate(addDays(today, 1)),
            duration: 4,
            progress: 80,
            isMilestone: false,
            isSummary: false,
            parentId: null,
            children: [],
            outlineLevel: 1,
            wbs: '4',
            priority: 'high',
            notes: '',
            isCollapsed: false,
            dependencies: []
        },
        {
            id: generateId(),
            uid: 5,
            name: '项目上线',
            start: formatDate(addDays(today, 12)),
            end: formatDate(addDays(today, 12)),
            duration: 0,
            progress: 100,
            isMilestone: true,  // ⭐ 里程碑
            isSummary: false,
            parentId: null,
            children: [],
            outlineLevel: 1,
            wbs: '5',
            priority: 'high',
            notes: '项目正式上线，发布到生产环境',
            isCollapsed: false,
            dependencies: []
        }
    ];

    // 创建甘特图实例
    const gantt = new GanttChart('#gantt', initialTasks, {
        showTaskNames: true
    });
    global.gantt = gantt;

    // 防抖函数
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

    // 窗口大小监听
    const handleResize = debounce(() => {
        if (gantt && typeof gantt.updateHeight === 'function') {
            gantt.updateHeight();
        }
    }, 100);

    window.addEventListener('resize', handleResize, { passive: true });

    // 初始化日志
    addLog('✅ 甘特图已就绪！');
    addLog('💡 提示：点击任务可编辑，支持里程碑和层级任务');
    addLog('🎯 新功能：汇总任务自动计算时间，WBS自动生成');
    addLog('📊 紧凑模式：行高40px，列宽50px');
    
    console.log('✅ app-init.js loaded successfully (Epsilon5)');
    console.log('📊 甘特图版本: Epsilon5 - 专业项目管理版');

    // 初始化时更新高度
    setTimeout(() => {
        if (gantt && typeof gantt.updateHeight === 'function') {
            gantt.updateHeight();
            addLog('✅ 甘特图高度已初始化');
        }
    }, 500);

})(typeof window !== 'undefined' ? window : this);
