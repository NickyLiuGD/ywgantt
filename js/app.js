// js/app.js
import { initialTasks } from './data/tasks.js';
import { showTaskForm } from './ui/task-form.js';
import { initControls } from './ui/controls.js';
import { initSettings } from './ui/settings.js';
import { initLogger } from './ui/logger.js';

// 全局暴露（兼容 GanttChart 事件）
window.showTaskForm = showTaskForm;

document.addEventListener('DOMContentLoaded', () => {
    const gantt = new GanttChart('#gantt', initialTasks);
    window.gantt = gantt; // 兼容旧代码

    initControls(gantt);
    initSettings(gantt);
    initLogger();
});