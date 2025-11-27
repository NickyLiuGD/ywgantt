// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 历史记录与版本控制管理器                                        ▓▓
// ▓▓ 路径: js/utils/history-manager.js                               ▓▓
// ▓▓ 版本: Epsilon7-Robust                                          ▓▓
// ▓▓ 状态: 增强依赖检查与UI绑定健壮性                                ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    class HistoryManager {
        constructor() {
            this.stack = [];
            this.pointer = -1;
            this.filename = null;
            this.isSyncing = false;
            
            // 安全的防抖绑定 (防止 common-utils 未加载导致报错)
            if (typeof debounce === 'function') {
                this.debouncedSync = debounce(this.syncToCloud.bind(this), 2000);
            } else {
                console.warn('⚠️ debounce function not found, sync will be immediate.');
                this.debouncedSync = this.syncToCloud.bind(this);
            }
        }

        /**
         * 初始化
         */
        async init(filename) {
            this.filename = filename;
            this.stack = [];
            this.pointer = -1;
            this.updateUI(); // 立即重置UI为禁用状态
            
            if (!filename) return;

            const historyFile = filename.replace('.json', '_history.json');
            
            try {
                console.log(`⏳ 正在检查历史记录: ${historyFile}`);
                if (typeof loadFromKV === 'function') {
                    try {
                        const historyData = await loadFromKV(historyFile);
                        if (Array.isArray(historyData)) {
                            this.stack = historyData;
                            this.pointer = this.stack.length - 1;
                            console.log(`✅ 历史记录加载完成: ${this.stack.length} 条`);
                            this.updateUI(); // 加载完成后刷新UI
                        }
                    } catch (err) {
                        // 文件不存在是正常的
                    }
                }
            } catch (e) {
                console.error('History init error:', e);
            }
        }

        /**
         * 记录操作
         */
        record(type, undoData, redoData, description) {
            // 截断未来分支
            if (this.pointer < this.stack.length - 1) {
                this.stack = this.stack.slice(0, this.pointer + 1);
            }

            // 深拷贝辅助
            const safeClone = (data) => {
                if (typeof deepClone === 'function') return deepClone(data);
                return JSON.parse(JSON.stringify(data));
            };

            const action = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                timestamp: Date.now(),
                type: type,
                desc: description,
                undo: safeClone(undoData),
                redo: safeClone(redoData)
            };

            this.stack.push(action);
            this.pointer++;

            console.log(`📝 历史记录 [${this.pointer + 1}/${this.stack.length}]: ${description}`);
            
            this.updateUI();
            this.debouncedSync();
        }

        /**
         * 撤销
         */
        undo() {
            if (this.pointer < 0) return;

            const action = this.stack[this.pointer];
            this.applyChanges(action.undo, 'undo');
            this.pointer--;
            
            if (typeof addLog === 'function') addLog(`↩️ 撤销: ${action.desc}`);
            this.updateUI();
            this.debouncedSync();
        }

        /**
         * 重做
         */
        redo() {
            if (this.pointer >= this.stack.length - 1) return;

            this.pointer++;
            const action = this.stack[this.pointer];
            this.applyChanges(action.redo, 'redo');
            
            if (typeof addLog === 'function') addLog(`↪️ 重做: ${action.desc}`);
            this.updateUI();
            this.debouncedSync();
        }

        /**
         * 应用变更
         */
        applyChanges(data, mode) {
            if (!window.gantt) return;
            const tasks = window.gantt.tasks;

            // 1. 任务属性更新
            if (data.task) {
                const target = tasks.find(t => t.id === data.task.id);
                if (target) {
                    Object.assign(target, data.task);
                }
            }

            // 2. 添加任务
            if (data.addedTask) {
                if (mode === 'undo') {
                    window.gantt.tasks = tasks.filter(t => t.id !== data.addedTask.id);
                } else {
                    if (!tasks.find(t => t.id === data.addedTask.id)) {
                        window.gantt.tasks.push(data.addedTask);
                    }
                }
            }
            
            // 3. 删除任务
            if (data.deletedTask) {
                if (mode === 'undo') {
                    if (!tasks.find(t => t.id === data.deletedTask.id)) {
                        window.gantt.tasks.push(data.deletedTask);
                    }
                    if (data.deletedChildren && Array.isArray(data.deletedChildren)) {
                        data.deletedChildren.forEach(child => {
                            if (!tasks.find(t => t.id === child.id)) {
                                window.gantt.tasks.push(child);
                            }
                        });
                    }
                } else {
                    window.gantt.tasks = tasks.filter(t => t.id !== data.deletedTask.id);
                    if (data.deletedChildren) {
                        const childIds = data.deletedChildren.map(c => c.id);
                        window.gantt.tasks = window.gantt.tasks.filter(t => !childIds.includes(t.id));
                    }
                }
            }

            // 刷新视图状态
            if (window.gantt) {
                if (typeof window.gantt.sortTasksByWBS === 'function') window.gantt.sortTasksByWBS();
                if (typeof window.gantt.generateWBS === 'function') {
                    window.gantt.tasks.forEach(t => t.wbs = window.gantt.generateWBS(t.id));
                }
                
                // 暴力刷新所有汇总任务时间，确保一致性
                if (typeof window.gantt.recalculateSummaryTask === 'function') {
                    window.gantt.tasks.filter(t => t.isSummary).forEach(sum => {
                        window.gantt.recalculateSummaryTask(sum.id);
                    });
                }

                window.gantt.calculateDateRange();
                
                if (window.gantt.options.isOverviewMode) {
                    window.gantt.switchToOverviewMode();
                } else {
                    window.gantt.render();
                }
            }
        }

        /**
         * 自动同步
         */
        async syncToCloud() {
            if (!this.filename || typeof saveToKV !== 'function') return;
            
            const historyFile = this.filename.replace('.json', '_history.json');
            this.isSyncing = true;
            const indicator = document.getElementById('historySyncStatus');
            if (indicator) indicator.style.opacity = 1;

            try {
                await saveToKV(historyFile, this.stack);
                if (indicator) {
                    indicator.style.color = '#10b981';
                    setTimeout(() => indicator.style.opacity = 0, 1000);
                }
            } catch (e) {
                console.error('History sync failed:', e);
            } finally {
                this.isSyncing = false;
            }
        }

        /**
         * 更新 UI 按钮状态 (包含 Null Check)
         */
        updateUI() {
            const undoBtn = document.getElementById('btnUndo');
            const redoBtn = document.getElementById('btnRedo');
            const historyLabel = document.getElementById('historyLabel');

            // 使用 classList 和 disabled 属性双重控制，确保视觉和交互都生效
            if (undoBtn) {
                const cantUndo = this.pointer < 0;
                undoBtn.disabled = cantUndo;
                if (cantUndo) undoBtn.classList.add('disabled'); else undoBtn.classList.remove('disabled');
            }
            
            if (redoBtn) {
                const cantRedo = this.pointer >= this.stack.length - 1;
                redoBtn.disabled = cantRedo;
                if (cantRedo) redoBtn.classList.add('disabled'); else redoBtn.classList.remove('disabled');
            }
            
            if (historyLabel) {
                historyLabel.textContent = `v:${this.pointer + 1}`;
            }
        }
    }

    global.historyManager = new HistoryManager();
    console.log('✅ history-manager.js loaded');

})(window);