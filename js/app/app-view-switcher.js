// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 视图切换控制模块                                                ▓▓
// ▓▓ 路径: js/app/app-view-switcher.js                              ▓▓
// ▓▓ 版本: Epsilon2-Fix - 修复 Header 按钮联动逻辑                   ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 全局状态 ====================
    
    let isPertView = false;
    
    // 获取容器引用
    const ganttContainer = document.getElementById('ganttContainer');
    const pertContainer = document.getElementById('pertContainer');

    // ==================== 核心切换逻辑 (纯函数) ====================
    
    /**
     * 执行视图切换的底层逻辑
     * @param {boolean} showPert - 是否显示 PERT 视图
     */
    function performViewSwitch(showPert) {
        if (!ganttContainer || !pertContainer) {
            console.error('❌ 找不到视图容器元素');
            return;
        }

        isPertView = showPert;

        if (isPertView) {
            // 切换到 PERT 视图
            ganttContainer.style.display = 'none';
            pertContainer.style.display = 'block';
            
            try {
                // 检查 gantt 实例是否存在
                if (window.gantt && window.gantt.tasks) {
                    if (typeof renderPertChart === 'function') {
                        renderPertChart(window.gantt.tasks);
                        addLog('✅ 已切换到 PERT 视图');
                    } else {
                        throw new Error('PERT 渲染模块 (renderPertChart) 未加载');
                    }
                } else {
                    addLog('⚠️ 暂无任务数据，无法渲染 PERT');
                }
            } catch (error) {
                console.error('❌ PERT 渲染失败:', error);
                pertContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #dc3545;">
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                            <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">PERT 渲染失败</div>
                            <div style="font-size: 0.9rem; color: #666;">${error.message}</div>
                        </div>
                    </div>
                `;
                addLog('❌ PERT 渲染失败: ' + error.message);
            }
            
        } else {
            // 切换回甘特图视图
            ganttContainer.style.display = 'block';
            pertContainer.style.display = 'none';
            
            // 触发甘特图重新布局以适应高度
            if (window.gantt && typeof window.gantt.updateHeight === 'function') {
                window.gantt.updateHeight();
            }
            
            addLog('✅ 已切换到甘特图视图');
        }
    }

    // ==================== 导出 API ====================
    
    /**
     * 刷新 PERT 视图（如果当前在 PERT 视图）
     */
    function refreshPertViewIfActive() {
        if (isPertView && pertContainer && pertContainer.style.display !== 'none') {
            try {
                if (window.gantt && typeof renderPertChart === 'function') {
                    renderPertChart(window.gantt.tasks);
                    // console.log('🔄 PERT 视图已自动刷新'); // 减少日志噪音
                }
            } catch (error) {
                console.error('❌ PERT 刷新失败:', error);
            }
        }
    }

    /**
     * 获取当前视图状态
     * @returns {string} 'gantt' 或 'pert'
     */
    function getCurrentView() {
        return isPertView ? 'pert' : 'gantt';
    }

    /**
     * 强制切换到指定视图
     * @param {string} viewType - 'gantt' 或 'pert'
     */
    function switchToView(viewType) {
        const targetIsPert = (viewType === 'pert');
        performViewSwitch(targetIsPert);
    }

    // ==================== 导出到全局 ====================
    
    global.isPertView = isPertView;
    global.refreshPertViewIfActive = refreshPertViewIfActive;
    global.getCurrentView = getCurrentView;
    global.switchToView = switchToView;

    console.log('✅ app-view-switcher.js loaded successfully (Epsilon2-Fix)');

})(typeof window !== 'undefined' ? window : this);