// js/data/tasks.js
const today = new Date();

export const initialTasks = [
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