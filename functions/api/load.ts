interface Env {
    GANTT_STORAGE: KVNamespace;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
    try {
        const url = new URL(context.request.url);
        const filename = url.searchParams.get('filename');
        
        if (!filename) {
            return Response.json({ 
                success: false, 
                error: '缺少文件名参数' 
            }, { status: 400 });
        }
        
        const data = await context.env.GANTT_STORAGE.get(filename, { type: 'text' });
        
        if (!data) {
            return Response.json({ 
                success: false, 
                error: '文件不存在' 
            }, { status: 404 });
        }
        
        return Response.json({ 
            success: true, 
            data: JSON.parse(data) 
        });
        
    } catch (error: any) {
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
