interface Env {
    GANTT_STORAGE: KVNamespace;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
    try {
        const list = await context.env.GANTT_STORAGE.list();
        
        const files = list.keys.map(key => ({
            name: key.name,
            timestamp: key.metadata?.timestamp || 0,
            size: key.metadata?.size || 0,
            taskCount: key.metadata?.taskCount || 0
        })).sort((a, b) => b.timestamp - a.timestamp);
        
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
