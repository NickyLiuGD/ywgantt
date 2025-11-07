// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ 视图切换控制模块                                                ▓▓
// ▓▓ 路径: js/app/app-view-switcher.js                              ▓▓
// ▓▓ 版本: Epsilon1 - 从 app-settings.js 独立                       ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    // ==================== 全局状态 ====================
    
    let isPertView = false;
    
    const toggleButton = document.getElementById('toggleView');
    const ganttContainer = document.getElementById('ganttContainer');
    const pertContainer = document.getElementById('pertContainer');

    // ==================== 视图切换主函数 ====================
    
    if (toggleButton && ganttContainer && pertContainer) {
        toggleButton.onclick = () => {
            isPertView = !isPertView;
            
            if (isPertView) {
                // 切换到 PERT 视图
                ganttContainer.style.display = 'none';
                pertContainer.style.display = 'block';
                
                try {
                    renderPertChart(gantt.tasks);
                    addLog('✅ 已切换到 PERT 视图');
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
                
                // 重置 PERT 状态
                if (typeof resetPertState === 'function') {
                    resetPertState();
                }
                
                gantt.updateHeight();
                addLog('✅ 已切换到甘特图视图');
            }
            
            // 更新按钮文字
            const btnText = toggleButton.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isPertView ? '甘特视图' : 'PERT视图';
            }
        };
    }

    // ==================== 自动刷新函数 ====================
    
    /**
     * 刷新 PERT 视图（如果当前在 PERT 视图）
     */
    function refreshPertViewIfActive() {
        if (isPertView && pertContainer && pertContainer.style.display !== 'none') {
            try {
                renderPertChart(gantt.tasks);
                addLog('🔄 PERT 视图已自动刷新');
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
        if (viewType === 'pert' && !isPertView) {
            toggleButton.click();
        } else if (viewType === 'gantt' && isPertView) {
            toggleButton.click();
        }
    }

    // ==================== 导出到全局 ====================
    
    global.isPertView = isPertView;
    global.refreshPertViewIfActive = refreshPertViewIfActive;
    global.getCurrentView = getCurrentView;
    global.switchToView = switchToView;

    console.log('✅ app-view-switcher.js loaded successfully (Epsilon1)');

})(typeof window !== 'undefined' ? window : this);
