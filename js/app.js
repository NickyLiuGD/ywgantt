/**
 * 应用主文件
 * 负责初始化甘特图和绑定所有事件
 */

// ==================== 初始化任务数据 ====================
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

// ==================== 创建甘特图实例 ====================
const gantt = new GanttChart('#gantt', initialTasks);

// ==================== 初始化 ====================
bindEvents(gantt);  // 从 event-bindings.js 调用

// ==================== 初始化日志 ====================
addLog('🎉 甘特图已就绪！拖动任务条可编辑日期，拖动两端可调整时长');
addLog('💡 提示：双击任务名称或任务条可以快速编辑任务名称');
