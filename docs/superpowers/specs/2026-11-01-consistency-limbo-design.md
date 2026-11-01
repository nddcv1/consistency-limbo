# Consistency Limbo：把 ε-δ 和一致连续做成可拖拽的 boss 关（设计文档）

- **状态**：设计定稿，未实现
- **日期**：2026-11-01
- **目标目录**：`D:\consistency-limbo`
- **目标仓库**：`nddcv1/consistency-limbo`（public，尚未创建）
- **在线地址**：`https://nddcv1.github.io/consistency-limbo/`
- **许可证**：MIT
- **名称检查**：2026-11-01 在 GitHub 搜索无 `consistency-limbo` 仓库；`nddcv1/consistency-limbo` 返回 404；"Consistency Limbo" 无同名数学游戏搜索结果。发布前再查一次。

## 0. 一句话

**给学数学分析的人：把 ε-δ 和一致连续拖出来，看见为止。**

English: **An interactive ε-δ playground for real-analysis students — drag until continuity clicks.**

GitHub About 建议：

> 给学数学分析的人：把 ε-δ 和一致连续拖出来看。 · An interactive ε-δ playground for real-analysis students.

## 1. 背景与差异化

### 1.1 原始想法

用户想做一个数学分析知识点可视化 + 可交互的开源项目，第一版聚焦 ε-δ 游戏：

- 画面画出 `y = f(x₀) ± ε` 的水平带和 `x₀ ± δ` 的垂直窗口。
- 玩家拖 δ，窗口内曲线全部落进带子就过关。
- 关卡从 `x²` 到 `sin(x²)`、`1/x`。
- 最有记忆点的是“一致连续 Limbo”：锁住 ε，只用一把 δ，让玩家自己撞上“δ 不能依赖 x₀”的墙。
- 纯前端 HTML + Canvas，一天做完 v1，无后端。

### 1.2 一个必须先修正的前提

ε-δ 交互工具已经存在，而且有些已经有 Uniform 模式：

| 工具 | 形态 | 与我们的关系 |
|---|---|---|
| [KU Leuven Continuity Checker](https://kulak.kuleuven.be/facult/wet/wiskunde/ooi/applets_shu/Math/Calculus/Ira/Continuity.html) | 课程 applet；有 Simple / Uniform 模式 | 证明“Uniform 模式有人做过”；不是游戏化产品 |
| [GeoGebra Epsilon-Delta Game](https://www.geogebra.org/m/YhZNXyzm) | 拖 ε、δ，把图像塞进绿框 | 最接近基础玩法；GeoGebra 生态内，不是独立开源仓库 |
| [Vanishing Point](https://playpendium.com/vanishing-point/) | 免费在线游戏；关卡、评分、每日模式 | 最接近“游戏”；未强调一致连续 boss，非开源 |
| [Tellurion Epsilon-Delta Continuity Visualizer](http://tellurion.dev/playgrounds/bsc-y1s1/M1017-epsilon-delta-continuity-visualizer/index.html) | 两阶段 ε-δ 教学交互 | 教学可视化，不是完整游戏 |
| [Wolfram Demonstration: Uniform Continuity](https://www.wolframcloud.com/obj/fe65ac2c-9491-4c1d-b545-33a21e64f79b) | 演示一致连续 | 证明概念可视化有人做过，形态是演示而非游戏 |

因此，README 和仓库描述**不写“没人做过”**，只写“我们把一致连续做成了 boss 关”。

### 1.3 真正的差异点

1. **Boss 叙事，而不是一个 Uniform 复选框。** 第一幕 `[0,1]` 先让玩家成功一次，第二幕 `[0,∞)` 让范围自动 ×10，直到玩家看见所需 δ → 0。
2. **一张包络图。** 右侧同时画“每个 x₀ 所需的最大 δ”和“玩家手里这把 δ”；横线压不到曲线下方，就是 limbo 墙。
3. **游戏感。** 五关、检查点、全 x₀ 扫描、200ms 镜头补间、通关脉冲；不是一个 GeoGebra 工作表。
4. **开源、零安装、中文优先。** 静态页面、MIT、无后端、一个链接直接玩；README 顶部有 GIF。
5. **诚实。** 数值采样和“引导式不可能”都写进 README 的 Known limitations，不把演示说成形式证明。

## 2. 目标与非目标

### 2.1 目标

1. 五关可在 5 分钟内玩完；每关有明确目标、即时反馈、没有死胡同。
2. 玩家在 boss 第二幕**亲身体验**量词顺序：对每个 `x₀` 都能找到 δ，但不存在一把 δ 管住所有 `x₀`。
3. 纯静态、无构建、无运行时依赖、无后端、无账号、无埋点。
4. README 顶部有 GIF（失败时用静态 PNG 兜底），在线 demo 可玩，仓库描述可直接说清“给谁、解决什么”。
5. 核心判定有 `node:test` 单测；五关和 boss 有手工验收清单。
6. v1 一个人一天能做完并留下打磨首屏 GIF 的时间。

### 2.2 非目标

- 不做任意函数输入 / 表达式解析（留到 v0.2）。
- 不做账号、排行榜、分享图、后端、数据库、analytics、cookie。
- 不做形式化证明、自动定理证明或严格的区间算术验证。
- 不做 UI 中英切换（v1 中文 UI；README 有一句英文定位）。
- 不做独立移动版布局；窄屏可操作即可。
- 不做音效、粒子特效、复杂 3D、框架、构建步骤。
- 不做“数学分析全知识点平台”；v1 只做这一款游戏，关卡数据可扩展但不搭框架。

## 3. 已确认决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 受众 | 国内数学分析初学者优先；README 英文一句话 | 定位清楚，文案成本低 |
| 函数来源 | 预设关卡 + x₀ 滑块 | 一天可完成；数值和定义域可靠 |
| 过关条件 | 窗口内所有有定义点落入 `f(x₀) ± ε`，全绿即过关 | 最直观，符合原始想法 |
| Boss 机制 | 锁 ε、一把全局 δ、扫描所有 x₀、镜头/范围自动 ×10 | 玩家自己撞墙，而不是被讲解告知 |
| Boss 结构 | 第一幕 `[0,1]` 正例 + 第二幕 `[0,∞)` 反例 | 先看见“能做到”，再看见“做不到” |
| 视觉 | 午夜蓝图：深靛蓝坐标纸、琥珀 ε 带、青绿 δ 窗、珊瑚红越界 | 接近 3B1B 气质，但不照搬；GitHub 首图醒目 |
| 技术 | 原生 ES modules + Canvas，5 个小模块，无运行时依赖 | 无构建、可测试、可直接 Pages |
| 测试 | `node --test` 测 `math.js` / `game.js`；渲染手工验收 | 数值和状态机是 bug 高发区；DOM 测试性价比低 |
| GIF | `playwright-core` 驱动本机 Edge + `gifenc` 编码；失败则静态 PNG | 本机无 ffmpeg / Python；Edge 可用，gh 已登录 |
| 仓库 | `nddcv1/consistency-limbo`，本地 `D:\consistency-limbo` | 与 ProofMap 分开；名字可用 |
| 发布 | GitHub Pages 从 `main` 根目录；发布前单独确认 | 不擅自创建公开仓库 |

## 4. 核心体验与关卡

### 4.1 每一关的共同循环

画面固定元素：

- 坐标纸、曲线、以 `x₀` 为中心的垂直 δ 窗、`y = f(x₀) ± ε` 的水平 ε 带。
- 右侧信息栏：关卡号、标题、目标、ε（固定/锁定）、δ 读数、状态。
- 底部控制台：`x₀` 滑块、`δ` 滑块、重置本关。
- 顶部关卡数轴：`01 —— 02 —— 03 —— 04 —— 05`；可直接跳关，不锁关。

交互与判定：

- 玩家拖 δ（普通关也可拖 x₀）；窗口内有定义的曲线点全部满足 `|f(x) − f(x₀)| ≤ ε` 时变绿过关。
- 失败时窗口变红，在最坏点画珊瑚红圆点，状态栏显示 `还差 0.007`。
- 留 0.1% 安全余量，避免像素上看起来在带内、数值上差一点。
- 不做评分、不做计时；一关 30 秒到 2 分钟。
- 普通关是触觉演示，不是难度谜题；不强制把 δ 推到最大。它们负责建立直觉，boss 负责制造冲突。
- 通关时带子/窗口轻微脉冲变绿，显示“下一关”；不自动跳转，让玩家看一眼全绿画面。

### 4.2 关卡表

| # | 标题 | f / 定义域 | x₀ | ε | δ 滑块 | 过关条件 | 画面 |
|---|---|---|---|---|---|---|---|
| 1 | 热身：把曲线塞进带子 | `x²` / `ℝ` | `1` 固定 | `0.8` | `[0, 1]`，步长 `0.001`，初值 `0.9` | 单次全绿 | 固定视窗 `x ∈ [-0.5, 2.5]`，`y ∈ [-0.5, 5]` |
| 2 | 同一个 f，不同的 x₀ | `x²` / `ℝ` | `[0.2, 3.2]`，初值 `0.5` | `0.6` | `[0, 1]`，步长 `0.001`，初值 `0.8` | 在 `x₀ = 0.5 / 1.5 / 3.0` 各全绿一次 | 固定视窗 `x ∈ [-0.5, 3.6]`，`y ∈ [-0.5, 12.5]` |
| 3 | 抖动：sin(x²) | `sin(x²)` / `ℝ` | `2.5` 固定 | `0.4` | `[0, 0.4]`，步长 `0.001`，初值 `0.3` | 单次全绿 | 固定视窗 `x ∈ [1.2, 3.8]`，`y ∈ [-1.5, 1.5]` |
| 4 | 边界：1/x | `1/x` / `(0, ∞)` | `0.5` 固定 | `0.4` | `[0, 0.6]`，步长 `0.001`，初值 `0.2` | 单次全绿 | 固定视窗 `x ∈ [-0.1, 2.5]`，`y ∈ [-0.5, 8]`；`x ≤ 0` 斜线阴影；δ 拖大时窗口可跨过 0 |
| 5a | Boss 第一幕：一致连续长什么样 | `x²` / `[0, 1]` | 扫描 `[0, 1]`；滑块 `[0, 1]` | `0.8` 锁定 | `[0, 1]`，步长 `0.001`，初值 `0.9` | 一把 δ 扫描 600 个 x₀ 全部通过 | 固定视窗 `x ∈ [-0.05, 1.05]`，`y ∈ [-0.9, 1.9]` |
| 5b | Boss 第二幕：Limbo | `x²` / `[0, ∞)` | 扫描 `[0.1, R]` + `x₀=0`；滑块 `[0.1, R]`，`R` 初始 `10`，自动 ×10 | `0.8` 锁定 | 对数 `[10⁻⁶, 1]`，初值 `0.5` | 无统一 δ：撞墙 + 确认题 | 局部窗口自动取景；右侧包络图 |

**关键阈值（用于实现对照和测试）：**

| 场景 | 最大可用 δ |
|---|---:|
| L1 `x², x₀=1, ε=0.8` | `√1.8 − 1 ≈ 0.34164` |
| L2 `x₀=0.5, ε=0.6` | `√0.85 − 0.5 ≈ 0.42195` |
| L2 `x₀=1.5, ε=0.6` | `√2.85 − 1.5 ≈ 0.18819` |
| L2 `x₀=3.0, ε=0.6` | `√9.6 − 3 ≈ 0.09839` |
| L3 `sin(x²), x₀=2.5, ε=0.4` | 约 `0.0788`（数值求根，测试留容差） |
| L4 `1/x, x₀=0.5, ε=0.4` | `0.5 − 1/2.4 = 0.08333` |
| Boss 第一幕 `x², [0,1], ε=0.8` | `1 − √0.2 ≈ 0.55279`（在 `x₀=1` 取到） |
| Boss 第二幕 `x², ε=0.8` | `δ(x₀) = √(x₀²+0.8) − x₀`；`x₀=10` 时 `≈0.03980`，`x₀=10³` 时 `≈0.000400`，`x₀=10⁶` 时 `≈4×10⁻⁷` |

### 4.3 逐关细节

#### L1 热身：把曲线塞进带子

- 目标：拖 δ，让绿色窗口里的曲线全部落进琥珀色带子。
- `x₀` 固定为 1，玩家只感知 δ。
- 成功后文案：**“全绿。这就是‘在 x₀ 处连续’的 ε-δ 图像：给定 ε，找到 δ。”**
- 视觉重点：ε 带与 δ 窗第一次同时出现；窗口变绿的反馈要清楚。

#### L2 同一个 f，不同的 x₀

- `x₀` 可拖；画布上画三个检查点标记 `0.5 / 1.5 / 3.0`。点击标记可直接跳到该 `x₀`。
- 当前 `x₀` 在检查点 ±0.03 内且全绿时，点亮该检查点，并记录当时使用的 δ。
- 三个检查点全部点亮才通关。
- 通关面板同时显示：玩家在每个检查点用的 δ，以及该点允许的最大 δ（约 `0.42 / 0.19 / 0.10`）。文案：
  **“同一个函数，三个位置。你当然可以用一把很小的 δ 全过；但每个位置能容忍的最大 δ 不同。逐点连续允许 δ 依赖 x₀——boss 会把选择权拿走。”**
- 按钮：`去 boss` / `下一关`。
- 这一关是量词对比的伏笔，不引入“一把 δ 管所有 x₀”。

#### L3 抖动：sin(x²)

- `x₀ = 2.5` 固定；`sin(x²)` 在附近振荡很快，δ 稍大就有一条摆线漏出带子。
- 目标：找到约 `0.078` 以下的 δ。
- 成功后文案：**“局部再凶，逐点连续仍然成立——只要 δ 足够小。”**
- 视觉：曲线在窗口边缘频繁穿出带子，失败点可能不止一个；显示最坏点即可。

#### L4 边界：1/x

- `x₀ = 0.5` 固定；`1/x` 在 0 附近陡峭。
- 目标：找到约 `0.083` 以下的 δ。
- `x ≤ 0` 是未定义区：斜线阴影；窗口若伸进未定义区，只统计有定义的点，并在窗口边缘提示“定义域外”。把 δ 拖到 0.5 以上，窗口会跨过 0，能直接看到未定义区和被 0 附近陡峭击穿的红点。
- 成功后文案：**“δ 被 0 附近的陡峭逼得很小。定义域边界不是装饰。”**

#### L5 Boss：一致连续 Limbo

**共同 UI**

- ε 锁定，显示 `ε = 0.8 锁定`。
- 只有一把 δ；没有逐点 δ。
- 按钮 `扫描所有 x₀`：禁用输入 1.2 秒，x₀ 标记从左到右扫过当前范围；每个采样点绿/红；遇到第一个失败点就停在最坏 x₀，窗口变红。
- 扫描是“证明全范围”的动作，不是装饰；玩家也可以手动拖 x₀ 检查局部。
- 右侧面板在第一幕显示扫描进度和“已扫 x₀ 数”；第二幕切换为包络图。

**第一幕：`x²`，定义域 `[0,1]`**

- 目标：先让玩家成功一次。找到 δ ≤ 0.55279，点击扫描，600 个 x₀ 全绿。
- 成功文案：**“一把 δ 管住了 [0,1] 上的所有 x₀。这就是一致连续。”**
- 按钮：`进入第二幕`。
- 第一幕不画包络图；避免提前泄露“曲线”和量词解释。

**第二幕：`x²`，定义域 `[0,∞)`**

- 初始范围 `R = 10`；x₀ 滑块为对数 `[0.1, R]`，玩家可随时拖到任意位置检查局部；扫描覆盖 `[0.1, R]` 的 400 个对数采样，并额外包含 `x₀ = 0`。
- 每次扫描成功后，游戏自动执行：
  1. 显示“当前范围全绿。把 x₀ 再拉远 10 倍。”
  2. `R ← R × 10`；镜头用 300ms 补间移动到新的远端 x₀。
  3. 用同一把 δ 重新扫描；在更远处出现红点。
- 玩家缩小 δ，再扫描；成功后范围再 ×10。重复直到 `R = 10⁶`。
- 事实必须说清：**在任何有限范围里，玩家都能找到足够小的 δ；没有统一 δ 是因为 x₀ 没有上限。** 游戏不把“扫到 10⁶ 失败”伪装成证明。
- 第三次自动扩展后（`R ≥ 10⁴`），出现按钮 `我看到了`；点击后进入确认题。
- 第二幕右侧包络图：
  - 横轴：`log x₀`，`x₀ ∈ [0.1, R]`。
  - 纵轴：`log δ`，`δ ∈ [10⁻⁷, 1]`。
  - 曲线：`requiredDelta(x₀)`，即该 `x₀` 处能通过的最大 δ。
  - 横线：玩家当前 δ。
  - 横线高于曲线的一段涂红，表示该段 x₀ 会被击穿。
  - 图例：`曲线 = 每个 x₀ 所需的 δ`；`横线 = 你手里这把 δ`。
  - 图下小字：**“横线压不到曲线下方，就是 limbo 的墙。”**
- 失败文案：**“在 x₀ = 1,000 处，差 0.31。δ 还得再小。”**
- 逼近极限文案：**“你可以继续把 δ 调小，但 x₀ 总能再远。曲线在往 0 走——没有最小的 δ，也没有统一的 δ。”**

**确认题与终幕**

- 题目：**“你看到了：没有一把 δ 能同时管住所有 x₀。要让 x² 一致连续，应该改什么？”**
- 选项：
  - A. 把定义域限制到 `[0, b]`（正确）
  - B. 把 ε 调大（错误：对任意 ε > 0，`x²` 在 `[0,∞)` 上仍不一致连续）
  - C. 把 δ 调得更小（错误：更远的 x₀ 仍会击穿）
- 答错：短解释，允许重试；不扣分、不锁死。
- 答对：终幕 **“你撞到了 limbo 的墙”** + **“x² 在 [0,∞) 上不一致连续；限制定义域到 [0,b]，一个 δ 就又能管住所有 x₀。”**
- 终幕按钮：`再玩一次` / `回到第一关`。
- 只有答对确认题，关卡 05 才记为通关。

### 4.4 进度、直达链接与本地存储

- 顶部关卡数轴始终可点；不锁关，路人可直接点 05 看 boss。
- 已完成关卡打勾；存储键 `consistency-limbo.progress.v1`，只存已完成关卡 ID 和 boss 确认题状态。
- 不用账号、不联网、不上传；`localStorage` 抛错时静默忽略。
- 直达参数：
  - `?level=1` 到 `?level=5`；`?level=boss` 等价于 5。
  - 非法值回落到 1。
  - 切换关卡时用 `history.replaceState` 更新 URL，不刷新页面。
- `?demo=1` 仅用于 GIF 录制；不影响正常玩家路径。

### 4.5 文案语气

- 短、准、带一点挑衅；不用 emoji，不用“A tool for ×××”。
- 数学符号直接用 Unicode：`ε δ x₀ ± ∞ → ≤`；不引入 MathJax/KaTeX。
- 关键文案表：

| 场景 | 文案 |
|---|---|
| L1 目标 | 把绿色窗口里的曲线，全部塞进琥珀色带子。 |
| L1 成功 | 全绿。给定 ε，找到 δ——这就是在 x₀ 处连续。 |
| L2 目标 | 同一个函数，三个 x₀。点亮三处，看看每处能容忍的最大 δ 有多不同。 |
| L2 成功 | 你当然可以用一把很小的 δ 全过；但每个位置允许的最大 δ 不同——逐点连续允许 δ 依赖 x₀。 |
| L3 目标 | sin(x²) 在 x₀ = 2.5 附近抖得很快。δ 稍微大一点，就有一条摆线漏出去。 |
| L4 目标 | 1/x 在 0 附近越来越陡。把 δ 收小；顺便注意 x = 0 根本没有定义。 |
| Boss 第一幕目标 | ε 锁死，只有一把 δ。扫描所有 x₀，让每一处都全绿。 |
| Boss 第一幕成功 | 一把 δ 管住了 [0,1] 上的所有 x₀。这就是一致连续。 |
| Boss 第二幕目标 | 同样的 x²，定义域换成 [0,∞)。ε 还是锁死，δ 还是一把。 |
| Boss 自动扩展 | 当前范围全绿。把 x₀ 再拉远 10 倍。 |
| Boss 失败 | 在 x₀ = 1,000 处，差 0.31。δ 还得再小。 |
| Boss 逼近极限 | 你可以继续把 δ 调小，但 x₀ 总能再远。曲线在往 0 走——没有最小的 δ，也没有统一的 δ。 |
| Boss 终幕 | 你撞到了 limbo 的墙。x² 在 [0,∞) 上不一致连续；限制定义域到 [0,b]，一个 δ 就又能管住所有 x₀。 |

## 5. 视觉与交互

### 5.1 午夜蓝图视觉系统

| 语义 | 颜色 | 用法 |
|---|---|---|
| 背景 | `#0a1024` 深靛蓝 | 页面与画布底 |
| 坐标纸细线 | `rgba(140,170,255,0.08)` | 主网格 |
| 坐标纸粗线 | `rgba(140,170,255,0.16)` | 每 5 格 |
| 曲线 | `#f4f7ff` 近白 | 函数图像 |
| ε 带 | `rgba(255,190,92,0.14)` 填充 / `#ffbe5c` 边 | 允许误差带 |
| δ 窗 | `rgba(86,225,195,0.10)` 填充 / `#56e1c3` 边 | 输入窗口 |
| 越界 | `#ff6b6b` 珊瑚红 | 红点、红边、差值 |
| 成功 | `#7bf1a8` 薄荷绿 | 全绿状态；同时配勾选图标 |
| 主文字 | `#e8edff` | 标题与正文 |
| 次文字 | `#9aa7c7` | 说明、轴标 |
| 面板描边 | `rgba(140,170,255,0.18)` | 细线分隔 |

字体（不下载外部字体，使用系统栈）：

- 标题/品牌：`"Noto Serif SC", "Songti SC", "STSong", serif`；字重 600，字距略紧。
- 数字/参数：`"Cascadia Code", "SFMono-Regular", Consolas, monospace`；δ、x₀ 读数使用等宽体，避免跳动。
- 正文：`"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif`。

视觉规则：

- 不用玻璃拟态、渐变光斑、圆角卡片堆叠、emoji 图标。
- 用坐标纸、细线、超大关卡数字、单色语义；页面像一张深色实验图纸，而不是 SaaS 仪表盘。
- 品牌字标：`CONSISTENCY LIMBO`，大写、字距 0.18em；左上角配一个极简 `ε` + 水平短横的 favicon。
- 关卡数轴：一条真实水平线，五个刻度；当前刻度加粗，已完成刻度带小勾；不是普通 tabs。

### 5.2 页面布局

桌面（≥ 1100px）：

```
┌──────────────────────────────────────────────────────────┐
│ CONSISTENCY LIMBO          01 —— 02 —— 03 —— 04 —— 05    │
├───────────────────────────────────┬──────────────────────┤
│                                   │  Lv. 05 / BOSS       │
│         Canvas 主舞台              │  一致连续 Limbo       │
│   曲线 / ε 带 / δ 窗 / 红点        │  ε = 0.8 锁定         │
│                                   │  δ = 0.042           │
│                                   │  还差 0.007           │
│                                   │  [包络图 / 扫描进度]   │
├───────────────────────────────────┴──────────────────────┤
│  x₀  [———●————] 1.50       δ  [———●————] 0.042           │
│  [重置本关]                                               │
└──────────────────────────────────────────────────────────┘
```

- 主舞台 16:9；右侧栏固定 300–340px；底部控制台单行。
- 720–1099px：右栏缩到 260px，字号下调；主舞台变 4:3。
- < 720px：右栏折到画布下方；滑块上下排列；画布保持 4:3；不出现横向滚动。
- 390px 宽可完整操作；不追求专门移动版视觉。
- 页面最大宽度 1440px；留白足够，首屏不滚动就能看到完整画布和滑块。

### 5.3 交互

- 原生 `<input type="range">`：可键盘操作、可触屏；自定义轨道和滑块样式，保留 focus-visible。
- Canvas 直接拖拽：
  - 距 δ 窗左右边缘 12px 内拖拽 → 对称调整 δ。
  - 距 x₀ 标记 14px 内拖拽 → 水平移动 x₀。
  - `pointerdown/move/up` + `setPointerCapture`；`touch-action: none`；拖动时阻止页面滚动。
  - 光标：边缘 `ew-resize`，x₀ `grab/grabbing`。
- 滑块与画布双向同步；所有变更走同一个 `setDelta` / `setX0`，避免两套状态。
- `扫描所有 x₀` 按钮在扫描期间禁用；扫描完成后恢复。
- Boss 自动扩展期间锁定输入 300ms，镜头补间结束后恢复。
- 确认题按钮为大点击区；答错显示一行解释，不弹模态。
- 微动效：
  - 全绿：窗口边框 150ms 脉冲一次；勾选图标淡入。
  - 越界：红点 1.2s 呼吸；不做抖动。
  - 镜头：boss 第二幕 300ms ease-out 补间。
  - `prefers-reduced-motion: reduce` 时关闭脉冲与镜头补间，直接切换。
- 声音：无。
- 无障碍：
  - 两个滑块都有 `<label>`；状态区域 `aria-live="polite"`。
  - 成功/失败不只靠颜色：同时有勾/叉图标和文字。
  - Canvas 提供 `role="img"` 与随状态更新的 `aria-label`（例如“在 x₀=1.50，δ=0.042 时，窗口内有 2 个点越界”）。
  - 对比度满足正文 ≥ 4.5:1；红绿语义配文字。

### 5.4 Canvas 渲染

- 使用 devicePixelRatio 缩放；`resize` 时重新计算画布尺寸。
- 绘制顺序：背景 → 坐标纸 → 轴与刻度 → ε 带 → δ 窗填充/边 → 曲线（带内白色、带外珊瑚红）→ 最坏点红点与差值虚线 → x₀ 标记 → 未定义区阴影 → 标签。
- 普通关卡使用关卡表里的固定视窗；L2 的 x₀ 移动不改变视窗。
- Boss 第二幕局部取景：
  - x 范围以当前 x₀ 为中心，宽度约 `max(8δ, 屏幕 160px 对应的数据宽度)`。
  - y 范围 `f(x₀) ± 4ε`，保证 ε 带在屏幕上有稳定高度。
  - x 轴标签显示大数时用千分位/科学计数法；顶部 scale ribbon 显示 `x₀ = 1,000,000` 和当前范围 `0–10⁶`。
  - 扫描失败时镜头 300ms 移到失败 x₀；视觉上像拉远到新的数量级。
- 最坏点如果超出视窗（例如 1/x 在 0 附近的巨大值），红点贴在上/下边缘并画一个短箭头，不把 y 轴拉爆。
- 包络图单独一个小 Canvas（`#envelope`），不塞进主画布；同样处理 DPR。
- 性能目标：输入到重绘 < 16ms；一次窗口判定 < 10ms；包络图重算 < 100ms。

## 6. 技术架构

### 6.1 仓库结构

```
consistency-limbo/
├── index.html
├── styles.css
├── .nojekyll
├── package.json
├── LICENSE
├── README.md
├── src/
│   ├── main.js        # 启动、DOM、事件、动画循环、URL、localStorage
│   ├── levels.js      # 5 关数据与预设函数引用
│   ├── math.js        # 纯数学：采样、最大偏差、所需 δ、定义域
│   ├── game.js        # 纯逻辑：过关、检查点、扫描、boss 幕、确认题
│   └── renderer.js    # Canvas 主舞台 + 包络图渲染
├── tests/
│   ├── math.test.js
│   └── game.test.js
├── scripts/
│   ├── serve.mjs      # 无依赖 Node 静态服务器，端口 8000
│   └── record-demo.mjs# Playwright-core + gifenc 生成 assets/demo.gif
├── assets/
│   ├── demo.gif       # README 首图；失败时用 demo.png
│   ├── demo.png       # 静态兜底
│   └── favicon.svg
└── docs/superpowers/specs/2026-11-01-consistency-limbo-design.md
```

`package.json`：

```json
{
  "name": "consistency-limbo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "serve": "node scripts/serve.mjs",
    "demo:gif": "node scripts/record-demo.mjs"
  },
  "devDependencies": {
    "gifenc": "^1.0.3",
    "playwright-core": "^1.64.1"
  },
  "license": "MIT"
}
```

- 运行时零依赖；`playwright-core` 和 `gifenc` 只用于生成 GIF，不进入页面。
- 不引入构建工具、打包器、框架或 TypeScript。
- `scripts/serve.mjs` 只服务本地预览；GitHub Pages 不运行它。
- `scripts/record-demo.mjs` 可选；没有安装 devDependencies 时给出明确提示，README 使用静态兜底图。

### 6.2 模块职责

**`src/levels.js`**

- 定义预设函数：`square`、`sinSquare`、`reciprocal`。
- 定义每个函数的求值、定义域、显示名、采样边界提示。
- 定义关卡表；只包含数据，不碰 DOM、不计算状态。
- 关卡数据形状：

```js
{
  id: 'level-1',
  index: 1,
  title: '把曲线塞进带子',
  fn: 'square',
  domain: { min: -Infinity, max: Infinity },
  x0: { value: 1, min: 1, max: 1, step: 0.001, editable: false },
  epsilon: 0.8,
  delta: { min: 0, max: 1, step: 0.001, initial: 0.9 },
  view: { x: [-0.5, 2.5], y: [-0.5, 5] },
  win: { type: 'single' },
  copy: { objective: '...', success: '...' }
}
```

- L2 用 `win: { type: 'checkpoints', values: [0.5, 1.5, 3.0], tolerance: 0.03 }`。
- L5a 用 `win: { type: 'scan-all', samples: 600 }`。
- L5b 用 `win: { type: 'impossible-scan', initialRange: 10, rangeFactor: 10, maxRange: 1e6, samples: 400 }`。
- 新增关卡 = 在数组里加一条数据；不新建框架。

**`src/math.js`**

- `evaluate(fn, x)`：返回数值；遇到不合法输入返回 `NaN`，由上层忽略。
- `domainInterval(domain, x0, delta)`：求 `[x0−δ, x0+δ] ∩ 定义域`。
- `sampleInterval(fn, domain, x0, delta, count)`：均匀采样；对开区间/接近 0 的点补充几何采样。
- `maxDeviation(fn, domain, x0, delta, count)`：返回 `{ deviation, xWorst, yWorst }`；无定义点忽略；全无定义返回 0。
- `checkWindow(fn, domain, x0, delta, epsilon)`：返回 `{ passed, deviation, xWorst }`；使用 0.1% 安全余量。
- `requiredDelta(fn, domain, x0, epsilon, maxDelta)`：对 δ 二分，找最大可用值；缓存 key 包含 fn/x0/epsilon。
- `checkAllX0(fn, domain, epsilon, delta, samples)`：扫描采样；返回 `{ passed, worstX0, worstDeviation }`。
- `scanX0(fn, domain, epsilon, delta, samples)`：在 `checkAllX0` 基础上返回每个采样点的 `{ x0, passed, deviation }`，供扫描动画和包络图使用；扫描动画不边扫边算。
- 所有函数纯函数、无 DOM、无全局状态；可在 Node 中直接 import。

**`src/game.js`**

- `createInitialState(levelId)`：从关卡数据生成初始状态。
- `setX0(state, value)` / `setDelta(state, value)`：夹紧到范围，返回新状态或原地更新。
- `evaluate(state)`：调用 `math.js` 得到 `{ passed, deviation, xWorst }`；Boss 关走扫描逻辑。
- `recordCheckpoint(state)`：L2 检查点；记录当时 δ。
- `startScan(state)` / `finishScan(state)`：Boss 扫描结果；自动扩展在 `finishScan` 中处理。
- `answerQuiz(state, choice)`：确认题；答对才设置 `completed`。
- `serializeProgress(state)` / `loadProgress()`：只处理已完成关卡 ID；localStorage 由 `main.js` 注入，`game.js` 不直接碰浏览器。
- 所有状态转换返回新对象，便于测试。

**`src/renderer.js`**

- `drawMain(canvas, state, level)`：主画布。
- `drawEnvelope(canvas, state)`：Boss 第二幕包络图。
- `drawScanBar(canvas, state)`：Boss 扫描进度（可合并进主画布或右栏 DOM）。
- 只读状态；不修改游戏逻辑；不绑定事件。
- 暴露 `screenToData` / `dataToScreen` 给 `main.js` 做拖拽命中测试。

**`src/main.js`**

- 读取 URL 参数，加载关卡。
- 绑定滑块、Canvas 指针、扫描按钮、确认题、关卡数轴。
- 维护单一 `state` 和 `requestAnimationFrame` 动画循环。
- 更新 DOM 文案、状态、进度。
- 更新 URL、localStorage。
- 处理 resize、DPR、`prefers-reduced-motion`。
- 其他模块不直接访问 `document`。

### 6.3 数值策略

- 窗口判定采样数 `1024`；Boss 扫描每个 x₀ 用 `512`；`requiredDelta` 二分 40 次（或相对误差 < 0.1%）、每次 `256` 样本。
- 通过条件：`deviation <= epsilon * 0.999`，防止边缘像素抖动造成假绿。
- `1/x` 接近 0 的采样：
  - 若窗口包含 0 附近，补充 `1e-12, 1e-9, 1e-6, 1e-4` 等几何点；`1/x` 在这些点值巨大，直接判失败，不产生 `NaN`。
  - 未定义区不参与最坏点计算，但窗口边缘提示“定义域外”。
- `x²` 的 `requiredDelta` 有闭式 `√(x₀²+ε) − x₀`，用于测试和包络图快速路径；通用二分结果必须与闭式在容差内一致。
- Boss 第二幕的包络图用 `requiredDelta` 采样 160 个 x₀；x 轴对数，y 轴对数；玩家 δ 横线覆盖全图。
- 扫描结果预计算后再做动画：先得出每个采样点的绿/红，再让 x₀ 标记扫过，避免边扫边算造成卡顿。
- 扫描采样点包含端点和最坏点附近加密；L5a 的 600 个 x₀ 覆盖 `[0,1]`；L5b 的 400 个 x₀ 按对数覆盖 `[0.1, R]`。
- 所有数值函数对 `NaN`/`Infinity` 做保护；任何异常输入不能让页面崩溃。

### 6.4 URL、状态与持久化

- 初始状态：读取 `?level=`；合法值 `1..5` 或 `boss`；否则 1。
- 切换关卡：`history.replaceState(null, '', '?level=' + id)`；保留 `demo` 参数。
- 进度：`localStorage['consistency-limbo.progress.v1'] = JSON.stringify({ completed: ['level-1', ...], bossQuiz: true })`。
- 读取进度失败/被禁用：静默忽略，不影响游戏。
- 不发送任何网络请求；不加载第三方脚本、字体、图片或统计。
- 首屏不弹窗、不要求点击开始；进页面即可拖滑块。

### 6.5 浏览器与部署

- 目标：最新版 Edge / Chrome / Firefox / Safari。
- 依赖浏览器能力：ES modules、Canvas 2D、Pointer Events、`requestAnimationFrame`、`matchMedia`、`localStorage`（可选）。
- 本地预览必须走 HTTP（ES modules 在 `file://` 下受 CORS 限制）：
  - `npm run serve` → `http://localhost:8000`。
- GitHub Pages：
  - 从 `main` 分支根目录发布；根目录有 `index.html`。
  - `.nojekyll` 防止 Jekyll 处理。
  - 所有资源用相对路径（`./src/main.js`、`./assets/...`），兼容 `https://nddcv1.github.io/consistency-limbo/` 子路径。
  - 不配 CI、不构建；推送即生效。
- `scripts/serve.mjs` 只做本地开发，路径规范化并限制在仓库根目录内，防止路径穿越。

### 6.6 安全与隐私

- 无用户输入解析、无 `eval`、无动态 `innerHTML` 拼接用户数据、无远端请求。
- 预设函数由代码定义，不接受字符串表达式。
- 进度只写 `localStorage`；不收集、不上传。
- 无第三方运行时依赖；GIF 生成工具只在开发时使用。
- README 不包含教材原文、个人信息或未授权素材；所有图形由 Canvas 生成。

## 7. 测试与验收

### 7.1 单元测试（`node --test`）

**`tests/math.test.js`**

| 测试 | 断言 |
|---|---|
| `square(2)` / `sinSquare(2)` / `reciprocal(0.5)` | 值正确，误差 `< 1e-12` |
| L1 `x², x₀=1, ε=0.8, δ=0.34` | 通过 |
| L1 `δ=0.35` | 失败，`xWorst` 在右侧 |
| L1 `requiredDelta` | `0.34164 ± 0.002` |
| L2 `x₀=0.5/1.5/3.0, ε=0.6` | `0.42195/0.18819/0.09839 ± 0.003` |
| L3 `sin(x²), x₀=2.5, ε=0.4` | `δ=0.075` 通过；`δ=0.09` 失败 |
| L4 `1/x, x₀=0.5, ε=0.4` | `δ=0.082` 通过；`δ=0.085` 失败；`requiredDelta ≈ 0.08333` |
| 1/x 窗口包含 0 | 不返回 `NaN`；`deviation` 为有限大值或明确判失败 |
| `maxDeviation` 随 δ 单调不减 | 在预设函数上成立 |
| Boss 第二幕 `requiredDelta(1,10,100,1000,1e6)` | 与闭式 `√(x₀²+0.8)−x₀` 误差 `< 1%` |
| `checkAllX0` L5a `δ=0.55` | 全部通过；`δ=0.56` 在 `x₀=1` 附近失败 |

**`tests/game.test.js`**

| 测试 | 断言 |
|---|---|
| L1 初始状态 | 未通关；δ=0.2 时 `evaluate` 通过 |
| L1 δ=0.9 | 不通过，状态有最坏点 |
| L2 在 0.5 全绿 | 记录检查点；在非检查点全绿不记录 |
| L2 三个检查点 | 全部点亮后 `completed=true`，保存三个 δ |
| L5a 扫描 δ=0.55 | `passed=true`；进入第二幕 |
| L5b 成功扫描 | `range` ×10；扫描后失败点 x₀ 更新；包络点增加 |
| L5b 第三次扩展 | `canConclude=true` |
| 确认题答错 | 不完成；可重试 |
| 确认题答对 | `completed=true`，终幕状态 |
| 非法关卡参数 | 回落到 L1，不抛错 |

运行：

```bash
npm test
```

### 7.2 手工验收

- [ ] 首屏 3 秒内看到画布、ε 带、δ 窗和滑块；无需点击“开始”。
- [ ] L1 拖到约 0.34 通过；0.35 以上失败，红点位置正确。
- [ ] L2 三个 x₀ 都能点亮；通关面板显示每个检查点的玩家 δ 与允许上限；点击检查点能跳转。
- [ ] L3 在约 0.078 附近可通过；0.09 时曲线漏出。
- [ ] L4 在约 0.083 附近可通过；把 δ 拖大、窗口跨过 0 时阴影和失败点正确。
- [ ] L5a 扫描动画完整；δ≈0.55 时 600 个 x₀ 全绿；δ 稍大时扫描停在失败点。
- [ ] L5b 每次成功扫描后范围 ×10；镜头移动；失败点 x₀ 数量级递增；包络图横线和曲线位置正确。
- [ ] `我看到了` 在第三次扩展后出现；确认题答对才终幕；答错可重试。
- [ ] 关卡数轴可跳关；刷新后进度保留；直达 `?level=boss` 正常。
- [ ] 390px 宽度无横向滚动；滑块和画布拖拽可操作。
- [ ] 仅用键盘可调两个滑块；焦点可见；状态有 `aria-live`。
- [ ] `prefers-reduced-motion` 下无补间/脉冲；功能仍完整。
- [ ] 控制台无错误；Network 面板无外部请求；无 `eval`。
- [ ] 关闭 localStorage（隐私模式）仍可玩，不报错。

### 7.3 GIF 验收

- [ ] 顶部 GIF 为 960×540，6–8 秒，≤4MB。
- [ ] 首帧不是空白标题卡；直接出现 boss、红色越界、ε 锁定、包络图/δ 横线。
- [ ] 在 README 实际宽度 720px 下文字可读；循环播放无明显跳帧。
- [ ] GIF 至少包含：一次红→绿、范围 ×10、包络图曲线、一次全绿。
- [ ] 若生成失败，`assets/demo.png` 为同场景静态图；README 顶部仍有图，GIF 脚本保留并记录原因。

### 7.4 发布后验证

- [ ] `https://nddcv1.github.io/consistency-limbo/` 首屏加载正常。
- [ ] `?level=boss` 直达正常。
- [ ] README 顶部 GIF/PNG 在 GitHub 仓库页渲染正常。
- [ ] 线上窄屏、深链、localStorage 行为与本地一致。
- [ ] 打 `v0.1.0` tag；确认 MIT、About、Topics 正确。

## 8. README、GIF 与发布

### 8.1 README 结构

顺序必须保证 GIF 在首屏：

1. 标题 `# Consistency Limbo`
2. 一行中文定位 + 一行英文 tagline
3. `<p align="center"><img src="assets/demo.gif" width="720" alt="..."></p>`（GIF 生成失败时改用 `assets/demo.png`）
4. 在线 demo 链接 + “直接挑战 boss”链接
5. `5 关 / 5 分钟 / 无后端` 三个短要点
6. **这是什么**：两句话解释 ε 带、δ 窗和“全绿”。
7. **五关**：一行一关的小表，突出 boss 两幕。
8. **为什么有 boss 关**：短讲量词顺序；不写“没人做过”。
9. **和现有 ε-δ 工具的区别**：诚实列出 GeoGebra / KU Leuven / Vanishing Point；说明我们做的是游戏化、开源、中文优先、boss 包络图。
10. **本地运行**：`npm test`、`npm run serve`，打开 `http://localhost:8000`；玩游戏和跑测试都不需要 `npm install`，只有生成 GIF 才需要安装 devDependencies。
11. **已知限制**：数值采样、仅预设函数、boss 是引导式演示而非形式证明。
12. **Roadmap**：明确标注 v0.2+，不是 v1。
13. **License**：MIT。
14. 底部轻量 CTA：**“如果它帮你第一次‘看见’了 ε-δ，点个 star 让更多人看到。”**

README 不放大段教材、不堆徽章墙；首屏只留定位、GIF、demo 链接。

### 8.2 GIF 分镜

目标：960×540，12fps，6–8 秒，≤4MB，首帧即可看懂“这是个数学游戏，而且有墙”。

| 时间 | 画面 | 动作/文案 |
|---|---|---|
| 0.0s | Boss 第二幕，范围很大，红色越界点，右侧包络图 | 左上角小字 `CONSISTENCY LIMBO`；状态 `ε 锁定 · 一把 δ`；不放大标题卡 |
| 0–1.5s | 主画布拖 δ，窗口由红变绿；点 `扫描所有 x₀` | 扫描条走过；全绿；出现 `范围 ×10` |
| 1.5–3.0s | 镜头跳到更远 x₀，红点出现；包络图曲线延伸 | 状态 `在 x₀ = 10,000 处，差 0.28` |
| 3.0–4.5s | 再缩小 δ、再扫描、再 ×10；包络图横线被曲线甩开 | 小字 `required δ → 0` |
| 4.5–6.0s | 切到 L1 或 L2，拖 δ 全绿，带子脉冲 | 状态 `全绿`；检查点点亮 |
| 6.0–7.0s | 品牌 + 中文定位 | `给学数学分析的人 / 把 ε-δ 和一致连续拖出来，看见为止。` |

实现：

- `scripts/record-demo.mjs` 启动 `scripts/serve.mjs`，用 `playwright-core` 启动本机 Edge（`channel: 'msedge'` 或显式 executablePath），viewport 960×540，`deviceScaleFactor: 1`。
- 页面通过 `?demo=1` 进入可复现的演示状态；脚本通过真实 UI 事件（set slider、click scan）驱动，必要时用 `page.evaluate` 调用一个仅在 demo 模式暴露的 `window.__limbo` 调试钩子设置确定性状态。
- 每帧 `page.screenshot({ type: 'png' })`；用 `gifenc` 量化并编码，优先全局调色板，控制体积。
- 生成的 GIF 写到 `assets/demo.gif`；同时截一张 `assets/demo.png` 作为静态兜底。
- 如果 Edge headless / devDependencies 不可用：README 使用 `assets/demo.png`，`npm run demo:gif` 输出明确错误，不阻塞功能发布。

### 8.3 GitHub About 与 Topics

About：

> 给学数学分析的人：把 ε-δ 和一致连续拖出来看。 · An interactive ε-δ playground for real-analysis students.

Topics：

`math` `calculus` `real-analysis` `epsilon-delta` `uniform-continuity` `canvas` `education` `visualization` `interactive` `game`

不写“A tool for ...”；不写“world's first”；不写“没人做过”。

### 8.4 发布清单

1. 本地 `D:\consistency-limbo` 已 `git init -b main`，spec 已提交。
2. 实现完成，`npm test` 全绿，手工验收通过。
3. README 顶部 GIF/PNG 已生成并在 720px 下检查。
4. 本地 `npm run serve` 五关全过；Edge 控制台无错误。
5. **向用户明确确认**后，才创建公开仓库：
   ```bash
   gh repo create nddcv1/consistency-limbo --public --source=. --remote=origin --push
   ```
6. 开启 Pages：`main` 分支根目录；等待构建完成。
7. 验证线上 URL、`?level=boss`、README 图片、窄屏。
8. `git tag v0.1.0 && git push origin v0.1.0`。
9. 发布后更新长期记忆：仓库 URL、发布状态、非显而易见的决策（仅预设、boss 引导式不可能、GIF 工具链）。

## 9. 风险与已知限制

| 风险 | 影响 | 缓解 |
|---|---|---|
| 已有 ε-δ 工具 | “又一个 applet”的质疑 | 竞品对照写进 README；差异化落在 boss 叙事、包络图、游戏化、开源、中文 |
| 数值采样漏掉极窄尖峰 | 误判通过/失败 | 预设函数均良态；1024 采样 + 0.1% 余量；阈值附近单测；README 明说 |
| Boss 第二幕不是形式证明 | 误导读者 | 文案只说“扫描/看趋势/极限”；不宣称游戏证明了定理；Known limitations 明写 |
| GIF 工具链不可用（无 ffmpeg） | 首屏没有动图 | Playwright-core + gifenc；失败用静态 PNG；脚本保留 |
| 一天内范围膨胀 | 做不完或粗糙 | 非目标写死：无自定义函数、无账号、无 i18n、无移动专版；5 个小模块 |
| 自动 ×10 像游戏作弊 | 玩家不服 | 台词明确“范围自动拉远”；包络图展示原因；确认题让玩家自己说出“限制定义域” |
| 首屏信息过载 | 3 秒内关闭 | 首屏只留画布、两个滑块、一个状态；GIF 首帧直接是 boss |
| 移动端拖拽与滚动冲突 | 操作失败 | `touch-action: none`；滑块仍可用；390px 实测 |
| 颜色语义不清 | 红绿难辨 | 颜色 + 勾/叉 + 文字；对比度检查 |

## 10. Roadmap（v0.2+，不是 v1）

- 自定义函数：白名单表达式解析 + 定义域提示；仍不使用 `eval`。
- 更多知识点：导数、Riemann 积分、级数、开覆盖；每个做成独立关卡，不搭框架。
- 分享链接：把关卡 + x₀ + δ 编码进 URL，方便课堂演示。
- 英文 UI 与双语 README；教师模式（隐藏提示、课堂大屏字号）。
- 社交预览图与短视频版本。

## 11. 参考

- [KU Leuven Continuity Checker](https://kulak.kuleuven.be/facult/wet/wiskunde/ooi/applets_shu/Math/Calculus/Ira/Continuity.html)
- [GeoGebra Epsilon-Delta Game](https://www.geogebra.org/m/YhZNXyzm)
- [GeoGebra Epsilon-Delta Continuity](https://mat.geogebra.org/m/EySYCf76)
- [Vanishing Point](https://playpendium.com/vanishing-point/)
- [Tellurion Epsilon-Delta Continuity Visualizer](http://tellurion.dev/playgrounds/bsc-y1s1/M1017-epsilon-delta-continuity-visualizer/index.html)
- [Wolfram Demonstration: Uniform Continuity](https://www.wolframcloud.com/obj/fe65ac2c-9491-4c1d-b545-33a21e64f79b)
- [KTH epsilon-delta animation](https://www.math.kth.se/math/student/courses/5B1115/K/200607/animationer/ideltaeps.html)
- [Diković, Understanding and Visualization of the Uniform Continuity of Functions](https://download.atlantis-press.com/article/25868766.pdf)
