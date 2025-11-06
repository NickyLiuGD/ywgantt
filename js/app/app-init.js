// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 应用初始化模块                                                  ▓▓
// ▓▓ 路径: js/app/app-init.js                                       ▓▓
// ▓▓ 版本: Gamma8                                                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // 初始化任务数据
    const today = new Date();
    const initialTasks = [
        {
            id: generateId(),
            name: '网站设计',
            start: formatDate(addDays(today, -5)),
            end: formatDate(addDays(today, 2)),
            progress: 65,
            dependencies: []
        },
        {
            id: generateId(),
            name: '内容编写',
            start: formatDate(addDays(today, 3)),
            end: formatDate(addDays(today, 10)),
            progress: 30,
            dependencies: []
        },
        {
            id: generateId(),
            name: '样式开发',
            start: formatDate(addDays(today, 5)),
            end: formatDate(addDays(today, 8)),
            progress: 45,
            dependencies: []
        },
        {
            id: generateId(),
            name: '测试审核',
            start: formatDate(addDays(today, -2)),
            end: formatDate(addDays(today, 1)),
            progress: 80,
            dependencies: []
        },
        {
            id: generateId(),
            name: '项目上线',
            start: formatDate(addDays(today, 12)),
            end: formatDate(addDays(today, 14)),
            progress: 0,
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
    addLog('💡 提示：点击任务名称或任务条可编辑');
    addLog('🎯 新功能：选中任务自动居中显示');
    addLog('📊 紧凑模式：行高40px，列宽50px');
    
    console.log('✅ app-init.js loaded successfully');
    console.log('📊 甘特图版本: Gamma8 - 紧凑优化版');

    // 初始化时更新高度
    setTimeout(() => {
        if (gantt && typeof gantt.updateHeight === 'function') {
            gantt.updateHeight();
            addLog('✅ 甘特图高度已初始化');
        }
    }, 500);

})(typeof window !== 'undefined' ? window : this);
