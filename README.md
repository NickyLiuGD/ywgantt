# 扬维公司甘特图应用

## 📁 项目文件结构

```
gantt-chart/  
├── index.html              # 主HTML文件（带时间戳缓存控制）
├── css/  
│   └── gantt.css          # 甘特图样式（包含冲突高亮）
├── js/  
│   ├── utils.js           # 工具函数模块
│   ├── gantt-chart.js     # 甘特图核心类
│   ├── gantt-events.js    # 事件处理模块
│   ├── gantt-conflicts.js # 冲突检测模块（新增）
│   └── app.js             # 应用初始化和事件绑定
└── README.md              # 项目说明文档
```

---

## 📦 模块功能说明

### **1. index.html** - 主界面文件
**职责**：页面结构和脚本加载控制

**主要功能**：
- 📋 控制面板布局（任务管理、编辑设置）
- 🎨 Bootstrap UI框架引入
- ⏱️ 动态时间戳防止缓存（开发模式）
- 🔄 脚本按依赖顺序加载
- ✅ 模块加载状态检测

**关键特性**：
```javascript
// 自动添加时间戳到所有资源
const timestamp = new Date().getTime();
// CSS: gantt.css?t=1699123456789
// JS:  utils.js?t=1699123456789
```

---

### **2. css/gantt.css** - 样式表
**职责**：所有视觉样式定义

**样式模块**：
- 🎨 **全局样式**：字体、背景、容器
- 🎛️ **控制面板**：按钮、开关、日志区域
- 📊 **甘特图布局**：侧边栏、时间轴、任务行
- 🎯 **任务条样式**：渐变色、进度条、拖拽手柄
- ⚠️ **冲突高亮**：红色闪烁动画、边框标记
- 🔗 **依赖箭头**：SVG 连接线样式

**特色样式**：
```css
/* 渐变任务条 */
.gantt-bar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 冲突任务脉动效果 */
.gantt-bar.conflict {
    animation: pulse-conflict 2s infinite;
}
```

---

### **3. js/utils.js** - 工具函数模块
**职责**：提供通用的辅助函数

**功能分类**：

#### 📅 **日期处理函数**
- `formatDate(date)` - 格式化为 YYYY-MM-DD
- `addDays(date, days)` - 日期加减运算
- `daysBetween(date1, date2)` - 计算天数差
- `isWeekend(date)` - 判断是否周末
- `isToday(date)` - 判断是否今天

#### 📝 **日志记录**
- `addLog(message)` - 添加操作日志（带时间戳）

#### 🔧 **数据处理**
- `generateId()` - 生成唯一任务ID
- `deepClone(obj)` - 深拷贝对象
- `downloadJSON(data, filename)` - 导出JSON文件

**使用示例**：
```javascript
const tomorrow = addDays(new Date(), 1);
const duration = daysBetween('2025-01-01', '2025-01-10'); // 9天
addLog('✅ 任务已完成');
```

---

### **4. js/gantt-chart.js** - 甘特图核心类
**职责**：甘特图的渲染和数据管理

**核心类：GanttChart**

#### 🏗️ **初始化**
```javascript
constructor(selector, tasks, options)
```
- `selector`: DOM选择器（如 '#gantt'）
- `tasks`: 任务数组
- `options`: 配置选项（宽度、显示周末等）

#### 🎨 **渲染方法**
- `render()` - 完整渲染甘特图
- `renderRow(task, dates)` - 渲染单个任务行
- `generateDates()` - 生成日期数组
- `calculateDateRange()` - 计算显示的日期范围

#### 📊 **数据管理**
- `addTask(task)` - 添加新任务
- `deleteTask(taskId)` - 删除任务
- `selectTask(taskId)` - 选中任务
- `getSelectedTask()` - 获取选中的任务
- `updateOptions(options)` - 更新配置

#### ⚙️ **配置选项**
```javascript
{
    cellWidth: 60,           // 单元格宽度（px）
    showWeekends: true,      // 显示周末
    enableEdit: true,        // 启用拖拽移动
    enableResize: true,      // 启用调整大小
    showDependencies: true   // 显示依赖箭头
}
```

**任务数据结构**：
```javascript
{
    id: 'task-123',
    name: '网站设计',
    start: '2025-01-01',
    end: '2025-01-10',
    progress: 65,
    dependencies: ['task-456', 'task-789']
}
```

---

### **5. js/gantt-events.js** - 事件处理模块
**职责**：处理所有用户交互事件

**扩展方法（通过 `GanttChart.prototype`）**：

#### 🎯 **事件绑定**
- `attachEvents()` - 绑定所有交互事件

#### ✏️ **编辑功能**
- `editTaskName(element)` - 双击编辑任务名称（就地编辑）

#### 🖱️ **拖拽功能**
- `startDrag(e, task, bar)` - 开始拖动任务（移动日期）
- `startResize(e, task, bar, isRight)` - 开始调整大小
- `onMouseMove(e)` - 拖拽过程中更新位置
- `onMouseUp(e)` - 结束拖拽并保存

**交互流程**：
```
1. 鼠标按下 → startDrag/startResize
2. 鼠标移动 → onMouseMove（实时更新UI）
3. 鼠标释放 → onMouseUp（保存数据）
```

**支持的操作**：
- 🖱️ 拖动任务条主体 → 整体移动日期
- ↔️ 拖动左侧手柄 → 修改开始日期
- ↔️ 拖动右侧手柄 → 修改结束日期
- 🖊️ 双击任务名 → 就地编辑
- 🖊️ 双击任务条 → 快速编辑名称

---

### **6. js/gantt-conflicts.js** - 冲突检测模块 🆕
**职责**：检测和修复任务依赖关系中的时间冲突

**核心功能**：

#### 🔍 **冲突检测**
- `detectTaskConflicts(task, allTasks)` - 检测单个任务的冲突
- `detectAllConflicts(tasks)` - 检测所有任务的冲突

### **冲突判断规则** 🆕

任务必须在其**所有依赖任务完成后的次日**才能开始。

**正确示例**：
```
依赖任务：2025-01-01 ~ 2025-01-10
当前任务：2025-01-11 ~ 2025-01-20  ✅ 正确
```

**冲突示例**：
```
依赖任务：2025-01-01 ~ 2025-01-10
当前任务：2025-01-10 ~ 2025-01-20  ❌ 冲突（同一天）
当前任务：2025-01-08 ~ 2025-01-20  ❌ 冲突（早于结束）
```

**自动修复规则**：
系统会自动将冲突任务移动到"最晚依赖任务结束日期 + 1天"。

**冲突类型**：
```javascript
// 1. 时间冲突：任务开始 < 依赖任务结束
{
    type: 'TIME_CONFLICT',
    taskName: '内容编写',
    taskStart: '2025-01-05',
    dependencyName: '网站设计',
    dependencyEnd: '2025-01-10',
    daysDiff: 5  // 冲突天数
}

// 2. 缺失依赖：依赖的任务不存在
{
    type: 'MISSING_DEPENDENCY',
    taskName: '测试审核',
    dependencyId: 'task-999'
}
```

#### 📊 **报告生成**
- `generateConflictReport(result)` - 生成HTML冲突报告
- `highlightConflictTasks(conflictTaskIds, container)` - 高亮冲突任务

#### 🔧 **自动修复**
- `autoFixConflicts(tasks)` - 自动调整任务时间
  - 将冲突任务移到依赖任务完成后
  - 保持任务持续时间不变

**扩展到 GanttChart 类的方法**：
- `gantt.checkConflicts()` - 执行冲突检测并显示报告
- `gantt.autoFixConflicts()` - 自动修复所有冲突
- `gantt.clearConflictHighlights()` - 清除冲突高亮

**使用示例**：
```javascript
// 检测冲突
const result = gantt.checkConflicts();
// 输出：⚠️ 发现 2 个时间冲突，涉及 1 个任务

// 自动修复
gantt.autoFixConflicts();
// 输出：✅ 已自动修复 2 个时间冲突
```

---

### **7. js/app.js** - 应用初始化
**职责**：应用启动和按钮事件绑定

**主要功能**：

#### 🎬 **初始化**
- 创建初始任务数据
- 实例化 GanttChart 对象
- 显示欢迎日志

#### 🎯 **任务管理按钮**
- ➕ 添加新任务
- 🗑️ 删除选中任务
- 💾 导出JSON文件
- 📂 加载JSON文件

#### 🔍 **冲突检测按钮** 🆕
- 🔍 检测时间冲突
- 🔧 自动修复冲突
- 🔄 清除冲突高亮

#### ⚙️ **编辑设置开关**
- 🖱️ 启用/禁用拖拽移动
- ↔️ 启用/禁用调整时长
- 📅 显示/隐藏周末
- 🔗 显示/隐藏依赖箭头
- 📏 调整时间轴密度（滑块）

#### 📝 **任务表单**
- `showTaskForm(task)` - 显示任务编辑表单
  - 任务名称编辑
  - 日期选择器
  - 进度滑块（实时预览）
  - 依赖关系设置

---

## 🔄 模块依赖关系

```
index.html
    ↓ 加载顺序
1. utils.js           ← 基础工具（无依赖）
    ↓
2. gantt-chart.js     ← 核心类（依赖 utils.js）
    ↓
3. gantt-events.js    ← 扩展核心类事件方法
    ↓
4. gantt-conflicts.js ← 扩展核心类冲突检测方法
    ↓
5. app.js             ← 初始化应用（依赖所有模块）
```

**加载顺序至关重要**！错误的顺序会导致 `GanttChart is not defined` 错误。

---

## 🎯 核心工作流程

### **1. 页面加载流程**
```
1. 加载 HTML 结构
2. 加载 Bootstrap CSS
3. 动态加载 gantt.css（带时间戳）
4. 按顺序加载 5 个 JS 模块
5. 创建 gantt 实例
6. 渲染初始甘特图
7. 绑定所有按钮事件
```

### **2. 任务编辑流程**
```
点击任务 → selectTask()
    ↓
显示编辑表单 → showTaskForm()
    ↓
修改数据 → 更新 task 对象
    ↓
保存 → calculateDateRange() → render()
```

### **3. 拖拽编辑流程**
```
鼠标按下 → startDrag/startResize
    ↓
鼠标移动 → onMouseMove（实时更新 UI）
    ↓
鼠标释放 → onMouseUp（保存并重新渲染）
```

### **4. 冲突检测流程** 🆕
```
点击检测按钮 → checkConflicts()
    ↓
遍历所有任务 → detectAllConflicts()
    ↓
生成报告 → generateConflictReport()
    ↓
高亮冲突任务 → highlightConflictTasks()
```

---

## 🚀 部署到 GitHub Pages 步骤

### **1. 创建仓库并上传所有文件**
```bash
git init
git add .
git commit -m "初始化甘特图项目"
git remote add origin https://github.com/{your-username}/ywgantt.git
git push -u origin main
```

### **2. 启用 GitHub Pages**
- 进入仓库 Settings → Pages
- Source 选择 `main` 分支
- Root 选择 `/` (根目录)
- 点击 Save

### **3. 访问应用**
```
https://{your-username}.github.io/ywgantt/
```
示例：`https://nickyliugd.github.io/ywgantt/`

### **4. 更新部署**
```bash
# 修改代码后
git add .
git commit -m "更新冲突检测功能"
git push

# GitHub Pages 会在 1-3 分钟内自动更新
```

---

## ✨ 项目优势

### **架构优势**
✅ **模块化设计** - 代码分离，职责清晰  
✅ **易于维护** - 单一职责，修改影响小  
✅ **便于调试** - 每个模块可独立测试  
✅ **可扩展** - 轻松添加新功能模块  
✅ **版本控制友好** - 冲突少，合并简单

### **功能优势**
✅ **可视化拖拽** - 直观的交互体验  
✅ **实时反馈** - 操作日志即时显示  
✅ **数据持久化** - JSON 导入导出  
✅ **依赖管理** - 箭头可视化依赖关系  
✅ **冲突检测** 🆕 - 自动发现时间冲突  
✅ **智能修复** 🆕 - 一键修复所有冲突

### **技术优势**
✅ **纯 JavaScript** - 无框架依赖，轻量快速  
✅ **响应式设计** - Bootstrap 5 支持  
✅ **现代 CSS** - 渐变、动画、阴影  
✅ **防缓存机制** - 时间戳自动更新  
✅ **错误检测** - 自动检测模块加载状态

---

## 🎨 视觉特色

### **渐变色任务条**
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### **选中高亮**
```css
background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
```

### **冲突警告** 🆕
```css
background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
animation: pulse-conflict 2s infinite;
```

---

## 📊 数据格式

### **任务对象结构**
```json
{
    "id": "task-1699123456789-abc123",
    "name": "网站设计",
    "start": "2025-11-01",
    "end": "2025-11-10",
    "progress": 65,
    "dependencies": ["task-1699123456788-xyz789"]
}
```

### **导出文件示例**
```json
[
    {
        "id": "task-1",
        "name": "需求分析",
        "start": "2025-01-01",
        "end": "2025-01-05",
        "progress": 100,
        "dependencies": []
    },
    {
        "id": "task-2",
        "name": "UI设计",
        "start": "2025-01-06",
        "end": "2025-01-15",
        "progress": 80,
        "dependencies": ["task-1"]
    }
]
```

---

## 🔧 常见问题

### **Q1: 按钮不响应？**
**A:** 检查浏览器控制台是否有 `GanttChart is not defined` 错误
- 确认脚本加载顺序正确
- 强制刷新清除缓存：`Ctrl + Shift + R`

### **Q2: 冲突检测不准确？**
**A:** 检查依赖任务ID是否正确
- 在任务编辑表单中查看"可用任务ID"
- 确保依赖的任务真实存在

### **Q3: 拖拽后任务消失？**
**A:** 可能拖出了可视范围
- 使用滚动条查找
- 或重新加载页面恢复数据

### **Q4: 样式显示异常？**
**A:** 检查 CSS 文件是否正确加载
- F12 → Network 查看 gantt.css 状态
- 确认文件路径为 `css/gantt.css`

---

## 🛠️ 开发建议

### **生产环境优化**
1. **切换到版本号方案**（而非时间戳）
```html
<link rel="stylesheet" href="css/gantt.css?v=1.0.1">
<script src="js/app.js?v=1.0.1"></script>
```

2. **压缩 JS/CSS 文件**
```bash
# 使用 UglifyJS 压缩
uglifyjs app.js -c -m -o app.min.js
```

3. **启用 CDN 加速**（如果流量大）

### **功能扩展建议**
- 📊 **导出为图片** - 使用 html2canvas
- 📅 **关键路径分析** - 自动计算最长路径
- 👥 **资源分配** - 为任务分配人员
- 🔔 **提醒功能** - 临近截止日期提醒
- 🌐 **多语言支持** - i18n 国际化
- 💾 **云端同步** - localStorage + 云存储

---

## 📄 许可证

MIT License - 自由使用和修改

---

## 👨‍💻 作者

扬维公司技术团队

---

## 🙏 致谢

- Bootstrap 5 - UI 框架
- CDNJS - 静态资源托管
- GitHub Pages - 免费静态网站托管

---

**最后更新**：2025-11-01  
**版本**：Beta (含冲突检测功能)