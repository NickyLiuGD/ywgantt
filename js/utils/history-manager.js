// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 历史记录与版本控制管理器                                        ▓▓
// ▓▓ 路径: js/utils/history-manager.js                               ▓▓
// ▓▓ 版本: Epsilon10-TimeTravel                                     ▓▓
// ▓▓ 修复: 自动追赶增量、提供回溯接口                                ▓▓
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

        // ⭐ 获取历史栈供 UI 显示
        getHistoryStack() {
            return this.stack.map((action, index) => ({
                ...action,
                isCurrent: index === this.pointer
            }));
        }

        async init(filename, baselineId = null) {
            this.filename = filename;
            this.stack = [];
            this.pointer = -1;
            this.updateUI();
            
            if (!filename) return;

            const historyFile = filename.replace('.json', '_history.json');
            
            try {
                console.log(`⏳ [History] 检查增量: ${historyFile}`);
                if (typeof loadFromKV === 'function') {
                    let historyData = null;
                    try { historyData = await loadFromKV(historyFile); } catch (err) { /* 无历史 */ }

                    if (Array.isArray(historyData) && historyData.length > 0) {
                        this.stack = historyData;
                        
                        // ⭐ 智能追赶逻辑
                        let startIndex = -1;
                        
                        if (baselineId) {
                            const foundIndex = this.stack.findIndex(action => action.id === baselineId);
                            if (foundIndex !== -1) {
                                startIndex = foundIndex;
                                console.log(`📍 找到快照锚点: Index ${startIndex}`);
                            } else {
                                // 关键修复：有历史但找不到锚点，说明快照可能过时或文件被替换
                                // 策略：尝试寻找最近匹配，或者假设快照是旧的，重放所有历史以保持最新
                                console.warn('⚠️ 快照锚点未找到，将应用所有增量以确保最新状态');
                                // 这里保持 -1，意味着从头重放（如果这会导致重复ID报错，后续 applyChanges 需健壮处理）
                                // 更好的策略：如果历史存在，通常快照是基于历史某个点的。如果找不到，可能历史是全新的。
                                // 这里的逻辑视具体业务而定，目前策略是：重放所有增量。
                                startIndex = -1; 
                            }
                        } else {
                            // 无锚点（旧项目），默认重放所有增量
                            console.log('ℹ️ 无锚点，应用所有历史增量');
                            startIndex = -1;
                        }

                        // 1. 设置指针到快照点
                        this.pointer = startIndex;
                        
                        // 2. 追赶进度 (Replay)
                        let replayCount = 0;
                        const totalSteps = this.stack.length;
                        
                        if (this.pointer < totalSteps - 1) {
                            while (this.pointer < totalSteps - 1) {
                                this.pointer++;
                                // silent=true: 不渲染 DOM，只更新数据模型
                                this.applyChanges(this.stack[this.pointer].redo, 'redo', true);
                                replayCount++;
                            }
                            
                            // 3. 追赶结束后，统一刷新一次视图
                            if (window.gantt) {
                                if (typeof window.gantt.recalculateSummaryTask === 'function') {
                                    // 确保汇总数据准确
                                    window.gantt.tasks.filter(t => t.isSummary).forEach(s => window.gantt.recalculateSummaryTask(s.id));
                                }
                                window.gantt.calculateDateRange();
                                // 保持当前视图模式
                                if (window.gantt.options.isOverviewMode) window.gantt.switchToOverviewMode();
                                else window.gantt.render();
                            }
                            
                            if(typeof addLog === 'function') addLog(`⚡ 已恢复 ${replayCount} 个未保存的修改 (最新版本)`);
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

        // ⭐ 时光机跳转
        travelTo(index) {
            if (index === this.pointer) return;
            if (index < -1 || index >= this.stack.length) return;

            const isBackwards = index < this.pointer;
            console.log(`🚀 时光机启动: ${this.pointer} -> ${index}`);

            // 暂时关闭渲染，大幅提升性能
            const wasOverview = window.gantt ? window.gantt.options.isOverviewMode : false;

            if (isBackwards) {
                while (this.pointer > index) {
                    const action = this.stack[this.pointer];
                    this.applyChanges(action.undo, 'undo', true);
                    this.pointer--;
                }
            } else {
                while (this.pointer < index) {
                    this.pointer++;
                    const action = this.stack[this.pointer];
                    this.applyChanges(action.redo, 'redo', true);
                }
            }

            // 恢复完成后一次性渲染
            if (window.gantt) {
                window.gantt.calculateDateRange();
                if (wasOverview) window.gantt.switchToOverviewMode();
                else window.gantt.render();
            }

            this.updateUI();
            this.debouncedSync(); // 同步新的指针位置状态（虽然栈内容没变，但作为最新状态保存也好）
            if (typeof addLog === 'function') addLog(`🚀 已回溯到版本 v:${index + 1}`);
        }

        applyChanges(data, mode, silent = false) {
            if (!window.gantt) return;
            const tasks = window.gantt.tasks;

            // 防御性编程：防止 data 为空
            if (!data) return;

            if (data.task) {
                const target = tasks.find(t => t.id === data.task.id);
                if (target) Object.assign(target, data.task);
            }

            if (data.addedTask) {
                if (mode === 'undo') {
                    window.gantt.tasks = tasks.filter(t => t.id !== data.addedTask.id);
                } else {
                    // 防止重复ID
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

            if (!silent && window.gantt) {
                if (window.gantt.sortTasksByWBS) window.gantt.sortTasksByWBS();
                if (window.gantt.generateWBS) window.gantt.tasks.forEach(t => t.wbs = window.gantt.generateWBS(t.id));
                if (window.gantt.recalculateSummaryTask) {
                    window.gantt.tasks.filter(t => t.isSummary).forEach(sum => window.gantt.recalculateSummaryTask(sum.id));
                }
                window.gantt.calculateDateRange();
                if (window.gantt.options.isOverviewMode) window.gantt.switchToOverviewMode();
                else window.gantt.render();
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
            // 更新版本号文本
            if (historyLabel) {
                historyLabel.innerHTML = `v:${this.pointer + 1} <small class="text-muted">/ ${this.stack.length}</small>`;
                historyLabel.style.cursor = 'pointer'; // 提示可点击
                historyLabel.title = "点击管理版本历史";
            }
        }
    }

    global.historyManager = new HistoryManager();
    console.log('✅ history-manager.js loaded (TimeTravel Ready)');

})(window);