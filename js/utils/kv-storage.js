// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓ Cloudflare KV 存储工具                                          ▓▓
// ▓▓ 路径: js/utils/kv-storage.js                                   ▓▓
// ▓▓ 版本: 1.0                                                      ▓▓
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

    // 导出到全局
    global.saveToKV = saveToKV;
    global.loadFromKV = loadFromKV;
    global.listKVFiles = listKVFiles;
    global.deleteFromKV = deleteFromKV;

    console.log('✅ kv-storage.js loaded successfully');

})(typeof window !== 'undefined' ? window : this);
