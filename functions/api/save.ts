interface Env {
    GANTT_STORAGE: KVNamespace;
}

interface ProjectData {
    project?: {
        name?: string;
        [key: string]: any;
    };
    tasks?: any[];
    [key: string]: any;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
    try {
        const { filename, data } = await context.request.json() as { filename: string; data: ProjectData };
        
        // 1. 校验文件名 (保持之前的 ASCII 校验，确保 Key 安全)
        if (!filename || !/^[\w\-\.]+$/.test(filename)) {
            return Response.json({ success: false, error: '无效的文件名(Key)' }, { status: 400 });
        }
        
        // 2. 提取项目外部名称 (中文名)
        // 如果 data.project.name 存在则使用，否则回退到文件名
        const displayName = (data.project && data.project.name) ? data.project.name : filename;

        // 3. 计算其他元数据
        const taskCount = Array.isArray(data) ? data.length : (data.tasks?.length || 0);
        const size = JSON.stringify(data).length;

        // 4. 写入 KV，包含 projectName 元数据
        await context.env.GANTT_STORAGE.put(filename, JSON.stringify(data), {
            metadata: {
                timestamp: Date.now(),
                size: size,
                taskCount: taskCount,
                projectName: displayName // ⭐ 新增：存储外部展示名称
            }
        });
        
        return Response.json({ 
            success: true, 
            filename,
            projectName: displayName,
            message: '保存成功' 
        });
        
    } catch (error: any) {
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}