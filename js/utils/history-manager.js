// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 历史记录与版本控制管理器                                        ▓▓
// ▓▓ 路径: js/utils/history-manager.js                               ▓▓
// ▓▓ 版本: Epsilon9-SmartReplay                                     ▓▓
// ▓▓ 修复: 解决刷新后未保存修改丢失的问题                            ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    class HistoryManager {
        constructor() {
            this.stack = [];
            this.pointer = -1;
            this.filename = null;
            this.isSyncing = false;
            
            // 绑定防抖同步
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
         * @param {string} [baselineId] - 主文件保存时的最后一次操作ID (锚点)
         */
        async init(filename, baselineId = null) {
            this.filename = filename;
            // 切换项目时清空栈
            this.stack = [];
            this.pointer = -1;
            this.updateUI();
            
            if (!filename) {
                console.warn('⚠️ HistoryManager initialized without filename. Auto-save will not work.');
                return;
            }

            const historyFile = filename.replace('.json', '_history.json');
            
            try {
                console.log(`⏳ [History] 正在加载增量记录: ${historyFile}`);
                
                // 尝试从 KV 加载历史文件
                if (typeof loadFromKV === 'function') {
                    let historyData = null;
                    try {
                        historyData = await loadFromKV(historyFile);
                    } catch (err) {
                        console.log('ℹ️ [History] 无增量记录 (新项目或已清空)');
                        return;
                    }

                    if (Array.isArray(historyData) && historyData.length > 0) {
                        this.stack = historyData;
                        
                        // ⭐⭐⭐ 核心逻辑：智能锚点定位与重放 ⭐⭐⭐
                        let startIndex = -1;
                        
                        if (baselineId) {
                            // 情况 A: 主文件有锚点，我们在历史栈中寻找这个锚点
                            const foundIndex = this.stack.findIndex(action => action.id === baselineId);
                            
                            if (foundIndex !== -1) {
                                // 找到了！说明主文件是历史的一部分
                                startIndex = foundIndex;
                                console.log(`📍 [History] 找到快照锚点: ${baselineId} (Index: ${startIndex})`);
                            } else {
                                // 没找到！这通常意味着主文件比历史文件“新”（比如被外部覆盖），或者历史文件被重置了。
                                // 为了安全，我们【不】进行重放，以免造成数据重复或冲突。
                                // 我们假设主文件已经是最新状态。
                                console.warn(`⚠️ [History] 锚点 ${baselineId} 在历史中未找到。停止自动重放，信任主文件快照。`);
                                // 将指针移到末尾，允许用户 Undo 回去 (虽然可能状态不完全匹配，但比重放错误数据好)
                                startIndex = this.stack.length - 1;
                            }
                        } else {
                            // 情况 B: 主文件无锚点 (旧版数据或从未保存过历史)
                            // 如果历史栈有数据，且主文件看起来是空的或初始化的，我们可能需要重放所有？
                            // 风险较高。通常假设无锚点 = 全新开始或只信赖主文件。
                            // 但为了支持“未保存修改恢复”，如果这是一个未保存的新项目，baselineId 是 null，但 history 有数据
                            // 我们应该从头重放。
                            console.log('ℹ️ [History] 无快照锚点，准备从头重放所有增量...');
                            startIndex = -1; 
                        }

                        // 设置当前指针位置
                        this.pointer = startIndex;
                        
                        // 执行重放 (Fast-Forward)
                        // 从锚点之后的一步开始，直到栈顶
                        let replayCount = 0;
                        if (this.pointer < this.stack.length - 1) {
                            console.log(`⏩ [History] 开始恢复未保存的修改...`);
                            
                            while (this.pointer < this.stack.length - 1) {
                                this.pointer++;
                                const action = this.stack[this.pointer];
                                // 应用重做数据，启用 silent 模式 (不每次渲染)
                                this.applyChanges(action.redo, 'redo', true);
                                replayCount++;
                            }
                            
                            if (typeof addLog === 'function') addLog(`⚡ 已自动恢复 ${replayCount} 步未保存的操作`);
                        }

                        // 重放结束后，统一刷新一次 UI
                        if (window.gantt) {
                            window.gantt.calculateDateRange();
                            if (window.gantt.options.isOverviewMode) {
                                window.gantt.switchToOverviewMode();
                            } else {
                                window.gantt.render();
                            }
                        }
                        
                        this.updateUI();
                    }
                }
            } catch (e) {
                console.error('❌ History init error:', e);
            }
        }

        /**
         * 记录操作
         */
        record(type, undoData, redoData, description) {
            // 丢弃“未来”的操作 (如果我们在撤销状态下进行了新操作)
            if (this.pointer < this.stack.length - 1) {
                this.stack = this.stack.slice(0, this.pointer + 1);
            }

            // 深拷贝数据
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

            console.log(`📝 [Record] ${description}`);
            
            this.updateUI();
            this.debouncedSync(); // 触发自动保存
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
                    // 恢复子任务
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

            // 仅在非 silent 模式下刷新 DOM
            if (!silent && window.gantt) {
                if (typeof window.gantt.sortTasksByWBS === 'function') window.gantt.sortTasksByWBS();
                if (typeof window.gantt.generateWBS === 'function') {
                    window.gantt.tasks.forEach(t => t.wbs = window.gantt.generateWBS(t.id));
                }
                if (typeof window.gantt.recalculateSummaryTask === 'function') {
                    window.gantt.tasks.filter(t => t.isSummary).forEach(sum => window.gantt.recalculateSummaryTask(sum.id));
                }

                window.gantt.calculateDateRange();
                if (window.gantt.options.isOverviewMode) {
                    window.gantt.switchToOverviewMode();
                } else {
                    window.gantt.render();
                }
            }
        }

        async syncToCloud() {
            // ⭐ 关键检查：如果没有文件名，无法保存历史
            if (!this.filename) {
                console.warn('⚠️ [History] Skipping sync: No filename set.');
                return;
            }
            
            if (typeof saveToKV !== 'function') return;
            
            const historyFile = this.filename.replace('.json', '_history.json');
            this.isSyncing = true;
            
            const indicator = document.getElementById('historySyncStatus');
            if (indicator) indicator.style.opacity = 1;

            try {
                await saveToKV(historyFile, this.stack);
                // console.log(`☁️ [History] Auto-saved to ${historyFile}`);
                if (indicator) {
                    indicator.style.color = '#10b981';
                    setTimeout(() => indicator.style.opacity = 0, 1000);
                }
            } catch (e) {
                console.error('❌ [History] Sync failed:', e);
            } finally {
                this.isSyncing = false;
            }
        }

        updateUI() {
            const undoBtn = document.getElementById('btnUndo');
            const redoBtn = document.getElementById('btnRedo');
            const historyLabel = document.getElementById('historyLabel');

            if (undoBtn) {
                undoBtn.disabled = this.pointer < 0;
                if (this.pointer < 0) undoBtn.classList.add('disabled'); else undoBtn.classList.remove('disabled');
            }
            
            if (redoBtn) {
                redoBtn.disabled = this.pointer >= this.stack.length - 1;
                if (redoBtn.disabled) redoBtn.classList.add('disabled'); else redoBtn.classList.remove('disabled');
            }
            
            if (historyLabel) {
                historyLabel.textContent = `v:${this.pointer + 1}`;
            }
        }
    }

    global.historyManager = new HistoryManager();
    console.log('✅ history-manager.js loaded (Smart Replay)');

})(window);