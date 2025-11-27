// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 历史记录与版本控制管理器                                        ▓▓
// ▓▓ 路径: js/utils/history-manager.js                               ▓▓
// ▓▓ 版本: Epsilon60-AutoCatchUp                                    ▓▓
// ▓▓ 修复: 智能比对快照与增量时间，自动追赶最新进度                  ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    class HistoryManager {
        constructor() {
            this.stack = [];
            this.pointer = -1;
            this.filename = null;
            this.isSyncing = false;
            
            if (typeof debounce === 'function') {
                this.debouncedSync = debounce(this.syncToCloud.bind(this), 2000);
            } else {
                this.debouncedSync = this.syncToCloud.bind(this);
            }
        }

        getLastActionId() {
            if (this.pointer >= 0 && this.stack[this.pointer]) {
                return this.stack[this.pointer].id;
            }
            return null;
        }

        getHistoryStack() {
            return this.stack.map((action, index) => ({
                ...action,
                isCurrent: index === this.pointer
            }));
        }

        /**
         * 初始化并自动追赶
         * @param {string} filename - 内部文件名 (Key)
         * @param {string} baselineId - 快照中记录的最后操作ID
         * @param {number} snapshotTimestamp - 快照的保存时间戳
         */
        async init(filename, baselineId = null, snapshotTimestamp = 0) {
            this.filename = filename;
            this.stack = [];
            this.pointer = -1;
            this.updateUI();
            
            if (!filename) return;

            const historyFile = filename.replace('.json', '_history.json');
            
            try {
                console.log(`⏳ [History] 检查增量记录: ${historyFile}`);
                if (typeof loadFromKV === 'function') {
                    let historyData = null;
                    try { historyData = await loadFromKV(historyFile); } catch (err) { /* 无历史 */ }

                    if (Array.isArray(historyData) && historyData.length > 0) {
                        this.stack = historyData;
                        
                        const lastHistoryTime = this.stack[this.stack.length - 1].timestamp;
                        const isHistoryNewer = lastHistoryTime > (snapshotTimestamp || 0);

                        // ⭐ 1. 定位锚点
                        let startIndex = -1;
                        if (baselineId) {
                            const foundIndex = this.stack.findIndex(action => action.id === baselineId);
                            if (foundIndex !== -1) {
                                startIndex = foundIndex;
                                console.log(`📍 快照锚点定位: Index ${startIndex} (ID: ${baselineId})`);
                            } else {
                                console.warn(`⚠️ 快照锚点 ${baselineId} 在历史中未找到，可能历史被重置。`);
                                // 如果找不到锚点，且历史比快照新，这很危险。
                                // 策略：如果 snapshotTimestamp 存在且很大，说明快照很新，只是历史对不上，信任快照。
                                // 如果 snapshotTimestamp 很小，信任历史。
                                // 这里采取保守策略：如果找不到锚点，但历史确实更新，我们尝试从头重放（这要求 ADD 操作有查重逻辑）
                                if (isHistoryNewer) {
                                    console.log('🔄 尝试全量重放历史...');
                                    startIndex = -1; 
                                } else {
                                    // 快照更新，历史旧，直接将指针移到末尾
                                    startIndex = this.stack.length - 1;
                                }
                            }
                        } else {
                            // 无锚点（新项目或旧数据），视为从零开始
                            startIndex = -1;
                        }

                        this.pointer = startIndex;

                        // ⭐ 2. 自动追赶 (如果有未保存的增量)
                        if (this.pointer < this.stack.length - 1) {
                            const replayCount = (this.stack.length - 1) - this.pointer;
                            console.log(`⏩ 发现 ${replayCount} 个未保存操作，正在恢复...`);
                            
                            while (this.pointer < this.stack.length - 1) {
                                this.pointer++;
                                // 此时必须执行数据计算，但不渲染 DOM
                                this.applyChanges(this.stack[this.pointer].redo, 'redo', true);
                            }
                            
                            // 追赶结束，刷新视图
                            if (window.gantt) {
                                window.gantt.calculateDateRange();
                                if (window.gantt.options.isOverviewMode) window.gantt.switchToOverviewMode();
                                else window.gantt.render();
                            }
                            
                            if(typeof addLog === 'function') addLog(`⚡ 已自动恢复 ${replayCount} 步未保存的修改`);
                        } else {
                            console.log('✅ 数据已是最新');
                        }

                        this.updateUI();
                    }
                }
            } catch (e) {
                console.error('History init error:', e);
            }
        }

        record(type, undoData, redoData, description) {
            if (this.pointer < this.stack.length - 1) {
                this.stack = this.stack.slice(0, this.pointer + 1);
            }

            const safeClone = (data) => typeof deepClone === 'function' ? deepClone(data) : JSON.parse(JSON.stringify(data));

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

        travelTo(index) {
            if (index === this.pointer) return;
            if (index < -1 || index >= this.stack.length) return;

            const wasOverview = window.gantt ? window.gantt.options.isOverviewMode : false;

            if (index < this.pointer) {
                while (this.pointer > index) {
                    this.applyChanges(this.stack[this.pointer].undo, 'undo', true);
                    this.pointer--;
                }
            } else {
                while (this.pointer < index) {
                    this.pointer++;
                    this.applyChanges(this.stack[this.pointer].redo, 'redo', true);
                }
            }

            if (window.gantt) {
                window.gantt.calculateDateRange();
                if (wasOverview) window.gantt.switchToOverviewMode();
                else window.gantt.render();
            }

            this.updateUI();
            this.debouncedSync();
            if (typeof addLog === 'function') addLog(`🚀 已回溯到版本 v:${index + 1}`);
        }

        /**
         * 应用数据变更
         * @param {boolean} silent - 如果为true，只计算数据，不重新渲染DOM (用于批量重放)
         */
        applyChanges(data, mode, silent = false) {
            if (!window.gantt) return;
            const tasks = window.gantt.tasks;

            if (!data) return;

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
                    if (data.deletedChildren) {
                        data.deletedChildren.forEach(child => {
                            if (!tasks.find(t => t.id === child.id)) window.gantt.tasks.push(child);
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

            // ⭐ 关键：即使 silent=true，也要确保 WBS 和 汇总时间 被重新计算
            // 否则后续依赖这些属性的操作会出错
            if (window.gantt) {
                if (window.gantt.sortTasksByWBS) window.gantt.sortTasksByWBS();
                if (window.gantt.generateWBS) window.gantt.tasks.forEach(t => t.wbs = window.gantt.generateWBS(t.id));
                if (window.gantt.recalculateSummaryTask) {
                    // 简单起见，重算所有汇总任务
                    window.gantt.tasks.filter(t => t.isSummary).forEach(sum => window.gantt.recalculateSummaryTask(sum.id));
                }

                // 只有在非 silent 模式下才执行昂贵的 DOM 渲染
                if (!silent) {
                    window.gantt.calculateDateRange();
                    if (window.gantt.options.isOverviewMode) window.gantt.switchToOverviewMode();
                    else window.gantt.render();
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
            } catch (e) { console.error(e); } 
            finally { this.isSyncing = false; }
        }

        updateUI() {
            const undoBtn = document.getElementById('btnUndo');
            const redoBtn = document.getElementById('btnRedo');
            const historyLabel = document.getElementById('historyLabel');

            if (undoBtn) {
                undoBtn.disabled = this.pointer < 0;
                undoBtn.classList.toggle('disabled', this.pointer < 0);
            }
            if (redoBtn) {
                redoBtn.disabled = this.pointer >= this.stack.length - 1;
                redoBtn.classList.toggle('disabled', this.pointer >= this.stack.length - 1);
            }
            if (historyLabel) {
                historyLabel.innerHTML = `v:${this.pointer + 1} <small class="text-muted">/ ${this.stack.length}</small>`;
                historyLabel.style.cursor = 'pointer';
                historyLabel.title = "点击查看历史版本";
            }
        }
    }

    global.historyManager = new HistoryManager();
    console.log('✅ history-manager.js loaded (Epsilon60-AutoCatchUp)');

})(window);