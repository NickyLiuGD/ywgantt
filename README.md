# 扬维公司甘特图应用

访问 https://{your-username}.github.io/ywgantt/   
当前即：https://nickyliugd.github.io/ywgantt/  

**更新**: 2025-11-02  
**版本**: Alpha2 (视觉优化版)

---

<details>
<summary>📦 <strong>快速开始</strong></summary>

### 本地运行
```bash
# 克隆项目
git clone https://github.com/{your-username}/ywgantt.git

# 进入目录
cd ywgantt

# 使用任意HTTP服务器运行
python -m http.server 8000
# 或
npx serve
```

### 在线访问
直接访问 GitHub Pages 地址即可使用

</details>

---

<details>
<summary>📁 <strong>项目文件结构</strong></summary>

```
ywgantt/
├── index.html              # 主HTML文件 (含图标优化)
├── css/
│   └── gantt.css          # 样式文件 (现代微光设计)
├── js/
│   ├── utils.js           # 工具函数 (日期/日志/导出)
│   ├── gantt-chart.js     # 核心类 (渲染/数据管理)
│   ├── gantt-events.js    # 事件处理 (拖拽/编辑/选择)
│   ├── gantt-conflicts.js # 冲突检测 (时间校验/自动修复)
│   └── app.js             # 应用初始化 (绑定事件/PERT视图)
└── README.md              # 项目说明
```

<details>
<summary>📄 各文件详细说明</summary>

### HTML文件
- **index.html**: 页面结构、工具栏、设置面板、日志区域

### CSS文件
- **gantt.css**: 
  - 工具栏动画 (脉冲、微光、呼吸)
  - 毛玻璃效果
  - 彩色图标系统
  - 设置面板样式
  - 甘特图表格样式

### JavaScript模块
- **utils.js**: 日期格式化、天数计算、日志记录、数据导出
- **gantt-chart.js**: GanttChart类、渲染逻辑、数据管理
- **gantt-events.js**: 鼠标事件、拖拽逻辑、双击编辑
- **gantt-conflicts.js**: 依赖冲突检测、自动修复算法
- **app.js**: 全局初始化、按钮绑定、PERT图渲染

</details>

</details>

---

<details>
<summary>🎨 <strong>视觉设计亮点</strong></summary>

### 工具栏设计
<details>
<summary>🎯 折叠按钮 (圆形渐变)</summary>

- ✅ 紫色渐变背景 (#667eea → #764ba2)
- ✅ 脉冲动画 (2秒循环)
- ✅ 微光扫过效果 (3秒循环)
- ✅ 悬停放大+旋转 (1.1倍 + 5度)
- ✅ 阴影动态加深
- ✅ 圆形设计 (56×56px)

</details>

<details>
<summary>🎨 展开工具栏 (毛玻璃)</summary>

- ✅ 毛玻璃背景 (backdrop-filter: blur 20px)
- ✅ 半透明白色背景 (rgba 0.85)
- ✅ 圆角卡片 (20px)
- ✅ 多层阴影叠加
- ✅ 边框高光效果
- ✅ 流畅滑入动画 (cubic-bezier)

</details>

<details>
<summary>🌈 彩色图标系统</summary>

| 功能 | 图标 | 颜色 | 色值 |
|------|------|------|------|
| 添加任务 | ➕ | 绿色 | #10b981 |
| 删除任务 | 🗑️ | 红色 | #ef4444 |
| 导出文件 | 💾 | 蓝色 | #3b82f6 |
| 加载文件 | 📂 | 紫色 | #8b5cf6 |
| 检测冲突 | 🔍 | 橙色 | #f59e0b |
| 自动修复 | 🔧 | 青色 | #06b6d4 |
| 清除高亮 | 🧹 | 灰色 | #64748b |
| 切换视图 | 🔄 | 粉色 | #ec4899 |
| 设置面板 | ⚙️ | 渐变紫 | #667eea |

</details>

<details>
<summary>💫 交互动画</summary>

- ✅ **呼吸光晕**: 2秒循环，悬停触发，图标发光
- ✅ **图标放大**: 悬停1.1倍缩放
- ✅ **文字滑入**: 悬停展开按钮文字
- ✅ **背景渐变**: 悬停显示淡紫色背景
- ✅ **齿轮旋转**: 设置按钮2秒完整旋转
- ✅ **脉冲扩散**: 折叠按钮持续脉冲效果

</details>

### 设置面板设计
<details>
<summary>🎛️ 面板特性</summary>

- ✅ 侧滑毛玻璃面板
- ✅ 卡片化设置项
- ✅ 悬停左移效果
- ✅ 现代开关按钮 (渐变激活态)
- ✅ 渐变滑块控制
- ✅ 关闭按钮旋转动画 (90度)
- ✅ 标题渐变文字

</details>

</details>

---

<details>
<summary>🔧 <strong>核心功能模块</strong></summary>

### 基础功能
<details>
<summary>📊 甘特图核心</summary>

- **任务渲染**: 自动计算日期范围，动态生成时间轴
- **任务条样式**: 渐变色背景，进度条显示
- **日期标注**: 今日高亮，周末灰化
- **自适应布局**: 根据任务数量自动调整高度

</details>

<details>
<summary>✏️ 任务编辑</summary>

- **添加任务**: 一键创建新任务
- **删除任务**: 确认后删除选中任务
- **修改属性**: 名称、开始/结束日期、进度
- **依赖设置**: 可视化选择依赖任务
- **双击编辑**: 任务名称双击快速编辑

</details>

<details>
<summary>🖱️ 交互操作</summary>

- **悬停选择**: 鼠标悬停200ms自动选中
- **拖拽移动**: 左右拖动改变任务时间
- **调整时长**: 拖动左右边缘调整起止日期
- **依赖高亮**: 选中任务时高亮所有前置依赖
- **点击取消**: 点击空白处取消选择

</details>

<details>
<summary>🔗 依赖关系</summary>

- **依赖箭头**: SVG绘制带圆角的依赖路径
- **递归检测**: 自动获取所有前置依赖
- **多级高亮**: 显示完整依赖链条
- **智能路径**: 根据任务位置自动计算箭头路径

</details>

### 高级功能
<details>
<summary>⚠️ 冲突检测</summary>

- **时间冲突**: 检测任务是否在依赖任务结束前开始
- **缺失依赖**: 检测不存在的依赖ID
- **可视化报告**: 详细的冲突列表和修复建议
- **高亮显示**: 冲突任务红色边框标注

</details>

<details>
<summary>🔧 自动修复</summary>

- **智能调整**: 自动将任务移至依赖结束后次日
- **保持时长**: 修复时保持任务原有工期
- **批量修复**: 一键修复所有时间冲突
- **修复日志**: 记录每次修复的详细信息
- **二次验证**: 修复后自动检测是否有遗留冲突

</details>

<details>
<summary>🔄 PERT视图</summary>

- **网络图**: 基于依赖关系的项目网络图
- **自动布局**: 按依赖层级自动排列节点
- **节点信息**: 显示任务名称、工期、完成度
- **箭头连接**: 展示任务间的依赖关系
- **视图切换**: 甘特图/PERT图一键切换

</details>

<details>
<summary>💾 数据管理</summary>

- **导出JSON**: 保存任务数据为JSON文件
- **加载JSON**: 从文件恢复任务数据
- **文件命名**: 自动生成带时间戳的文件名
- **数据验证**: 加载时自动校验数据格式

</details>

<details>
<summary>📝 操作日志</summary>

- **实时记录**: 记录所有用户操作
- **时间戳**: 每条日志带精确时间
- **可折叠**: 点击标题展开/收起日志
- **自动滚动**: 新日志自动滚动到底部
- **开关控制**: 设置面板可隐藏日志区域

</details>

</details>

---

<details>
<summary>⚙️ <strong>设置选项</strong></summary>

### 编辑控制
- **拖拽移动任务**: 启用/禁用任务条拖拽
- **拖拽调整时长**: 启用/禁用边缘拖拽

### 显示控制
- **显示周末**: 显示/隐藏周末列
- **显示依赖箭头**: 显示/隐藏依赖关系线
- **显示操作日志**: 显示/隐藏日志面板

### 视图调整
- **时间轴密度**: 40-100px，调整单元格宽度

</details>

---

<details>
<summary>🔄 <strong>依赖关系与加载顺序</strong></summary>

### 模块依赖图
```
index.html
    ↓
[加载顺序]
    ↓
1. utils.js          → 工具函数
    ↓
2. gantt-chart.js    → 核心类 (依赖 utils.js)
    ↓
3. gantt-events.js   → 事件扩展 (依赖 gantt-chart.js)
    ↓
4. gantt-conflicts.js → 冲突检测 (依赖 gantt-chart.js, utils.js)
    ↓
5. app.js            → 初始化 (依赖所有模块)
```

### 关键依赖说明
<details>
<summary>查看详细依赖关系</summary>

- **utils.js**: 无依赖，纯工具函数
- **gantt-chart.js**: 依赖 utils.js 的日期函数
- **gantt-events.js**: 扩展 GanttChart.prototype
- **gantt-conflicts.js**: 扩展 GanttChart.prototype，使用工具函数
- **app.js**: 创建 gantt 实例，绑定所有事件

</details>

</details>

---

<details>
<summary>🎯 <strong>完整工作流程</strong></summary>

### 初始化流程
<details>
<summary>1️⃣ 页面加载</summary>

```
HTML加载 → CSS加载 → JS按序加载 → 创建gantt实例 → 初始渲染
```

</details>

<details>
<summary>2️⃣ 任务编辑流程</summary>

```
悬停任务条 (200ms)
    ↓
自动选中
    ↓
显示编辑表单
    ↓
修改属性
    ↓
保存 → 重新渲染
```

</details>

<details>
<summary>3️⃣ 拖拽移动流程</summary>

```
mousedown (任务条)
    ↓
记录初始位置
    ↓
mousemove (计算偏移)
    ↓
实时更新位置
    ↓
mouseup (保存新日期) → 重新渲染
```

</details>

<details>
<summary>4️⃣ 冲突检测流程</summary>

```
点击"检测冲突"
    ↓
遍历所有任务
    ↓
检查每个依赖关系
    ↓
生成冲突报告
    ↓
显示在日志区 + 高亮任务条
```

</details>

<details>
<summary>5️⃣ 自动修复流程</summary>

```
点击"自动修复"
    ↓
找出最晚依赖结束时间
    ↓
调整任务至次日开始
    ↓
保持任务工期不变
    ↓
更新数据 → 重新渲染 → 二次检测验证
```

</details>

</details>

---

<details>
<summary>🚀 <strong>GitHub Pages 部署</strong></summary>

### 部署步骤
```bash
# 1. 创建仓库
在 GitHub 创建名为 ywgantt 的仓库

# 2. 上传代码
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/{username}/ywgantt.git
git push -u origin main

# 3. 开启 Pages
Settings → Pages → Source: main → Folder: / → Save

# 4. 访问
https://{username}.github.io/ywgantt/
```

### 更新部署
```bash
# 修改代码后
git add .
git commit -m "Update description"
git push

# 等待1-2分钟自动部署
```

</details>

---

<details>
<summary>🛠️ <strong>常见问题排查</strong></summary>

### 按钮无效
<details>
<summary>解决方案</summary>

1. **检查加载顺序**: F12 → Console，确认无报错
2. **清除缓存**: Ctrl+Shift+R 强制刷新
3. **检查文件路径**: 确认 js/ 和 css/ 目录正确
4. **查看时间戳**: URL带 `?t=...` 确保最新版本

</details>

### 冲突检测错误
<details>
<summary>解决方案</summary>

1. **检查任务ID**: 确保所有依赖ID存在
2. **检查日期格式**: YYYY-MM-DD 格式
3. **查看日志**: 日志区会显示详细错误
4. **尝试修复**: 先执行"自动修复"再检测

</details>

### 任务条消失
<details>
<summary>解决方案</summary>

1. **检查日期**: 任务日期可能超出显示范围
2. **滚动查找**: 横向滚动时间轴
3. **重新加载**: 刷新页面重新计算日期范围
4. **查看数据**: 导出JSON检查任务数据

</details>

### 样式错乱
<details>
<summary>解决方案</summary>

1. **检查CSS路径**: 确认 css/gantt.css 存在
2. **Bootstrap冲突**: 确认Bootstrap CDN正常加载
3. **浏览器兼容**: 使用Chrome/Edge/Firefox最新版
4. **清除缓存**: 硬刷新或无痕模式测试

</details>

### 拖拽不生效
<details>
<summary>解决方案</summary>

1. **检查设置**: 设置面板中启用"拖拽移动/调整"
2. **检查事件**: 确认 gantt-events.js 已加载
3. **查看日志**: 拖拽时应有日志记录
4. **避免误点**: 确保点击任务条主体而非边缘

</details>

</details>

---

<details>
<summary>✨ <strong>优化建议</strong></summary>

### 性能优化
<details>
<summary>建议实施</summary>

- **文件压缩**: 使用工具压缩CSS/JS
- **图片优化**: 使用WebP格式
- **懒加载**: 大量任务时分页加载
- **虚拟滚动**: 超过100个任务时启用

</details>

### 功能扩展
<details>
<summary>可扩展方向</summary>

- **甘特图导出**: 导出为PNG/PDF
- **任务分组**: 支持多层级任务
- **里程碑**: 添加项目关键节点
- **资源分配**: 任务分配人员
- **权限控制**: 多用户协作编辑
- **撤销重做**: Ctrl+Z/Y 操作历史
- **快捷键**: 键盘快捷操作
- **主题切换**: 暗色/亮色模式

</details>

### 代码优化
<details>
<summary>代码质量提升</summary>

- **TypeScript**: 类型安全
- **单元测试**: Jest测试覆盖
- **代码分割**: Webpack打包优化
- **状态管理**: Redux/MobX
- **组件化**: Vue/React重构

</details>

</details>

---

<details>
<summary>📊 <strong>数据结构说明</strong></summary>

### 任务对象
```javascript
{
  id: "task-1234567890-abc123",     // 唯一ID
  name: "网站设计",                   // 任务名称
  start: "2025-10-28",               // 开始日期 YYYY-MM-DD
  end: "2025-11-05",                 // 结束日期 YYYY-MM-DD
  progress: 65,                      // 完成进度 0-100
  dependencies: ["task-xxx", ...]    // 依赖任务ID数组
}
```

### 导出JSON格式
```json
[
  {
    "id": "task-1730438400000-abc123",
    "name": "网站设计",
    "start": "2025-10-28",
    "end": "2025-11-05",
    "progress": 65,
    "dependencies": []
  },
  ...
]
```

</details>

---

<details>
<summary>🎓 <strong>技术栈</strong></summary>

### 前端框架
- **无框架**: 原生JavaScript (ES6+)
- **UI库**: Bootstrap 5.3.2
- **图表库**: AnyChart 8.13.0 (仅PERT)

### 核心技术
- **HTML5**: 语义化标签
- **CSS3**: Flexbox、Grid、动画、毛玻璃
- **JavaScript**: 
  - ES6 Class
  - 原型链扩展
  - DOM操作
  - 事件委托
  - SVG动态绘制

### 开发工具
- **版本控制**: Git
- **代码编辑**: VS Code
- **调试工具**: Chrome DevTools
- **部署平台**: GitHub Pages

</details>

---

<details>
<summary>📄 <strong>许可证</strong></summary>

MIT License

Copyright (c) 2025 扬维团队

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

</details>

---

<details>
<summary>👨‍💻 <strong>作者与贡献</strong></summary>

### 开发团队
- **扬维团队** - 初始开发与设计

### 贡献指南
欢迎提交 Issue 和 Pull Request！

贡献步骤:
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

</details>

---

<details>
<summary>🙏 <strong>致谢</strong></summary>

### 开源项目
- [Bootstrap](https://getbootstrap.com/) - UI框架
- [AnyChart](https://www.anychart.com/) - PERT图表库

### CDN服务
- [CDNJS](https://cdnjs.com/) - 静态资源加速
- [jsDelivr](https://www.jsdelivr.com/) - 备用CDN

### 托管平台
- [GitHub Pages](https://pages.github.com/) - 免费静态网站托管

### 设计灵感
- Material Design - 现代化UI设计
- Fluent Design - 毛玻璃效果
- iOS Design - 微动画交互

</details>

---

<details>
<summary>📞 <strong>联系方式</strong></summary>

### 问题反馈
- **GitHub Issues**: https://github.com/{username}/ywgantt/issues
- **Email**: contact@example.com

### 社交媒体
- **项目主页**: https://github.com/{username}/ywgantt
- **在线演示**: https://{username}.github.io/ywgantt

</details>

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给一个 Star ⭐**

Made with ❤️ by 扬维团队

</div>