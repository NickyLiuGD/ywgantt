# 在线甘特图

访问 https://{your-username}.github.io/ywgantt/   
当前即：https://nickyliugd.github.io/ywgantt/  

**更新**: 2025-01-10  
**版本**: Zeta

---

<details>
<summary>📁 <strong>项目文件结构（模块化架构）</strong></summary>

```
ywgantt/
├── index.html                    # 主HTML文件（模块化加载器）
├── css/
│   └── gantt.css                # 样式文件（现代微光设计）
├── js/
│   ├── utils/                   # 🔧 工具函数模块
│   │   ├── date-utils.js       #   - 日期处理（格式化/计算/判断）
│   │   ├── log-utils.js        #   - 日志记录（防抖批量写入）
│   │   └── data-utils.js       #   - 数据处理（ID生成/深拷贝/JSON导出/SVG路径）
│   │
│   ├── gantt/                   # 📊 甘特图核心模块
│   │   ├── gantt-core.js       #   - 核心类定义（构造函数/初始化/销毁）
│   │   ├── gantt-render.js     #   - 渲染逻辑（HTML生成/滚动同步）
│   │   ├── gantt-dependencies.js #  - 依赖关系（SVG箭头绘制/递归查找）
│   │   └── gantt-operations.js #   - 任务操作（增删改查/选中居中/高度自适应）
│   │
│   ├── events/                  # 🖱️ 事件处理模块
│   │   ├── gantt-events-binding.js # - 事件绑定（点击/双击/悬停）
│   │   ├── gantt-events-drag.js    # - 拖拽操作（移动/调整大小）
│   │   └── gantt-events-form.js    # - 编辑表单（工期输入/依赖管理）
│   │
│   ├── app/                     # 🚀 应用层模块
│   │   ├── app-init.js         #   - 应用初始化（实例创建/窗口监听）
│   │   ├── app-controls.js     #   - 控制按钮（工具栏/文件操作）
│   │   └── app-settings.js     #   - 设置面板（配置项/PERT视图）
│   │
│   └── gantt-conflicts.js       # ⚠️ 冲突检测模块（独立模块）
│
└── README.md                     # 项目说明文档
```

### 模块依赖关系图

```
┌─────────────────────────────────────────────────────────┐
│                    index.html                           │
│               (模块加载器 + 页面结构)                    │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │  按依赖顺序加载5层模块   │
        └────────────┬────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐      ┌───▼────┐      ┌───▼────┐
│ 第1层  │      │ 第2层  │      │ 第3层  │
│工具函数│ ───> │甘特核心│ ───> │事件处理│
└────────┘      └────────┘      └────────┘
    │                │                │
    │           ┌────▼────┐      ┌───▼────┐
    │           │ 第4层   │      │ 第5层  │
    └──────────>│冲突检测 │ ───> │应用层  │
                └─────────┘      └────────┘

详细依赖链：
第1层: date-utils.js, log-utils.js, data-utils.js (无依赖)
第2层: gantt-core.js → gantt-render.js → gantt-dependencies.js → gantt-operations.js
第3层: gantt-events-binding.js → gantt-events-drag.js → gantt-events-form.js
第4层: gantt-conflicts.js (依赖第1、2层)
第5层: app-init.js → app-controls.js → app-settings.js (依赖所有前置模块)
```

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
- **紧凑模式**: 行高40px，列宽50px（可调）

</details>

<details>
<summary>✏️ 任务编辑</summary>

- **添加任务**: 一键创建新任务
- **删除任务**: 确认后删除选中任务
- **工期输入**: 输入天数自动计算结束日期
- **修改属性**: 名称、开始日期、工期、进度
- **依赖设置**: 可视化选择依赖任务
- **双击编辑**: 任务名称双击快速编辑

</details>

<details>
<summary>🖱️ 交互操作</summary>

- **点击选择**: 点击任务名称或任务条选中
- **自动居中**: 选中任务自动滚动到视口中央（水平+垂直）
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
- **防循环**: 自动检测并警告循环依赖

</details>

### 高级功能
<details>
<summary>⚠️ 冲突检测</summary>

- **时间冲突**: 检测任务是否在依赖任务结束前开始
- **缺失依赖**: 检测不存在的依赖ID
- **可视化报告**: 详细的冲突列表和修复建议
- **高亮显示**: 冲突任务红色边框标注
- **智能提示**: 显示建议的正确开始时间

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
- **深拷贝**: 防止循环引用的安全深拷贝

</details>

<details>
<summary>📝 操作日志</summary>

- **实时记录**: 记录所有用户操作
- **时间戳**: 每条日志带精确时间
- **可折叠**: 点击标题展开/收起日志
- **自动滚动**: 新日志自动滚动到底部
- **开关控制**: 设置面板可隐藏日志区域
- **防抖优化**: 50ms内的日志合并写入

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
- **显示任务名称栏**: 显示/隐藏左侧任务名称列（带折叠按钮）
- **显示操作日志**: 显示/隐藏日志面板

### 视图调整
- **时间轴密度**: 40-80px，调整单元格宽度（默认50px）

</details>

---

<details>
<summary>🔄 <strong>模块化架构详解</strong></summary>

### 模块加载流程
```
页面加载
    ↓
index.html 初始化
    ↓
动态加载 CSS (带时间戳防缓存)
    ↓
顺序加载 JS 模块（5层依赖）
    ↓
[第1层] 工具函数模块
    ├─ date-utils.js  (日期工具)
    ├─ log-utils.js   (日志工具)
    └─ data-utils.js  (数据工具)
    ↓
[第2层] 甘特图核心模块
    ├─ gantt-core.js         (核心类)
    ├─ gantt-render.js       (渲染)
    ├─ gantt-dependencies.js (依赖)
    └─ gantt-operations.js   (操作)
    ↓
[第3层] 事件处理模块
    ├─ gantt-events-binding.js (绑定)
    ├─ gantt-events-drag.js    (拖拽)
    └─ gantt-events-form.js    (表单)
    ↓
[第4层] 冲突检测模块
    └─ gantt-conflicts.js
    ↓
[第5层] 应用层模块
    ├─ app-init.js     (初始化)
    ├─ app-controls.js (控制)
    └─ app-settings.js (设置)
    ↓
模块验证 (6项检查)
    ↓
页面显示 (淡入动画)
    ↓
应用就绪 ✅
```

### 模块职责说明

#### 🔧 工具函数模块 (utils/)
| 模块 | 导出函数 | 职责 |
|------|----------|------|
| date-utils.js | formatDate, addDays, daysBetween, isWeekend, isToday | 日期格式化、计算、判断 |
| log-utils.js | addLog | 防抖批量日志写入 |
| data-utils.js | generateId, deepClone, downloadJSON, createRoundedPath | ID生成、深拷贝、文件导出、SVG路径 |

#### 📊 甘特图核心模块 (gantt/)
| 模块 | 扩展方法 | 职责 |
|------|----------|------|
| gantt-core.js | GanttChart构造函数, init, calculateDateRange, generateDates | 类定义、初始化、日期计算 |
| gantt-render.js | render, renderTaskNames, renderDateHeaders, renderRow, setupScrollSync | HTML渲染、滚动同步 |
| gantt-dependencies.js | renderDependencies, generateDependencyPaths, getAllDependencies | 依赖箭头绘制、递归查找 |
| gantt-operations.js | selectTask, scrollTaskToCenter, updateHeight, addTask, deleteTask, toggleSidebar | 任务操作、居中滚动、高度自适应 |

#### 🖱️ 事件处理模块 (events/)
| 模块 | 扩展方法 | 职责 |
|------|----------|------|
| gantt-events-binding.js | attachEvents, deselect | 事件绑定、取消选择 |
| gantt-events-drag.js | startDrag, startResize, onMouseMove, onMouseUp | 拖拽移动、调整大小 |
| gantt-events-form.js | showInlineTaskForm, updateFormPosition, editTaskName | 编辑表单、位置计算、名称编辑 |

#### ⚠️ 冲突检测模块
| 模块 | 导出函数 | 职责 |
|------|----------|------|
| gantt-conflicts.js | detectTaskConflicts, detectAllConflicts, generateConflictReport, autoFixConflicts | 冲突检测、报告生成、自动修复 |

#### 🚀 应用层模块 (app/)
| 模块 | 全局变量 | 职责 |
|------|----------|------|
| app-init.js | gantt (实例), handleResize | 创建实例、窗口监听、初始日志 |
| app-controls.js | - | 工具栏按钮、文件操作、工具栏展开 |
| app-settings.js | isPertView | PERT切换、设置面板、配置项 |

### 加载验证机制
```javascript
验证项目:
1. formatDate !== undefined  (日期工具)
2. addLog !== undefined      (日志工具)
3. generateId !== undefined  (数据工具)
4. GanttChart !== undefined  (核心类)
5. gantt !== undefined       (实例)
6. detectAllConflicts !== undefined (冲突检测)

验证通过 → 显示成功日志
验证失败 → 弹窗提示 + 控制台错误
```

</details>

---

<details>
<summary>🎯 <strong>完整工作流程</strong></summary>

### 初始化流程
<details>
<summary>1️⃣ 页面加载</summary>

```
HTML加载
    ↓
CSS动态加载 (带时间戳)
    ↓
JS模块顺序加载 (14个文件)
    ↓
模块验证 (6项检查)
    ↓
创建gantt实例 (初始5个任务)
    ↓
初始渲染
    ↓
页面淡入显示
    ↓
初始化高度 (500ms后)
```

</details>

<details>
<summary>2️⃣ 任务编辑流程</summary>

```
点击任务名称/任务条
    ↓
selectTask(taskId)
    ↓
高亮选中任务 + 依赖任务
    ↓
自动居中滚动 (水平+垂直)
    ↓
showInlineTaskForm(task)
    ↓
显示浮动编辑表单
    ↓
修改属性 (名称/开始/工期/进度/依赖)
    ↓
实时计算结束日期
    ↓
点击"保存" → 更新数据 → 重新渲染
```

</details>

<details>
<summary>3️⃣ 拖拽移动流程</summary>

```
mousedown (任务条主体)
    ↓
startDrag(e, task, bar)
    ↓
记录初始位置和日期
    ↓
mousemove (计算偏移量)
    ↓
实时更新任务条位置
    ↓
实时更新外部标签位置
    ↓
实时更新编辑表单位置 (如果打开)
    ↓
mouseup (保存新日期)
    ↓
重新计算日期范围 → 重新渲染
```

</details>

<details>
<summary>4️⃣ 冲突检测流程</summary>

```
点击"检测冲突"
    ↓
detectAllConflicts(tasks)
    ↓
遍历所有任务
    ↓
检查每个依赖关系
    ├─ 时间冲突: 任务开始 ≤ 依赖结束
    ├─ 缺失依赖: 依赖ID不存在
    └─ 循环依赖: 递归检测
    ↓
生成冲突报告 (HTML)
    ↓
显示在日志区 + 高亮冲突任务
```

</details>

<details>
<summary>5️⃣ 自动修复流程</summary>

```
点击"自动修复"
    ↓
autoFixConflicts(tasks)
    ↓
遍历冲突任务
    ↓
找出最晚依赖结束时间
    ↓
调整任务至次日开始
    ↓
保持任务工期不变
    ↓
更新数据 → 重新渲染
    ↓
二次检测验证 (100ms后)
    ↓
显示修复结果
```

</details>

<details>
<summary>6️⃣ 选中居中流程 (新功能)</summary>

```
selectTask(taskId)
    ↓
updateSelectionState(taskId)
    ↓
高亮任务条、标签、名称
    ↓
高亮依赖任务和箭头
    ↓
setTimeout 150ms (等待DOM更新)
    ↓
scrollTaskToCenter(taskId)
    ↓
计算任务条在内容中的绝对位置
    ↓
计算任务条中心点坐标
    ↓
计算目标滚动位置 (居中)
    ↓
限制滚动值在有效范围内
    ↓
平滑滚动 (smooth behavior)
    ↓
验证滚动结果 (500ms后)
```

</details>

</details>

---

<details>
<summary>✨ <strong>优化建议</strong></summary>

### 性能优化
<details>
<summary>建议实施</summary>

- **文件压缩**: 使用 UglifyJS 或 Terser 压缩JS
- **CSS压缩**: 使用 cssnano 压缩CSS
- **图片优化**: 使用WebP格式（如有）
- **懒加载**: 大量任务时分页加载
- **虚拟滚动**: 超过100个任务时启用
- **Web Worker**: 冲突检测移至后台线程

</details>

### 功能扩展
<details>
<summary>可扩展方向</summary>

- **甘特图导出**: 导出为PNG/PDF/Excel
- **任务分组**: 支持多层级任务（父子关系）
- **里程碑**: 添加项目关键节点
- **资源分配**: 任务分配人员和资源
- **权限控制**: 多用户协作编辑
- **撤销重做**: Ctrl+Z/Y 操作历史
- **快捷键**: 键盘快捷操作
- **主题切换**: 暗色/亮色模式
- **国际化**: 多语言支持
- **数据库集成**: 后端API对接

</details>

### 代码优化
<details>
<summary>代码质量提升</summary>

- **TypeScript**: 类型安全，减少运行时错误
- **单元测试**: Jest/Mocha 测试覆盖
- **代码分割**: Webpack/Rollup 打包优化
- **状态管理**: Redux/MobX（如需复杂状态）
- **组件化**: Vue/React重构（可选）
- **ESLint**: 代码规范检查
- **Prettier**: 代码格式化
- **文档生成**: JSDoc 自动生成API文档

</details>

</details>

---

<details>
<summary>📊 <strong>数据结构说明</strong></summary>

### 任务对象
```javascript
{
  id: "task-1234567890-abc123def4",  // 唯一ID (时间戳+随机字符)
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
    "id": "task-1730438400000-abc123def4",
    "name": "网站设计",
    "start": "2025-10-28",
    "end": "2025-11-05",
    "progress": 65,
    "dependencies": []
  },
  {
    "id": "task-1730524800000-xyz789ghi0",
    "name": "内容编写",
    "start": "2025-11-06",
    "end": "2025-11-13",
    "progress": 30,
    "dependencies": ["task-1730438400000-abc123def4"]
  }
]
```

### 冲突报告结构
```javascript
{
  hasConflicts: true,              // 是否有冲突
  conflictCount: 2,                // 冲突总数
  conflictTaskCount: 2,            // 冲突任务数
  conflictTaskIds: ["task-1", "task-2"], // 冲突任务ID列表
  conflicts: [
    {
      type: "TIME_CONFLICT",       // 冲突类型
      taskId: "task-2",
      taskName: "内容编写",
      taskStart: "2025-11-03",
      dependencyId: "task-1",
      dependencyName: "网站设计",
      dependencyEnd: "2025-11-05",
      daysDiff: 3,                 // 冲突天数
      correctStart: "2025-11-06",  // 建议开始日期
      message: "详细错误信息"
    }
  ]
}
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
- **HTML5**: 语义化标签、ARIA无障碍
- **CSS3**: Flexbox、Grid、动画、毛玻璃、渐变
- **JavaScript**: 
  - ES6 Class (面向对象)
  - 原型链扩展 (模块化)
  - DOM操作 (原生API)
  - 事件委托 (性能优化)
  - SVG动态绘制 (依赖箭头)
  - 防抖节流 (性能优化)
  - RequestAnimationFrame (流畅动画)

### 架构模式
- **模块化**: 14个独立模块，职责单一
- **分层架构**: 工具层 → 核心层 → 事件层 → 应用层
- **依赖注入**: 通过原型链扩展实现
- **观察者模式**: 事件监听和日志系统
- **策略模式**: 不同类型的冲突检测

### 开发工具
- **版本控制**: Git
- **代码编辑**: VS Code
- **调试工具**: Chrome DevTools
- **部署平台**: GitHub Pages

### 性能优化技术
- **缓存机制**: 日期数组缓存、今日日期缓存
- **防抖优化**: 日志写入、窗口resize
- **批量操作**: DocumentFragment批量插入DOM
- **懒加载**: 脚本顺序加载、CDN延迟加载
- **虚拟化**: 滚动同步使用RAF优化

