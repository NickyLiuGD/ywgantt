interface Env {
    GANTT_STORAGE: KVNamespace;
}

export async function onRequestDelete(context: { request: Request; env: Env }) {
    try {
        const url = new URL(context.request.url);
        const filename = url.searchParams.get('filename');
        
        if (!filename) {
            return Response.json({ 
                success: false, 
                error: '缺少文件名参数' 
            }, { status: 400 });
        }
        
        await context.env.GANTT_STORAGE.delete(filename);
        
        return Response.json({ 
            success: true, 
            message: '文件已删除' 
        });
        
    } catch (error: any) {
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
