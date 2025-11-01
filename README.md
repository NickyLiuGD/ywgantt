# 扬维公司甘特图应用

访问 https://{your-username}.github.io/ywgantt/   
当前即：https://nickyliugd.github.io/ywgantt/  
**更新**: 2025-11-01  
**版本**: Beta
<details><summary>📁 项目文件结构</summary>

```
gantt-chart/  
├── index.html              # 主HTML文件
├── css/  
│   └── gantt.css          # 样式
├── js/  
│   ├── utils.js           # 工具函数
│   ├── gantt-chart.js     # 核心类
│   ├── gantt-events.js    # 事件处理
│   ├── gantt-conflicts.js # 冲突检测
│   └── app.js             # 初始化
└── README.md              # 说明
```

</details>

<details><summary>📦 模块功能</summary>

1. **index.html**: 结构、加载脚本。
2. **gantt.css**: 样式、渐变、高亮。
3. **utils.js**: 日期、日志、ID、导出。
4. **gantt-chart.js**: 渲染、数据管理。
5. **gantt-events.js**: 事件、拖拽、编辑。
6. **gantt-conflicts.js**: 检测、修复冲突。
7. **app.js**: 初始化、绑定事件。

</details>

<details><summary>🔄 依赖关系</summary>

加载顺序: utils → chart → events → conflicts → app.

</details>

<details><summary>🎯 工作流程</summary>

1. 加载: HTML → CSS → JS。
2. 编辑: 选任务 → 表单 → 保存 → 渲染。
3. 拖拽: 按下 → 移动 → 释放。
4. 冲突: 检测 → 报告 → 高亮。

</details>

<details><summary>🚀 部署</summary>

1. 上传GitHub。
2. Settings → Pages → main → / → Save。
3. 访问: username.github.io/ywgantt。

</details>

<details><summary>✨ 优势</summary>

- 模块化、易维护。
- 拖拽、日志、依赖、冲突检测。
- 纯JS、响应式。

</details>

<details><summary>🎨 视觉</summary>

渐变条、选中高亮、冲突警告。

</details>

<details><summary>📊 数据</summary>

任务: id, name, start, end, progress, dependencies。

</details>

<details><summary>🔧 问题</summary>

- 按钮无效: 检查顺序、缓存。
- 冲突错: ID检查。
- 消失: 滚动查找。
- 样式错: 文件路径。

</details>

<details><summary>🛠️ 建议</summary>

优化: 版本号、压缩。
扩展: 图片、路径、资源。

</details>

<details><summary>📄 许可证</summary>MIT</details>

<details><summary>👨‍💻 作者</summary>扬维团队</details>

<details><summary>🙏 致谢</summary>Bootstrap, CDNJS, GitHub Pages。</details>
