interface Env {
    GANTT_STORAGE: KVNamespace;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
    try {
        const { filename, data } = await context.request.json();
        
        if (!filename || !/^[\w\-]+\.json$/.test(filename)) {
            return Response.json({ success: false, error: '无效的文件名' }, { status: 400 });
        }
        
        await context.env.GANTT_STORAGE.put(filename, JSON.stringify(data), {
            metadata: {
                timestamp: Date.now(),
                size: JSON.stringify(data).length,
                taskCount: Array.isArray(data) ? data.length : data.tasks?.length || 0
            }
        });
        
        return Response.json({ 
            success: true, 
            filename,
            message: '保存成功' 
        });
        
    } catch (error: any) {
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
