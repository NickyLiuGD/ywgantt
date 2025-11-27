// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ Cloudflare KV 存储工具                                          ▓▓
// ▓▓ 路径: js/utils/kv-storage.js                                   ▓▓
// ▓▓ 版本: Epsilon12-UnifiedSort                                    ▓▓
// ▓▓ 新增: processAndSortFiles (统一列表排序逻辑)                    ▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function(global) {
    'use strict';

    /**
     * 保存数据到 KV
     */
    async function saveToKV(filename, data) {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, data })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result;
    }

    /**
     * 从 KV 加载数据
     */
    async function loadFromKV(filename) {
        const response = await fetch(`/api/load?filename=${encodeURIComponent(filename)}`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result.data;
    }

    /**
     * 获取文件列表
     */
    async function listKVFiles() {
        const response = await fetch('/api/list');
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result.files;
    }

    /**
     * 删除文件
     */
    async function deleteFromKV(filename) {
        const response = await fetch(`/api/delete?filename=${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result;
    }

    /**
     * ⭐ 新增：统一的文件处理与排序逻辑
     * 1. 过滤掉历史文件，只保留主项目文件
     * 2. 检查对应的历史文件时间戳，如果比主文件新，更新有效时间
     * 3. 按最新有效时间倒序排列
     */
    function processAndSortFiles(allFiles) {
        const projectMap = new Map();

        // 1. 提取所有主项目文件
        allFiles.forEach(f => {
            const key = f.key || f.name;
            if (!key.endsWith('_history.json')) {
                projectMap.set(key, {
                    ...f,
                    fileKey: key,
                    displayName: f.name, // 后端 metadata.projectName
                    effectiveTimestamp: f.timestamp,
                    hasUnsavedChanges: false
                });
            }
        });

        // 2. 扫描历史文件，更新主项目的有效时间
        allFiles.forEach(f => {
            const key = f.key || f.name;
            if (key.endsWith('_history.json')) {
                const mainKey = key.replace('_history.json', '.json');
                if (projectMap.has(mainKey)) {
                    const project = projectMap.get(mainKey);
                    // 如果历史增量比主快照更新
                    if (f.timestamp > project.effectiveTimestamp) {
                        project.effectiveTimestamp = f.timestamp;
                        project.hasUnsavedChanges = true;
                    }
                }
            }
        });

        // 3. 排序
        return Array.from(projectMap.values())
            .sort((a, b) => b.effectiveTimestamp - a.effectiveTimestamp);
    }

    // 导出到全局
    global.saveToKV = saveToKV;
    global.loadFromKV = loadFromKV;
    global.listKVFiles = listKVFiles;
    global.deleteFromKV = deleteFromKV;
    global.processAndSortFiles = processAndSortFiles; // ⭐ 导出新函数

    console.log('✅ kv-storage.js loaded successfully (With Unified Sort)');

})(typeof window !== 'undefined' ? window : this);