--- START OF FILE js/utils/history-manager.js ---

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 历史记录与版本控制管理器                                        ▓▓
// ▓▓ 路径: js/utils/history-manager.js                               ▓▓
// ▓▓ 版本: Alpha-1                                                  ▓▓
// ▓▓ 职责: 记录操作增量、实现撤销/重做、自动同步历史日志到云端      ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    class HistoryManager {
        constructor() {
            this.stack = [];       // 历史栈 (存储 Action 对象)
            this.pointer = -1;     // 当前状态指针
            this.filename = null;  // 当前关联的云端文件名
            this.isSyncing = false;
            
            // 防抖保存历史记录 (2秒无操作自动同步)
            // 依赖 common-utils.js 中的 debounce
            this.debouncedSync = typeof debounce === 'function' 
                ? debounce(this.syncToCloud.bind(this), 2000) 
                : this.syncToCloud.bind(this);
        }

        /**
         * 初始化：加载项目时调用
         * 尝试加载对应的 _history.json 文件
         */
        async init(filename) {
            this.filename = filename;
            this.stack = [];
            this.pointer = -1;
            this.updateUI();
            
            if (!filename) return;

            // 历史文件命名规则：原文件名_history.json
            const historyFile = filename.replace('.json', '_history.json');
            
            try {
                console.log(`⏳ 正在加载历史记录: ${historyFile}...`);
                // 尝试从 KV 加载历史文件 (依赖 kv-storage.js)
                if (typeof loadFromKV === 'function') {
                    try {
                        const historyData = await loadFromKV(historyFile);
                        if (Array.isArray(historyData)) {
                            this.stack = historyData;
                            this.pointer = this.stack.length - 1; // 指针移到最后
                            console.log(`✅ 历史记录加载完成: ${this.stack.length} 条操作`);
                            this.updateUI();
                        }
                    } catch (innerErr) {
                        // 文件不存在是正常的（新项目）
                        console.log('ℹ️ 此项目暂无历史记录 (新项目或未保存过)');
                    }
                }
            } catch (e) {
                console.warn('⚠️ 历史记录初始化异常:', e);
            }
        }

        /**
         * 记录一个操作 (核心入口)
         * @param {string} type - 操作类型 (UPDATE, ADD, DELETE, MOVE)
         * @param {Object} undoData - 用于回滚的数据快照
         * @param {Object} redoData - 用于重做的数据快照
         * @param {string} description - 操作描述
         */
        record(type, undoData, redoData, description) {
            // 如果我们在回溯中间插入新操作，这就创造了新的时间线
            // 需要丢弃指针之后的所有未来操作
            if (this.pointer < this.stack.length - 1) {
                this.stack = this.stack.slice(0, this.pointer + 1);
            }

            // 构建 Action 对象
            const action = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                timestamp: Date.now(),
                type: type,
                desc: description,
                // 使用 deepClone 防止引用被后续修改 (依赖 data-utils.js)
                undo: typeof deepClone === 'function' ? deepClone(undoData) : JSON.parse(JSON.stringify(undoData)),
                redo: typeof deepClone === 'function' ? deepClone(redoData) : JSON.parse(JSON.stringify(redoData))
            };

            this.stack.push(action);
            this.pointer++;

            console.log(`📝 [History] 记录操作: ${description}`);
            
            // 更新 UI 按钮状态
            this.updateUI();
            
            // 触发自动同步到云端
            this.debouncedSync();
        }

        /**
         * 撤销 (Undo)
         */
        undo() {
            if (this.pointer < 0) return; // 无路可退

            const action = this.stack[this.pointer];
            this.applyChanges(action.undo, 'undo');
            this.pointer--;
            
            if (typeof addLog === 'function') addLog(`↩️ 撤销: ${action.desc}`);
            this.updateUI();
            this.debouncedSync(); // 状态变更也需要同步指针位置(可选，这里主要同步栈内容)
        }

        /**
         * 重做 (Redo)
         */
        redo() {
            if (this.pointer >= this.stack.length - 1) return; // 已是最新

            this.pointer++;
            const action = this.stack[this.pointer];
            this.applyChanges(action.redo, 'redo');
            
            if (typeof addLog === 'function') addLog(`↪️ 重做: ${action.desc}`);
            this.updateUI();
            this.debouncedSync();
        }

        /**
         * 应用数据变更 (内部核心)
         */
        applyChanges(data, mode) {
            if (!window.gantt) return;
            const tasks = window.gantt.tasks;

            // 1. 单任务更新 (UPDATE/MOVE/RESIZE)
            if (data.task) {
                const target = tasks.find(t => t.id === data.task.id);
                if (target) {
                    // 覆盖属性
                    Object.assign(target, data.task);
                }
            }

            // 2. 任务添加 (ADD)
            // Undo模式下：add 意味着要删除该任务
            // Redo模式下：add 意味着要重新插入该任务
            if (data.addedTask) {
                if (mode === 'undo') {
                    window.gantt.tasks = tasks.filter(t => t.id !== data.addedTask.id);
                } else {
                    // 检查是否已存在，防止重复添加
                    if (!tasks.find(t => t.id === data.addedTask.id)) {
                        window.gantt.tasks.push(data.addedTask);
                    }
                }
            }
            
            // 3. 任务删除 (DELETE)
            // Undo模式下：delete 意味着要恢复任务
            // Redo模式下：delete 意味着要再次删除
            if (data.deletedTask) {
                if (mode === 'undo') {
                    // 恢复主任务
                    if (!tasks.find(t => t.id === data.deletedTask.id)) {
                        window.gantt.tasks.push(data.deletedTask);
                    }
                    // 恢复级联删除的子任务
                    if (data.deletedChildren && Array.isArray(data.deletedChildren)) {
                        data.deletedChildren.forEach(child => {
                            if (!tasks.find(t => t.id === child.id)) {
                                window.gantt.tasks.push(child);
                            }
                        });
                    }
                } else {
                    // 删除任务
                    window.gantt.tasks = tasks.filter(t => t.id !== data.deletedTask.id);
                    // 删除子任务
                    if (data.deletedChildren) {
                        const childIds = data.deletedChildren.map(c => c.id);
                        window.gantt.tasks = window.gantt.tasks.filter(t => !childIds.includes(t.id));
                    }
                }
            }

            // 应用变更后，必须重新计算和渲染
            // 1. 重新排序 (因为 push 可能会破坏顺序)
            if (typeof window.gantt.sortTasksByWBS === 'function') {
                window.gantt.sortTasksByWBS();
            }
            // 2. 重新计算 WBS (防止编号错乱)
            if (typeof window.gantt.generateWBS === 'function') {
                window.gantt.tasks.forEach(t => t.wbs = window.gantt.generateWBS(t.id));
            }
            // 3. 重新计算父任务聚合状态 (防止父任务时间未更新)
            if (typeof window.gantt.recalculateSummaryTask === 'function') {
                // 简单粗暴：全量重算所有 summary
                window.gantt.tasks.filter(t => t.isSummary).forEach(sum => {
                    window.gantt.recalculateSummaryTask(sum.id);
                });
            }

            window.gantt.calculateDateRange();
            
            // 如果当前是全貌模式，保持全貌模式；否则普通渲染
            if (window.gantt.options.isOverviewMode) {
                window.gantt.switchToOverviewMode();
            } else {
                window.gantt.render();
            }
        }

        /**
         * 同步到云端 (KV)
         * 这是一个静默操作，不应打扰用户，除非出错
         */
        async syncToCloud() {
            if (!this.filename || typeof saveToKV !== 'function') return;
            
            const historyFile = this.filename.replace('.json', '_history.json');
            
            try {
                this.isSyncing = true;
                const indicator = document.getElementById('historySyncStatus');
                if (indicator) indicator.style.opacity = 1;

                // 保存整个栈
                // 优化：为了性能，如果栈太大(比如>500步)，可以考虑截断旧历史
                // 这里为了“无限回溯”需求，暂不截断，依靠 KV 的存储能力
                const payload = this.stack; 
                
                await saveToKV(historyFile, payload);
                
                console.log(`☁️ [History] 增量已自动同步 (${payload.length} 步)`);
                
                if (indicator) {
                    // 闪烁一下表示成功
                    indicator.style.color = '#10b981'; // Green
                    setTimeout(() => indicator.style.opacity = 0, 1000);
                }

            } catch (e) {
                console.error('❌ 历史记录同步失败:', e);
            } finally {
                this.isSyncing = false;
            }
        }

        /**
         * 更新 UI 状态 (Undo/Redo 按钮)
         */
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
                historyLabel.textContent = `版本: ${this.pointer + 1} / ${this.stack.length}`;
            }
        }
    }

    // 导出单例
    global.historyManager = new HistoryManager();
    console.log('✅ history-manager.js loaded (版本管理系统就绪)');

})(window);