// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 历史记录与版本控制管理器                                        ▓▓
// ▓▓ 路径: js/utils/history-manager.js                               ▓▓
// ▓▓ 版本: Epsilon8-Replay - 支持增量回放追赶                        ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    class HistoryManager {
        constructor() {
            this.stack = [];
            this.pointer = -1;
            this.filename = null;
            this.isSyncing = false;
            
            // 安全的防抖绑定
            if (typeof debounce === 'function') {
                this.debouncedSync = debounce(this.syncToCloud.bind(this), 2000);
            } else {
                this.debouncedSync = this.syncToCloud.bind(this);
            }
        }

        /**
         * 获取当前指针处的 Action ID (用于保存快照锚点)
         */
        getLastActionId() {
            if (this.pointer >= 0 && this.stack[this.pointer]) {
                return this.stack[this.pointer].id;
            }
            return null;
        }

        /**
         * 初始化并尝试追赶进度
         * @param {string} filename - 关联的文件名
         * @param {string} [baselineId] - 主文件保存时的最后一次操作ID
         */
        async init(filename, baselineId = null) {
            this.filename = filename;
            // 注意：init 不应该清空 stack，除非我们确定是切换项目。
            // 为了安全，我们先清空，然后加载。
            this.stack = [];
            this.pointer = -1;
            this.updateUI();
            
            if (!filename) return;

            const historyFile = filename.replace('.json', '_history.json');
            
            try {
                console.log(`⏳ 正在检查增量历史: ${historyFile}`);
                if (typeof loadFromKV === 'function') {
                    try {
                        const historyData = await loadFromKV(historyFile);
                        if (Array.isArray(historyData)) {
                            this.stack = historyData;
                            
                            // ⭐⭐⭐ 核心逻辑：快照追赶 (Fast-Forward) ⭐⭐⭐
                            // 如果没有 baselineId，说明主文件很老或者没保存过，我们将指针置于 -1，然后重放整个栈
                            // 如果有 baselineId，我们找到它在栈中的位置，将指针置于该位置，然后重放后面所有操作
                            
                            let startIndex = -1;
                            
                            if (baselineId) {
                                const foundIndex = this.stack.findIndex(action => action.id === baselineId);
                                if (foundIndex !== -1) {
                                    startIndex = foundIndex;
                                    console.log(`📍 找到快照锚点: ${baselineId} (Index: ${startIndex})`);
                                } else {
                                    console.warn(`⚠️ 未在历史中找到锚点 ${baselineId}，假设为全新历史，重放所有。`);
                                }
                            }

                            // 设置当前指针到快照位置
                            this.pointer = startIndex;
                            
                            // 自动重放后续所有操作 (恢复未保存的修改)
                            if (this.pointer < this.stack.length - 1) {
                                const replayCount = (this.stack.length - 1) - this.pointer;
                                console.log(`⏩ 正在恢复 ${replayCount} 个未保存的修改...`);
                                
                                // 批量重做，不触发保存，不记录日志
                                while (this.pointer < this.stack.length - 1) {
                                    this.pointer++;
                                    this.applyChanges(this.stack[this.pointer].redo, 'redo', true); // true = silent mode
                                }
                                addLog(`⚡ 已自动恢复 ${replayCount} 个未保存的操作`);
                            } else {
                                console.log('✅ 当前已是最新状态');
                            }

                            this.updateUI();
                        }
                    } catch (err) {
                        console.log('ℹ️ 无增量历史记录');
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
            if (this.pointer < this.stack.length - 1) {
                this.stack = this.stack.slice(0, this.pointer + 1);
            }

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

        undo() {
            if (this.pointer < 0) return;
            const action = this.stack[this.pointer];
            this.applyChanges(action.undo, 'undo');
            this.pointer--;
            if (typeof addLog === 'function') addLog(`↩️ 撤销: ${action.desc}`);
            this.updateUI();
            this.debouncedSync();
        }

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
         * @param {Object} data - 数据
         * @param {string} mode - 'undo' | 'redo'
         * @param {boolean} silent - 是否静默 (不刷新耗时视图，用于批量重放)
         */
        applyChanges(data, mode, silent = false) {
            if (!window.gantt) return;
            const tasks = window.gantt.tasks;

            if (data.task) {
                const target = tasks.find(t => t.id === data.task.id);
                if (target) Object.assign(target, data.task);
            }

            if (data.addedTask) {
                if (mode === 'undo') {
                    window.gantt.tasks = tasks.filter(t => t.id !== data.addedTask.id);
                } else {
                    if (!tasks.find(t => t.id === data.addedTask.id)) {
                        window.gantt.tasks.push(data.addedTask);
                    }
                }
            }
            
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

            // 仅在非静默模式下渲染，或者批量处理完最后一次再渲染
            // 这里为了简单，每次都做逻辑计算，但 DOM 渲染可以优化
            if (window.gantt) {
                if (typeof window.gantt.sortTasksByWBS === 'function') window.gantt.sortTasksByWBS();
                if (typeof window.gantt.generateWBS === 'function') {
                    window.gantt.tasks.forEach(t => t.wbs = window.gantt.generateWBS(t.id));
                }
                if (typeof window.gantt.recalculateSummaryTask === 'function') {
                    window.gantt.tasks.filter(t => t.isSummary).forEach(sum => window.gantt.recalculateSummaryTask(sum.id));
                }

                window.gantt.calculateDateRange();
                
                // 批量重放时，只在最后一次渲染 (由调用者控制)
                // 但 applyChanges 内部无法得知是否是最后一次，所以这里默认渲染
                // 如果 silent 为 true，可以选择不 render，但在 init 结束时必须手动 render
                if (!silent) {
                    if (window.gantt.options.isOverviewMode) {
                        window.gantt.switchToOverviewMode();
                    } else {
                        window.gantt.render();
                    }
                }
            }
        }

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

        updateUI() {
            const undoBtn = document.getElementById('btnUndo');
            const redoBtn = document.getElementById('btnRedo');
            const historyLabel = document.getElementById('historyLabel');

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
    console.log('✅ history-manager.js loaded (Replay Enabled)');

})(window);