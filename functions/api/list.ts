interface Env {
    GANTT_STORAGE: KVNamespace;
}

interface FileMetadata {
    timestamp?: number;
    size?: number;
    taskCount?: number;
    projectName?: string; // ⭐ 新增类型定义
}

export async function onRequestGet(context: { request: Request; env: Env }) {
    try {
        const list = await context.env.GANTT_STORAGE.list<FileMetadata>();
        
        const files = list.keys.map(key => {
            const meta = key.metadata || {};
            
            return {
                key: key.name, // 内部 Key (如 proj_123.json)
                // ⭐ 外部名称：如果有元数据则使用，否则回退到 Key
                name: meta.projectName || key.name, 
                timestamp: meta.timestamp || 0,
                size: meta.size || 0,
                taskCount: meta.taskCount || 0
            };
        }).sort((a, b) => b.timestamp - a.timestamp);
        
        return Response.json({ 
            success: true, 
            files 
        });
        
    } catch (error: any) {
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}