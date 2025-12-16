# PaiPai-App 项目结构文档

> 本文档详细描述了项目的功能模块结构、UI层级、代码组织等信息。

---

## 目录

- [1. 项目整体架构](#1-项目整体架构)
- [2. mainV2 场景功能模块](#2-mainv2-场景功能模块)
  - [2.1 场景控制层](#21-场景控制层)
  - [2.2 首页模块 (IndexPage)](#22-首页模块-indexpage)
  - [2.3 训练中心模块 (GameCenter)](#23-训练中心模块-gamecenter)
  - [2.4 报告页模块 (ReportPage)](#24-报告页模块-reportpage)
  - [2.5 个人中心模块 (PersonalCenter)](#25-个人中心模块-personalcenter)
  - [2.6 功能弹窗模块](#26-功能弹窗模块)
- [3. 串烧训练系统](#3-串烧训练系统)
  - [3.1 SkewersManager 核心调度器](#31-skewersmanager-核心调度器)
  - [3.2 数据结构层级](#32-数据结构层级)
  - [3.3 SkewersSpecGameModel 游戏模型](#33-skewersspecgamemodel-游戏模型)
  - [3.4 GameAlert 弹窗组件](#34-gamealert-弹窗组件)
  - [3.5 Prefab 资源结构](#35-prefab-资源结构)
  - [3.6 BaseScene 基类结构](#36-basescene-基类结构)
  - [3.7 数据流图](#37-数据流图)
- [4. 游戏模块分类](#4-游戏模块分类)
- [5. 依赖关系图](#5-依赖关系图)

---

## 1. 项目整体架构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PaiPai-App 项目架构                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📁 assets/                                                                      │
│  ├── app/ (应用程序主目录，核心功能和共享资源)                                    │
│  ├── resources/ (全局资源目录)                                                   │
│  │   ├── scripts/                                                               │
│  │   │   ├── Core/ (核心框架)                                                   │
│  │   │   │   ├── Manager/ (管理器集合)                                          │
│  │   │   │   ├── Scene/ (场景模型)                                              │
│  │   │   │   └── Util/ (工具类)                                                 │
│  │   │   ├── Game/ (游戏相关)                                                   │
│  │   │   │   ├── UI/ (通用UI组件)                                               │
│  │   │   │   ├── Task/ (任务系统)                                               │
│  │   │   │   └── PersonalCenterManager/                                         │
│  │   │   ├── mainV2/ (主场景脚本)                                               │
│  │   │   ├── indexPageV2/ (首页脚本)                                            │
│  │   │   ├── GameCenterV2/ (训练中心脚本)                                       │
│  │   │   ├── ReportPageV2/ (报告页脚本)                                         │
│  │   │   └── UserCenterV2/ (个人中心脚本)                                       │
│  │   └── prefab/ (预制体资源)                                                   │
│  │                                                                              │
│  ├── 独立游戏模块 (Bundle)                                                      │
│  │   ├── listeningMaster/ (听音辨物)                                            │
│  │   ├── finding/ (找一找)                                                      │
│  │   ├── guessingGame/ (猜一猜)                                                 │
│  │   ├── fanpai/ (翻牌)                                                         │
│  │   ├── math24/ (24点)                                                         │
│  │   ├── puzzle/ (拼图)                                                         │
│  │   ├── catchFish/ (捕鱼)                                                      │
│  │   ├── sentenceMaking/ (造句)                                                 │
│  │   ├── smalltheater/ (小剧场)                                                 │
│  │   ├── balance/ (平衡)                                                        │
│  │   └── fingerGame/ (手指训练)                                                 │
│  │                                                                              │
│  └── scenes/ (场景文件)                                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. mainV2 场景功能模块

### 2.1 场景控制层

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           mainV2.scene (主场景)                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📁 scripts/mainV2/ (场景控制层)                                                 │
│  ├── MainSceneController.ts (主场景控制器)                                       │
│  │   ├── pageContainer: Node (页面容器)                                         │
│  │   ├── pageController: PageController                                         │
│  │   ├── loadReportData() - 加载报告数据                                        │
│  │   ├── showGameCenter() - 显示训练中心                                        │
│  │   ├── showReport() - 显示报告页                                              │
│  │   ├── showPersonalCenter() - 显示个人中心                                    │
│  │   └── loadDefaultIndexPage() - 加载默认首页                                  │
│  │                                                                              │
│  ├── PageController.ts (页面Tab控制器)                                           │
│  │   ├── navigationButtons: Node[] (底部Tab按钮组)                              │
│  │   ├── PageConfig (页面路径配置)                                              │
│  │   │   ├── index: "/prefabV2/mainV2/indexPage"                               │
│  │   │   ├── gameCenter: "/prefabV2/mainV2/gameCenterPage"                     │
│  │   │   ├── reporter: "/prefabV2/mainV2/reporterPage"                         │
│  │   │   └── personalCenter: "/prefabV2/mainV2/personalCenterPage"             │
│  │   ├── loadPage(pageName, params) - 加载指定页面                              │
│  │   ├── loadIndexPage() - 加载首页                                             │
│  │   ├── loadGameCenterPage() - 加载训练中心                                    │
│  │   ├── loadReporterPage() - 加载报告页                                        │
│  │   └── loadPersonalCenterPage() - 加载个人中心                                │
│  │                                                                              │
│  ├── AdaptComponent.ts (适配基类)                                                │
│  │   └── 屏幕适配逻辑                                                           │
│  │                                                                              │
│  └── NodeAdapter.ts (节点适配器)                                                 │
│      └── 节点尺寸适配                                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 首页模块 (IndexPage)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         📱 首页 (indexPage)                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🖼️ UI层级 (prefabV2/mainV2/indexPage.prefab)                                   │
│  └── indexPage (根节点)                                                          │
│      ├── 顶部区域                                                               │
│      │   ├── userIcon (用户头像)                                                │
│      │   ├── userName (用户名)                                                  │
│      │   └── dayLabel (训练天数)                                                │
│      ├── 雷达图区域                                                              │
│      │   └── radarMap (RadiaGraph组件)                                          │
│      │       └── 六维能力展示                                                    │
│      ├── 任务列表区域                                                            │
│      │   └── taskContainer                                                      │
│      │       └── taskPrefab[] (任务卡片)                                        │
│      │           └── TaskItemController                                         │
│      ├── 初始化数据区域                                                          │
│      │   └── initDataParent                                                     │
│      │       └── initDataPrefab (InitTaskView)                                  │
│      └── 底部按钮区域                                                            │
│          ├── VIP购买入口                                                        │
│          └── AI对话入口                                                          │
│                                                                                  │
│  📜 脚本层级 (scripts/indexPageV2/)                                              │
│  ├── IndexPageView.ts (首页主控制器)                                             │
│  │   ├── 属性绑定                                                               │
│  │   │   ├── taskPrefab: Prefab                                                │
│  │   │   ├── taskContainer: Node                                               │
│  │   │   ├── userName: Label                                                   │
│  │   │   ├── userIcon: Sprite                                                  │
│  │   │   ├── dayLabel: Label                                                   │
│  │   │   └── radarMap: Node                                                    │
│  │   ├── 核心方法                                                               │
│  │   │   ├── setUserName() - 设置用户名                                         │
│  │   │   ├── setUserIcon() - 设置用户头像                                       │
│  │   │   ├── setUserTrainingDays() - 设置训练天数                               │
│  │   │   ├── buyHandler() - VIP购买                                            │
│  │   │   ├── renewalHandler() - VIP续费                                        │
│  │   │   ├── startHandler() - 开始训练                                         │
│  │   │   ├── openChatPanel() - 打开AI对话                                      │
│  │   │   └── showUserInfo() - 显示用户信息                                     │
│  │   └── 依赖Manager                                                            │
│  │       ├── PersonalCenterManager (用户数据)                                   │
│  │       ├── ReportManager (报告数据)                                           │
│  │       ├── TaskManager (任务管理)                                             │
│  │       ├── SkewersManager (串烧训练)                                          │
│  │       └── UIManager (面板管理)                                               │
│  │                                                                              │
│  ├── RadiaGraph.ts (雷达图组件)                                                  │
│  │   └── 六维能力可视化展示                                                     │
│  │                                                                              │
│  ├── TaskItemController.ts (任务卡片控制器)                                      │
│  │   ├── 任务状态展示                                                           │
│  │   ├── 点击开始训练                                                           │
│  │   └── 进度显示                                                               │
│  │                                                                              │
│  ├── InitTaskView.ts (初始化任务视图)                                            │
│  │   └── 首次进入引导                                                           │
│  │                                                                              │
│  ├── IndexPageConfig.ts (首页配置加载器)                                         │
│  │   └── indexPageConfig.json                                                   │
│  │                                                                              │
│  └── TaskContainerConfig.ts (任务容器配置)                                       │
│      └── taskContainer.json                                                     │
│                                                                                  │
│  🔗 关联弹窗                                                                     │
│  ├── VipPanel (会员面板) - scripts/Game/UI/Vip/                                 │
│  ├── VipAlert (会员提示) - scripts/Game/UI/Vip/                                 │
│  ├── ChatPanel (AI对话) - scripts/Game/UI/ChatPanel/                            │
│  └── BrainTrain (串烧训练入口) - scripts/Game/UI/BrainTrain/                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 训练中心模块 (GameCenter)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      🎮 训练中心 (gameCenterPage)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🖼️ UI层级 (prefabV2/mainV2/gameCenterPage.prefab)                              │
│  └── gameCenterPage (根节点)                                                     │
│      ├── 标题栏                                                                 │
│      ├── 游戏分类列表                                                            │
│      │   └── 游戏卡片[]                                                         │
│      │       ├── 游戏图标                                                       │
│      │       ├── 游戏名称                                                       │
│      │       ├── 能力类型标签                                                   │
│      │       └── 开始按钮                                                       │
│      └── 能力筛选Tab                                                            │
│                                                                                  │
│  📜 脚本层级 (scripts/GameCenterV2/)                                             │
│  ├── GameCenterPageView.ts (训练中心控制器)                                      │
│  │   ├── 游戏列表展示                                                           │
│  │   ├── 分类筛选                                                               │
│  │   ├── 点击进入游戏                                                           │
│  │   └── 依赖                                                                   │
│  │       ├── GameCenterManager                                                 │
│  │       └── SceneManager                                                      │
│  │                                                                              │
│  └── scripts/Game/GameCenter/GameCenterManager.ts                               │
│      ├── 游戏数据管理                                                           │
│      ├── 游戏状态管理                                                           │
│      └── 进入游戏逻辑                                                           │
│                                                                                  │
│  🎯 游戏能力分类                                                                 │
│  ├── 理解力 (COMPREHENSION) - 听音辨物                                          │
│  ├── 执行力 (EXECUTION) - 拼图、捕鱼                                            │
│  ├── 语言力 (LANGUAGE) - 造句、小剧场                                           │
│  ├── 计算力 (CALCULATION) - 24点、平衡                                          │
│  ├── 判断力 (JUDGMENT) - 找一找、猜一猜                                         │
│  └── 记忆力 (MEMORY) - 翻牌                                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.4 报告页模块 (ReportPage)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         📈 报告页 (reporterPage)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🖼️ UI层级 (prefabV2/mainV2/reporterPage.prefab)                                │
│  └── reporterPage (根节点)                                                       │
│      ├── TopNavBar (顶部导航栏)                                                  │
│      │   ├── 综合报告Tab                                                        │
│      │   ├── 数据汇总Tab                                                        │
│      │   └── 其他报告Tab                                                        │
│      ├── ContentArea (内容区域)                                                  │
│      │   ├── SumReportView (综合报告视图)                                       │
│      │   │   ├── 雷达图展示                                                     │
│      │   │   ├── 维度分析                                                       │
│      │   │   └── 训练建议                                                       │
│      │   ├── SumDataView (数据汇总视图)                                         │
│      │   │   ├── 训练统计                                                       │
│      │   │   ├── 时间分布                                                       │
│      │   │   └── 进度趋势                                                       │
│      │   ├── OtherChartView (图表视图)                                          │
│      │   │   └── 各维度详细图表                                                 │
│      │   └── OtherSummaryView (总结视图)                                        │
│      │       └── 分析总结文字                                                   │
│      └── StatePanel (状态面板)                                                   │
│          └── 加载状态/空状态                                                    │
│                                                                                  │
│  📜 脚本层级 (scripts/ReportPageV2/)                                             │
│  ├── ReportPageController.ts (报告页主控制器)                                    │
│  │   ├── Tab切换逻辑                                                            │
│  │   ├── 数据加载                                                               │
│  │   └── 视图管理                                                               │
│  │                                                                              │
│  ├── TopNavBarController.ts (顶部导航控制)                                       │
│  │   └── Tab状态管理                                                            │
│  │                                                                              │
│  ├── SumReportView.ts (综合报告视图)                                             │
│  │   ├── 雷达图渲染                                                             │
│  │   ├── 分析展示                                                               │
│  │   └── 依赖: ReportManager                                                    │
│  │                                                                              │
│  ├── SumDataView.ts (数据汇总视图)                                               │
│  │   ├── 统计数据展示                                                           │
│  │   └── 图表渲染                                                               │
│  │                                                                              │
│  ├── OtherChartView.ts (其他图表视图)                                            │
│  │   └── 维度详情图表                                                           │
│  │                                                                              │
│  ├── OtherSummaryView.ts (其他总结视图)                                          │
│  │   └── AI分析文字                                                             │
│  │                                                                              │
│  └── SmallComponent/ (小组件)                                                    │
│      ├── DimensionItemView.ts (维度项视图)                                      │
│      │   └── 单个维度展示                                                       │
│      ├── StatePanel.ts (状态面板)                                               │
│      │   └── 加载/空状态                                                        │
│      └── SumAnalyseView.ts (综合分析视图)                                       │
│          └── 分析内容展示                                                       │
│                                                                                  │
│  📦 Prefab资源 (prefabV2/personReport/)                                          │
│  ├── sumReportPrefab.prefab                                                     │
│  ├── sumDataPrefab.prefab                                                       │
│  ├── sumAnalysisPrefab.prefab                                                   │
│  ├── otherChartItem.prefab                                                      │
│  ├── otherSumDataPrefab.prefab                                                  │
│  ├── initDataPrefab.prefab                                                      │
│  └── smallComponent/                                                            │
│      ├── dimensionitemPrefab.prefab                                             │
│      ├── statementPanel.prefab                                                  │
│      └── analysisheadPrefab.prefab                                              │
│                                                                                  │
│  🔗 数据管理                                                                     │
│  └── ManagerV2/ReportManager.ts                                                 │
│      ├── getRecentReport() - 获取最近报告                                       │
│      ├── getInitialReport() - 获取初始报告                                      │
│      ├── getUserSumReport() - 获取用户汇总报告                                  │
│      └── ReportData (报告数据结构)                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.5 个人中心模块 (PersonalCenter)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       👤 个人中心 (personalCenterPage)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🖼️ UI层级 (prefabV2/mainV2/personalCenterPage.prefab)                          │
│  └── personalCenterPage (根节点)                                                 │
│      ├── 用户信息区                                                              │
│      │   ├── userIcon (头像)                                                    │
│      │   ├── userName (用户名)                                                  │
│      │   ├── userPhone (手机号)                                                 │
│      │   └── editBtn (编辑按钮)                                                 │
│      ├── VIP状态区                                                              │
│      │   ├── vipStatus (会员状态)                                               │
│      │   └── renewBtn (续费按钮)                                                │
│      ├── 功能列表区                                                              │
│      │   ├── 设置入口                                                           │
│      │   ├── 协议入口                                                           │
│      │   └── 关于我们                                                           │
│      └── 退出登录按钮                                                            │
│                                                                                  │
│  📜 脚本层级 (scripts/UserCenterV2/)                                             │
│  ├── UserCenterView.ts (个人中心主控制器)                                        │
│  │   ├── 用户信息展示                                                           │
│  │   ├── VIP状态展示                                                            │
│  │   ├── 功能入口管理                                                           │
│  │   ├── 退出登录                                                               │
│  │   └── 依赖                                                                   │
│  │       ├── PersonalCenterManager                                             │
│  │       ├── LoginManager                                                      │
│  │       └── UIManager                                                         │
│  │                                                                              │
│  ├── AlterUserInfoView.ts (修改用户信息)                                         │
│  │   ├── 修改头像                                                               │
│  │   ├── 修改昵称                                                               │
│  │   ├── 修改性别                                                               │
│  │   └── 保存逻辑                                                               │
│  │                                                                              │
│  └── MySetView.ts (设置页面)                                                     │
│      ├── 用户协议                                                               │
│      ├── 隐私政策                                                               │
│      ├── 版本信息                                                               │
│      └── 注销账号                                                               │
│          └── signOutCallBack → LoginManager.loginout()                         │
│                                                                                  │
│  📦 Prefab资源 (prefabV2/personalCenter/)                                        │
│  ├── mySet.prefab (设置面板)                                                    │
│  └── alterUserInfo.prefab (修改信息面板)                                        │
│                                                                                  │
│  🔗 关联弹窗                                                                     │
│  ├── VipPanel - 会员购买                                                        │
│  ├── XieYiPanel - 协议展示                                                      │
│  └── VerifyPanel - 验证面板                                                     │
│                                                                                  │
│  🔗 数据管理                                                                     │
│  └── Game/PersonalCenterManager/PersonalCenterManager.ts                        │
│      ├── userInfoData (用户信息)                                                │
│      ├── requestUserInfo() - 请求用户信息                                       │
│      └── clean() - 清理数据                                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.6 功能弹窗模块

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         🪟 功能弹窗模块 (Panels)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📁 scripts/Game/UI/Vip/ (会员模块)                                              │
│  ├── VipPanel.ts (会员购买面板)                                                  │
│  │   ├── 套餐展示                                                               │
│  │   ├── 支付流程                                                               │
│  │   └── VipModel.ts (会员数据)                                                 │
│  ├── VipAlert.ts (会员提示弹窗)                                                  │
│  └── SelectDate.ts (日期选择)                                                    │
│                                                                                  │
│  📁 scripts/Game/UI/ChatPanel/ (AI对话模块)                                      │
│  ├── ChatPanel.ts (对话主面板)                                                   │
│  ├── ChatPanelCtrl.ts (对话控制器)                                               │
│  ├── ChatBubbleCtrl.ts (气泡控制)                                                │
│  ├── ChatComponentCtrl.ts (组件控制)                                             │
│  ├── ChatCharactorChoosePanel.ts (角色选择)                                      │
│  ├── ChatMusicPanel.ts (音乐选择)                                                │
│  └── Model/ (数据模型)                                                           │
│      ├── ChatModel.ts                                                           │
│      ├── ChatFlowModel.ts                                                       │
│      └── ChatProtocol.ts                                                        │
│                                                                                  │
│  📁 scripts/Game/UI/BrainTrain/ (串烧训练入口)                                   │
│  └── BrainTrain.ts (串烧训练面板)                                                │
│      ├── 训练列表展示                                                           │
│      └── 开始训练入口                                                           │
│                                                                                  │
│  📁 scripts/Game/UI/TaskAndNotificationPanel/ (任务通知)                         │
│  ├── TaskAndNotificationPanelCtrl.ts (任务面板控制)                              │
│  └── InfoListPopCtrl.ts (信息列表弹窗)                                           │
│                                                                                  │
│  📁 scripts/Game/UI/Login/ (登录相关)                                            │
│  ├── SwitchLoginPanel.ts (登录切换)                                              │
│  ├── LoginPanel.ts (验证码登录)                                                  │
│  ├── OrganizationPanel.ts (机构登录)                                             │
│  ├── OrganizationMemberSelectPanel.ts (成员选择)                                 │
│  ├── OrganizationMemberLoginPanel.ts (成员登录)                                  │
│  ├── VerifyPanel.ts (验证面板)                                                   │
│  ├── XieYiPanel.ts (协议面板)                                                    │
│  ├── ReconnectPanel.ts (重连面板)                                                │
│  └── ChangePassword.ts (修改密码)                                                │
│                                                                                  │
│  📁 scripts/Game/UI/Alert/ (通用弹窗)                                            │
│  ├── GameAlert.ts (游戏结算弹窗)                                                 │
│  ├── GameScoreAlert.ts (游戏得分弹窗)                                            │
│  ├── GuidePanel.ts (引导面板)                                                    │
│  └── UseragreePanel.ts (用户协议弹窗)                                            │
│                                                                                  │
│  📁 scripts/Game/UI/Common/ (通用组件)                                           │
│  ├── BrainTrainTipPanel.ts (训练提示面板)                                        │
│  └── TimerCommonComponent.ts (通用计时器)                                        │
│                                                                                  │
│  📁 scripts/TreatyV2/ (协议模块)                                                 │
│  ├── TreatyView.ts (协议视图)                                                    │
│  └── TreatyDataConfig.ts (协议配置)                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 串烧训练系统

### 3.1 SkewersManager 核心调度器

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SkewersManager.ts (单例模式)                                  │
│                scripts/Game/Task/Skewers/SkewersManager.ts                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📌 核心属性                                                                     │
│  ├── _instance: SkewersManager (单例实例)                                       │
│  ├── _gameDatas: SkewersGameData[] (所有维度训练数据)                            │
│  ├── _curIndex: number (当前训练索引)                                           │
│  ├── _cachedDeferredGameState (缓存延迟游戏状态)                                 │
│  │   ├── gameData: SkewersGameData                                              │
│  │   ├── questions: any[]                                                       │
│  │   ├── optionBank: any[]                                                      │
│  │   ├── videoPath: string                                                      │
│  │   ├── difficulty: number                                                     │
│  │   └── requiredAnswerCount: number                                            │
│  └── _iconUrlMap: Map<SkewersGameType, string> (维度图标映射)                    │
│                                                                                  │
│  📌 提示语字符串                                                                 │
│  ├── totalCompleteStr: "太棒了，恭喜你完成全部训练"                              │
│  ├── singleCompleteStr: "太棒了，请继续！"                                       │
│  ├── normalCompleteStr: "太棒了"                                                │
│  ├── reviseStr: "已完成全部训练，可做订正训练"                                   │
│  ├── failCompleteStr: "真遗憾，请加油"                                          │
│  ├── singleBrainScore: "收获100点脑力值"                                        │
│  └── totalBrainScore: "收获600点脑力值"                                         │
│                                                                                  │
│  📌 Socket 事件                                                                  │
│  ├── task_get_grouped_brain_trainings (获取训练队列)                            │
│  ├── task_complete_brain_training (完成训练上报)                                │
│  ├── TASK_GET_BRAIN_TRAININGS (静态事件名)                                      │
│  ├── REQUEST_SKEWERSGAME_COMPLETE (请求完成事件)                                │
│  └── SKEWERS_LOAD_ERROR (加载错误事件)                                          │
│                                                                                  │
│  📌 核心方法                                                                     │
│  ├── init() - 初始化管理器，注册面板                                            │
│  ├── start(id) - 开始串烧训练                                                   │
│  ├── startGame(id) - 启动指定任务游戏                                           │
│  ├── requestBranisTraining_list(taskID) - 请求训练列表                          │
│  ├── requestCompleteBrainsTrainings(data) - 请求完成单关                        │
│  ├── requestGameComplete(complete, duration) - 上报游戏完成                     │
│  ├── runNextGame() - 运行下一关                                                 │
│  ├── runGame() - 运行当前游戏                                                   │
│  ├── quitGame() - 退出训练弹窗                                                  │
│  ├── exitCallBack() - 退出训练回调                                              │
│  ├── remoteExitCallBack() - 远程退出回调                                        │
│  ├── showGameAlert() - 显示训练弹窗                                             │
│  └── showGameTip() - 显示训练提示                                               │
│                                                                                  │
│  📌 数据查询方法                                                                 │
│  ├── getTotalSkewersGamesCount() - 获取总游戏数量                               │
│  ├── getTotalSkewersCount() - 获取总维度数量                                    │
│  ├── getUnCompleteGameCount() - 获取未完成游戏数量                              │
│  ├── getUnCompleteGameData() - 获取未完成的维度数据                             │
│  ├── getCurGameIndex() - 获取当前游戏索引                                       │
│  ├── getGameCount() - 获取当前维度游戏数量                                      │
│  ├── getTrainData(id) - 根据ID获取训练数据                                      │
│  ├── hasCompleteCurGame() - 当前维度是否完成                                    │
│  └── isRunOver() - 是否全部完成                                                 │
│                                                                                  │
│  📌 缓存状态管理                                                                 │
│  ├── cacheDeferredGameState(state) - 缓存延迟游戏状态                           │
│  ├── getCachedDeferredGameState() - 获取缓存状态                                │
│  └── clearCachedDeferredGameState() - 清理缓存状态                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 数据结构层级

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SkewersGameData.ts (数据结构)                                 │
│                scripts/Game/Task/Skewers/SkewersGameData.ts                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🎯 SkewersGameType (游戏类型枚举)                                               │
│  ├── Comprehension = "COMPREHENSION" (理解力)                                   │
│  │   └── 对应游戏: 听音辨物 (listeningMaster)                                   │
│  ├── Executionability = "EXECUTION" (执行力)                                    │
│  │   └── 对应游戏: 拼图 (puzzle), 捕鱼 (catchFish)                              │
│  ├── Language = "LANGUAGE" (语言力)                                             │
│  │   └── 对应游戏: 造句 (sentenceMaking), 小剧场 (smalltheater)                 │
│  ├── Calculator = "CALCULATION" (计算力)                                        │
│  │   └── 对应游戏: 24点 (math24), 平衡 (balance)                               │
│  ├── Judgment = "JUDGMENT" (判断力)                                             │
│  │   └── 对应游戏: 找一找 (finding), 猜一猜 (guessingGame)                      │
│  └── Memory = "MEMORY" (记忆力)                                                 │
│      └── 对应游戏: 翻牌 (fanpai)                                                │
│                                                                                  │
│  📋 SkewersGameData (维度训练数据类)                                             │
│  ├── 基础属性                                                                    │
│  │   ├── gameName: string (训练名称)                                            │
│  │   ├── gameID: number (训练ID)                                                │
│  │   ├── gameCode: string (游戏代码)                                            │
│  │   ├── type: SkewersGameType (能力维度)                                       │
│  │   ├── trains: SkewersGameTrainData[] (子训练队列)                            │
│  │   ├── levelMode: number (关卡获取类型 1顺序/2难度)                           │
│  │   ├── is_correction: boolean (是否订正)                                      │
│  │   └── index: number (在队列中的索引)                                         │
│  │                                                                              │
│  ├── 计算属性 (getter)                                                          │
│  │   ├── TypeName: string (维度中文名)                                          │
│  │   ├── Revise: boolean (是否订正模式)                                         │
│  │   ├── difficulty: number (当前难度)                                          │
│  │   ├── level: number (当前关卡)                                               │
│  │   ├── timeLimit: number (时间限制)                                           │
│  │   ├── length: number (训练数量)                                              │
│  │   ├── seq: number (当前序号)                                                 │
│  │   ├── id: number (当前训练ID)                                                │
│  │   ├── progress: number (进度0-1)                                             │
│  │   ├── progressStr: string (进度字符串"1/3")                                  │
│  │   └── status: number (状态)                                                  │
│  │                                                                              │
│  └── 核心方法                                                                    │
│      ├── refreshData(data) - 刷新数据                                           │
│      ├── getCurTrainData() - 获取当前训练数据                                   │
│      ├── getTrainDataByID(id) - 根据ID获取训练数据                              │
│      ├── hasGuid() - 是否有引导                                                 │
│      └── updateData(id, data) - 更新训练数据                                    │
│                                                                                  │
│  📋 SkewersGameTrainData (单关训练数据类)                                        │
│  ├── 基础属性                                                                    │
│  │   ├── _parentSkewersGameData: SkewersGameData (父级引用)                     │
│  │   ├── brain_training_id: number (训练ID)                                     │
│  │   ├── seq: number (序号)                                                     │
│  │   ├── status: number (状态 0未完成/1已完成)                                  │
│  │   ├── complete: number (完成度 0-1)                                          │
│  │   ├── duration: number (用时秒)                                              │
│  │   ├── difficulty: number (难度)                                              │
│  │   ├── timeLimit: number (时间限制)                                           │
│  │   ├── _level: number (关卡)                                                  │
│  │   ├── score: number (得分)                                                   │
│  │   ├── completedAt: string (完成时间)                                         │
│  │   ├── _hasGuide: boolean (是否有引导)                                        │
│  │   └── length: number (所属维度训练总数)                                      │
│  │                                                                              │
│  └── 方法                                                                        │
│      ├── refreshData(data) - 刷新数据                                           │
│      └── getLevelByDifficult(difficulty) - 根据难度获取关卡                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 SkewersSpecGameModel 游戏模型

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              SkewersSpecGameModel.ts (串烧训练游戏模型)                           │
│              scripts/Core/Scene/SceneModel/SkewersSpecGameModel.ts              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📌 继承关系                                                                     │
│  └── SkewersSpecGameModel extends BaseGameModel<ISkewersSpecific>               │
│                                                                                  │
│  📌 接口定义                                                                     │
│  ├── ISkewersSpecific (串烧训练特性接口)                                        │
│  │   ├── children: SkewersGameTrainData[]                                       │
│  │   ├── currentChild: SkewersGameTrainData | null                              │
│  │   ├── gameType: string                                                       │
│  │   ├── progress: number                                                       │
│  │   ├── hasGuide: boolean                                                      │
│  │   ├── showGameAlert()                                                        │
│  │   ├── showGameTip()                                                          │
│  │   ├── exitCallBack()                                                         │
│  │   └── completeCurrent(score): void                                           │
│  │                                                                              │
│  └── ISkewersGameEndConfig (训练结束配置接口)                                    │
│      ├── trainID?: number                                                       │
│      ├── success?: boolean                                                      │
│      ├── isCorrection?: boolean                                                 │
│      ├── complete: number                                                       │
│      ├── duration: number                                                       │
│      ├── parentNode: Node                                                       │
│      ├── context: any                                                           │
│      ├── isCachedData?: boolean (缓存相关)                                      │
│      ├── cachedGameData?: any                                                   │
│      ├── cachedTrainData?: any                                                  │
│      ├── desc?: string (自定义描述)                                             │
│      ├── onRequestComplete?: () => void (完成回调)                              │
│      ├── customCurCount?: number (自定义当前进度)                               │
│      └── customMaxCount?: number (自定义最大进度)                               │
│                                                                                  │
│  📌 核心属性                                                                     │
│  ├── _lastCompletedTrainData: SkewersGameTrainData | null                       │
│  ├── gameType: GameType.SKEWERS                                                 │
│  ├── game: SkewersGameData (getter)                                             │
│  ├── level: number (getter)                                                     │
│  ├── difficulty: number (getter)                                                │
│  └── hasCompleteCurGame: boolean (getter)                                       │
│                                                                                  │
│  📌 核心方法                                                                     │
│  ├── 生命周期方法                                                               │
│  │   ├── showStartAlert(config: IStartConfig)                                   │
│  │   ├── refreshData(data: ISkewersSpecific)                                    │
│  │   ├── runNextGame()                                                          │
│  │   └── quitGame(config?: IQuitGameConfig)                                     │
│  │                                                                              │
│  ├── 订正相关方法                                                               │
│  │   ├── dzgoonHandler(context, win) - 订正继续处理                             │
│  │   └── dzanswerHandler(context) - 订正答题处理                                │
│  │                                                                              │
│  ├── 结算方法                                                                   │
│  │   ├── goonHandler(context, win) - 继续游戏处理                               │
│  │   ├── showSuccessHandler(context, win) - 胜利处理                            │
│  │   ├── showNextSuccessHandler(context) - 下一关胜利                           │
│  │   ├── showNextFailHandler(context) - 下一关失败                              │
│  │   ├── showFailHandler(context) - 失败处理                                    │
│  │   └── totalCompleteHandler(context) - 全部完成处理                           │
│  │                                                                              │
│  ├── 上报方法                                                                   │
│  │   ├── requestGameComplete(config: ISkewersGameEndConfig) - 上报游戏完成      │
│  │   └── requestGameCompleteCallBack(config) - 上报完成回调                     │
│  │                                                                              │
│  └── 弹窗显示方法                                                               │
│      ├── showNormalSuccess() - 普通成功弹窗                                     │
│      ├── showNormalFail() - 普通失败弹窗                                        │
│      └── showNextGameAlert() - 下一关弹窗                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 GameAlert 弹窗组件

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       GameAlert.ts (统一弹窗组件)                                │
│                    scripts/Game/UI/Alert/GameAlert.ts                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🪟 AlertType (弹窗类型枚举)                                                     │
│  ├── Normal (0) - 某一维度小关完成弹窗                                          │
│  ├── Normal1 (1) - 暂停弹窗                                                     │
│  ├── Sucess_Normal (2) - 胜利首个弹窗(维度完成)                                 │
│  ├── Sucess_Small (3) - 胜利中间弹窗(下一维度)                                  │
│  ├── Sucess_Big (4) - 全部完成弹窗                                              │
│  ├── Failed (5) - 失败弹窗                                                      │
│  ├── Game_Center (6) - 游戏中心弹窗                                             │
│  ├── Init (7) - 初始弹窗                                                        │
│  ├── Next (8) - 下一关弹窗                                                      │
│  ├── Revise (9) - 订正弹窗                                                      │
│  ├── Revise_Success (10) - 订正成功弹窗                                         │
│  ├── Revise_Fail (11) - 订正失败弹窗                                            │
│  ├── Revise_Complete (12) - 订正全部完成弹窗                                    │
│  ├── Answer (13) - 显示答案弹窗                                                 │
│  └── Cache (14) - 缓存游戏弹窗                                                  │
│                                                                                  │
│  🖼️ UI 节点绑定                                                                 │
│  ├── alert: Node (弹窗根节点)                                                   │
│  ├── titleLabel: Label (标题)                                                   │
│  ├── decLabel: Label (描述文本)                                                 │
│  ├── exitBtn: Button (退出按钮)                                                 │
│  ├── startBtn: Button (开始/继续按钮)                                           │
│  ├── startLabel: Label (按钮文字)                                               │
│  ├── guideBtn: Button (引导按钮)                                                │
│  ├── icon: Node (维度图标)                                                      │
│  ├── progressBar: ProgressBar (进度条)                                          │
│  ├── progressLabel: Label (进度文字 "1/3")                                      │
│  ├── completeIcon: Node (完成图标)                                              │
│  └── iconConNode: Node (图标容器)                                               │
│                                                                                  │
│  📌 核心属性                                                                     │
│  ├── goonCallBack: Function (继续回调)                                          │
│  ├── exitCallBack: Function (退出回调)                                          │
│  ├── context: any (回调上下文)                                                  │
│  ├── _type: AlertType (当前类型)                                                │
│  ├── _isButtonDisabled: boolean (按钮禁用状态)                                  │
│  ├── _countdownTimer: any (倒计时定时器)                                        │
│  ├── _countdownTime: number (倒计时剩余)                                        │
│  └── _countdownDelay: number (默认3秒)                                          │
│                                                                                  │
│  📌 核心方法                                                                     │
│  ├── 设置方法                                                                   │
│  │   ├── setTitle(title) - 设置标题                                             │
│  │   ├── setDec(dec) - 设置描述                                                 │
│  │   ├── setProgress(cur, max) - 设置进度                                       │
│  │   ├── setIcon(url) - 设置图标                                                │
│  │   ├── showWinLose(win) - 显示胜负状态                                        │
│  │   └── bindCallBack(goon, exit, context) - 绑定回调                           │
│  │                                                                              │
│  ├── 显示方法                                                                   │
│  │   ├── showView(type: AlertType) - 显示弹窗                                   │
│  │   ├── hideView() - 隐藏弹窗                                                  │
│  │   └── isListeningMasterGame() - 判断是否听音辨物游戏                         │
│  │                                                                              │
│  ├── 倒计时方法                                                                 │
│  │   ├── startCountdown(seconds) - 开始倒计时                                   │
│  │   ├── stopCountdown() - 停止倒计时                                           │
│  │   └── updateCountdownDisplay() - 更新倒计时显示                              │
│  │                                                                              │
│  └── 按钮事件                                                                   │
│      ├── goonHandler() - 继续按钮点击                                           │
│      └── exitHandler() - 退出按钮点击                                           │
│                                                                                  │
│  🔊 音效资源                                                                    │
│  ├── audioUrls: ["music/cheer", "music/rest"]                                   │
│  └── audioMap: Map<string, AudioClip>                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.5 Prefab 资源结构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Prefab 资源 (prefab/BrainTrain/)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📁 prefab/BrainTrain/                                                          │
│  ├── BrainTrain.prefab (串烧训练主界面)                                         │
│  │   └── BrainTrain.ts                                                          │
│  │                                                                              │
│  ├── BrainTrainAlert.prefab (通用训练弹窗)                                      │
│  │   └── GameAlert.ts                                                           │
│  │       └── UI 结构:                                                           │
│  │           ├── 背景遮罩                                                       │
│  │           ├── alert (弹窗容器)                                               │
│  │           │   ├── 标题区域                                                   │
│  │           │   │   └── titleLabel                                             │
│  │           │   ├── 图标区域                                                   │
│  │           │   │   ├── iconConNode                                            │
│  │           │   │   ├── icon (维度图标)                                        │
│  │           │   │   └── completeIcon (完成勾选)                                │
│  │           │   ├── 描述区域                                                   │
│  │           │   │   └── decLabel                                               │
│  │           │   ├── 进度区域                                                   │
│  │           │   │   ├── progressBar                                            │
│  │           │   │   └── progressLabel ("1/3")                                  │
│  │           │   └── 按钮区域                                                   │
│  │           │       ├── startBtn (继续/开始)                                   │
│  │           │       │   └── startLabel                                         │
│  │           │       ├── exitBtn (退出)                                         │
│  │           │       └── guideBtn (引导)                                        │
│  │           └── 动画/特效节点                                                  │
│  │                                                                              │
│  └── BrainTrainScoreAlert.prefab (得分弹窗)                                     │
│      └── GameScoreAlert.ts                                                      │
│          └── UI 结构:                                                           │
│              ├── 背景                                                           │
│              ├── 得分显示                                                       │
│              ├── 脑力值显示                                                     │
│              └── 确定按钮                                                       │
│                                                                                  │
│  📁 prefab/Common/                                                              │
│  └── BrainTrainTipPanel.prefab (训练提示面板)                                   │
│      └── BrainTrainTipPanel.ts                                                  │
│          └── UI 结构:                                                           │
│              ├── 提示标题                                                       │
│              ├── 进度显示                                                       │
│              └── 动画                                                           │
│                                                                                  │
│  📁 prefab/GuidePanel/                                                          │
│  └── GuidePanel.prefab (引导面板)                                               │
│      └── GuidePanel.ts                                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.6 BaseScene 基类结构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BaseScene.ts (游戏场景基类)                              │
│                    scripts/Core/Scene/BaseScene.ts                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📌 继承关系                                                                     │
│  └── BaseScene<T extends IBaseGameChild> extends AdaptComponent                 │
│                                                                                  │
│  📌 核心属性                                                                     │
│  ├── sceneModel: BaseGameModel<T> (游戏模型)                                    │
│  ├── viewNode: Node (视图节点)                                                  │
│  ├── timerComponent: TimerCommonComponent (计时器)                              │
│  ├── guideView: Node (引导视图)                                                 │
│  ├── quitBtn: Node (退出按钮)                                                   │
│  ├── complete: number (完成度)                                                  │
│  ├── duration: number (用时)                                                    │
│  ├── bundleName: string (资源包名)                                              │
│  ├── curView: BaseScene (当前视图)                                              │
│  ├── audioMap: Map<string, AudioClip> (音效缓存)                                │
│  └── textureMap: Map<string, Texture2D> (纹理缓存)                              │
│                                                                                  │
│  📌 生命周期方法                                                                 │
│  ├── start() - 启动，获取sceneModel                                             │
│  ├── onEnable() - 注册事件监听                                                  │
│  ├── onDisable() - 注销事件监听                                                 │
│  └── onDestroy() - 销毁，清理资源                                               │
│                                                                                  │
│  📌 游戏控制方法                                                                 │
│  ├── sceneInit() - 场景初始化                                                   │
│  ├── resetTime() - 重置计时                                                     │
│  ├── pauseTime() - 暂停计时                                                     │
│  ├── resumeTime() - 恢复计时                                                    │
│  ├── showGuide() - 显示引导                                                     │
│  ├── hideGuide() - 隐藏引导                                                     │
│  └── clearGameView() - 清理游戏视图                                             │
│                                                                                  │
│  📌 回调方法 (供子类覆盖)                                                       │
│  ├── onTimerEnd() - 计时结束                                                    │
│  ├── onSuccessNextLevel() - 成功下一关                                          │
│  ├── onFailNextLevel() - 失败下一关                                             │
│  ├── onAgain() - 重玩                                                           │
│  ├── resumeCallBack(context) - 恢复回调                                         │
│  ├── exitCallBack(context) - 退出回调                                           │
│  ├── showSuccessPanel() - 显示成功面板                                          │
│  └── showFailPanel() - 显示失败面板                                             │
│                                                                                  │
│  📌 订正相关方法                                                                 │
│  ├── onClickShowAnswer(context) - 点击显示答案                                  │
│  └── dzanswerHandler(context) - 订正答题处理                                    │
│                                                                                  │
│  📌 事件监听                                                                     │
│  ├── GAME_SUCCESS_NEXT_LEVEL (成功下一关)                                       │
│  ├── GAME_FAIL_NEXT_LEVEL (失败下一关)                                          │
│  └── GAME_AGAIN (重玩)                                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.7 数据流图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           串烧训练数据流                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    请求任务列表     ┌────────────────┐                        │
│  │   首页/      │ ──────────────────► │  SocketManager │                        │
│  │   训练中心   │                     │  (WebSocket)   │                        │
│  └──────┬───────┘                     └───────┬────────┘                        │
│         │                                     │                                  │
│         │ 开始训练                            │ 返回训练数据                      │
│         ▼                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐               │
│  │                    SkewersManager                             │               │
│  │  ┌─────────────────────────────────────────────────────────┐ │               │
│  │  │  requestBranisTraining_list() → _gameDatas[]            │ │               │
│  │  │  ├── SkewersGameData[0] (理解力)                        │ │               │
│  │  │  │   └── trains[]: SkewersGameTrainData[]               │ │               │
│  │  │  ├── SkewersGameData[1] (执行力)                        │ │               │
│  │  │  │   └── trains[]: SkewersGameTrainData[]               │ │               │
│  │  │  ├── ... 其他维度                                        │ │               │
│  │  │  └── curGame → 当前维度数据                              │ │               │
│  │  └─────────────────────────────────────────────────────────┘ │               │
│  └──────────────────────────┬───────────────────────────────────┘               │
│                             │                                                    │
│                             │ startGame() / runGame()                            │
│                             ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────┐               │
│  │                    SceneManager                               │               │
│  │         changeScene(gameCode, bundleName)                    │               │
│  └──────────────────────────┬───────────────────────────────────┘               │
│                             │                                                    │
│                             │ 加载对应游戏场景                                   │
│                             ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────┐               │
│  │              具体游戏场景 (如 listeningMaster)                │               │
│  │  ┌─────────────────────────────────────────────────────────┐ │               │
│  │  │  Main extends BaseScene                                  │ │               │
│  │  │  ├── sceneModel: SkewersSpecGameModel                    │ │               │
│  │  │  ├── 游戏逻辑...                                         │ │               │
│  │  │  └── 结算时调用:                                         │ │               │
│  │  │      requestGameComplete(config)                         │ │               │
│  │  └─────────────────────────────────────────────────────────┘ │               │
│  └──────────────────────────┬───────────────────────────────────┘               │
│                             │                                                    │
│                             │ 游戏完成                                           │
│                             ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────┐               │
│  │                SkewersSpecGameModel                           │               │
│  │  ┌─────────────────────────────────────────────────────────┐ │               │
│  │  │  requestGameComplete(config)                             │ │               │
│  │  │  ├── 上报数据到服务器                                    │ │               │
│  │  │  ├── 更新本地状态                                        │ │               │
│  │  │  └── 显示结算弹窗 → GameAlert                            │ │               │
│  │  └─────────────────────────────────────────────────────────┘ │               │
│  └──────────────────────────┬───────────────────────────────────┘               │
│                             │                                                    │
│                             │ 弹窗回调                                           │
│                             ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────┐               │
│  │                     GameAlert                                 │               │
│  │  ├── 继续 → goonHandler() → runNextGame()                    │               │
│  │  │         └── 加载下一关 / 下一维度                          │               │
│  │  └── 退出 → exitHandler() → exitCallBack()                   │               │
│  │             └── 返回大厅                                      │               │
│  └──────────────────────────────────────────────────────────────┘               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 游戏模块分类

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        游戏模块与串烧系统关联度                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                          中关联 (深度整合)                                   ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │                                                                              ││
│  │  📦 listeningMaster (听音辨物)                                              ││
│  │  ├── 特殊: 延迟答题机制 (deferResult == 1)                                  ││
│  │  ├── 使用: Global.isCachedAnswering 全局状态                                ││
│  │  ├── 使用: _cachedDeferredGameState 缓存                                    ││
│  │  ├── 特殊弹窗倒计时: 10秒                                                   ││
│  │  └── 自定义进度: 1/2, 2/2                                                   ││
│  │                                                                              ││
│  │  📦 fanpai (翻牌)                                                           ││
│  │  ├── 标准串烧流程                                                           ││
│  │  └── 维度: 记忆力 Memory                                                    ││
│  │                                                                              ││
│  │  📦 catchFish (捕鱼)                                                        ││
│  │  ├── 标准串烧流程                                                           ││
│  │  └── 维度: 计算力 Calculator                                                ││
│  │                                                                              ││
│  │  📦 smalltheater (小剧场)                                                   ││
│  │  ├── 标准串烧流程                                                           ││
│  │  └── 维度: 语言力 Language                                                  ││
│  │                                                                              ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                          中关联 (标准整合)                                   ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │                                                                              ││
│  │  📦 guessingGame (猜一猜)                                                   ││
│  │  ├── 标准串烧流程                                                           ││
│  │  └── 维度: 判断力 Judgment                                                  ││
│  │                                                                              ││
│  │  📦 puzzle (拼图)                                                           ││
│  │  ├── 标准串烧流程                                                           ││
│  │  └── 维度: 执行力 Executionability                                          ││
│  │                                                                              ││
│  │  📦 sentenceMaking (造句)                                                   ││
│  │  ├── 标准串烧流程                                                           ││
│  │  └── 维度: 语言力 Language                                                  ││
│  │                                                                              ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                          弱关联 (松耦合)                                     ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │                                                                              ││
│  │  📦 finding (找一找)                                                        ││
│  │  ├── 最小化串烧依赖                                                         ││
│  │  └── 维度: 判断力 Judgment                                                  ││
│  │                                                                              ││
│  │  📦 math24 (24点)                                                           ││
│  │  ├── 最小化串烧依赖                                                         ││
│  │  └── 维度: 计算力 Calculator                                                ││
│  │                                                                              ││
│  │  📦 balance (平衡)                                                          ││
│  │  ├── 最小化串烧依赖                                                         ││
│  │  └── 维度: 计算力 Calculator                                                ││
│  │                                                                              ││
│  │  📦 fingerGame (手指训练)                                                   ││
│  │  ├── 独立模式为主                                                           ││
│  │  └── 可能不在串烧任务中                                                     ││
│  │                                                                              ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 依赖关系图

```
                    ┌──────────────┐
                    │    Global    │
                    │ (全局状态)   │
                    └──────┬───────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌────────────────┐
│ LoginManager  │◄─►│  EventManager   │◄─►│ SocketManager  │
└───────┬───────┘  └────────┬────────┘  └────────────────┘
        │                   │
        │          ┌────────┴────────┐
        │          │                 │
        ▼          ▼                 ▼
┌───────────────┐  ┌──────────────┐  ┌───────────────┐
│ SceneManager  │  │  UIManager   │  │ AudioManager  │
└───────┬───────┘  └──────┬───────┘  └───────────────┘
        │                 │
        ▼                 ▼
┌───────────────────────────────────────────────────────┐
│                    mainV2.scene                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ IndexPage   │ │ GameCenter  │ │ ReportPage  │ ...  │
│  └──────┬──────┘ └──────┬──────┘ └─────────────┘      │
└─────────┼───────────────┼─────────────────────────────┘
          │               │
          ▼               ▼
    ┌─────────────────────────────────────┐
    │        SkewersManager               │
    │  (串烧训练核心调度)                  │
    └─────────────────┬───────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    ▼                 ▼                 ▼
┌─────────┐    ┌───────────────┐   ┌──────────┐
│GameAlert│◄──►│SkewersSpec   │◄──►│ BaseScene│
│(弹窗)   │    │GameModel     │   │ (基类)   │
└─────────┘    └───────────────┘   └────┬─────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
          ▼                             ▼                             ▼
    ┌───────────────┐           ┌───────────────┐              ┌───────────┐
    │ listeningMaster│ (中关联) │ guessingGame  │ (中关联)     │  finding  │ (弱关联)
    │ fanpai        │           │ puzzle        │              │  math24   │
    │ catchFish     │           │ sentenceMaking│              │  balance  │
    │ smalltheater  │           │               │              │fingerGame │
    └───────────────┘           └───────────────┘              └───────────┘
```

---

## 📋 核心类/文件汇总表

| 分类 | 文件路径 | 职责 |
|------|----------|------|
| **核心管理器** | `Game/Task/Skewers/SkewersManager.ts` | 串烧训练核心调度，状态管理 |
| **数据结构** | `Game/Task/Skewers/SkewersGameData.ts` | 训练数据类和枚举定义 |
| **游戏模型** | `Core/Scene/SceneModel/SkewersSpecGameModel.ts` | 串烧专用游戏模型，结算逻辑 |
| **基础模型** | `Core/Scene/SceneModel/BaseGameModel.ts` | 游戏模型基类 |
| **场景基类** | `Core/Scene/BaseScene.ts` | 游戏场景基类，生命周期 |
| **弹窗组件** | `Game/UI/Alert/GameAlert.ts` | 统一结算弹窗组件 |
| **得分弹窗** | `Game/UI/Alert/GameScoreAlert.ts` | 脑力值得分弹窗 |
| **引导面板** | `Game/UI/Alert/GuidePanel.ts` | 游戏引导面板 |
| **提示面板** | `Game/UI/Common/BrainTrainTipPanel.ts` | 训练提示浮窗 |
| **全局状态** | `Core/Manager/Config/Global.ts` | 全局状态 (isSkewersGame, isCachedAnswering) |
| **主场景控制** | `mainV2/MainSceneController.ts` | 主场景控制器 |
| **页面控制** | `mainV2/PageController.ts` | Tab页面导航控制 |
| **首页视图** | `indexPageV2/IndexPageView.ts` | 首页主控制器 |
| **训练中心** | `GameCenterV2/GameCenterPageView.ts` | 训练中心控制器 |
| **报告页** | `ReportPageV2/ReportPageController.ts` | 报告页主控制器 |
| **个人中心** | `UserCenterV2/UserCenterView.ts` | 个人中心主控制器 |
| **登录管理** | `Core/Manager/LoginManager/LoginManager.ts` | 登录、退出管理 |
| **场景管理** | `Core/Manager/Scene/SceneManager.ts` | 场景切换管理 |
| **UI管理** | `Core/Manager/UI/UIManager.ts` | 面板显示管理 |
| **事件管理** | `Core/Manager/Event/EventManager.ts` | 全局事件管理 |
| **报告管理** | `ManagerV2/ReportManager.ts` | 报告数据管理 |
| **用户管理** | `Game/PersonalCenterManager/PersonalCenterManager.ts` | 用户信息管理 |

---

## 更新记录

- **2024-12-08**: 初始版本，包含完整项目结构导图
