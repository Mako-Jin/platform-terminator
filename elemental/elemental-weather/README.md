# Elemental Weather 项目分析

## 项目概述

`elemental-weather` 是一个基于 **Three.js** 和 **React** 构建的沉浸式 3D 天气可视化应用，提供四季交替、天气变化、昼夜循环的交互式自然场景体验。

---

## 架构设计

### 核心模块架构

─────────────────────────────────────────────────────────────┐ │ Weather (主类) │ │ ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐ │ │ │ Scene/Render│ │ Camera │ │ World │ │ │ │ 场景渲染 │ │ 相机控制 │ │ 场景组件容器 │ │ │ └─────────────┘ └──────────────┘ └──────────────────┘ │ │ │ │ │ │ └─────────┼──────────────────┼───────────────────┼────────────┘ ▼ ▼ ▼ ┌─────────────────────────────────────────────────────────────┐ │ 管理器层 (Managers) │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │ │ │WeatherManager│ │AudioManager │ │SettingsManager │ │ │ │ 天气状态 │ │ 音频播放 │ │ 配置加载管理 │ │ │ └──────────────┘ └──────────────┘ └──────────────────┘ │ │ │ │ │ │ │ ▼ ▼ ▼ │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │ │ │MusicManager │ │AmbientManager│ │ ParticleSystem │ │ │ │ 背景音乐 │ │ 环境音效 │ │ 粒子系统 │ │ │ └──────────────┘ └──────────────┘ └──────────────────┘ │ └─────────────────────────────────────────────────────────────┘


---

## 核心功能模块

### 1. 天气管理系统 (`WeatherManager`)

- **单例模式**，管理天气状态切换
- 支持天气类型：`sunny` / `cloudy` / `rainy` / `snowy` / `foggy`
- 事件驱动架构，通过 `eventBus` 广播天气变化事件

```typescript
// 天气变化事件机制
weatherManager.onWeatherChanged((data) => {
    console.log(`${data.previousWeather} → ${data.currentWeather}`);
});
```

### 2. 音频系统

#### AudioManager
- Three.js AudioListener 封装
- 支持淡入淡出效果（`fadeVolume`）
- 三类音频管理：音乐、环境音、UI音效

#### MusicManager
- 三首背景音乐循环播放：`Morning Petals`、`Window Light`、`Forest Dreams`
- 音量渐变过渡，避免突兀切换

#### AmbientSoundManager
- **智能场景音效匹配**：

| 季节/时间 | 触发音效 |
|-----------|----------|
| 白天 | 鸟鸣 |
| 夜晚(春夏秋) | 蟋蟀、猫头鹰、狼嚎 |
| 夜晚(冬季) | 猫头鹰(hoot) |
| 雨天 | 雨声 |
| 夏季雨天 | 雷声 |
| 非雨天 | 篝火声 |
| 非冬季 | 湖水波浪 |

### 3. 配置管理 (`SettingsManager`)

- 加载四季配置（春、夏、秋、冬）
- **昼夜颜色插值系统**：
  - 8:00-16:00：完全白天
  - 16:00-20:00：黄昏过渡
  - 20:00-4:00：完全夜晚
  - 4:00-8:00：黎明过渡
- 支持 `linear`、`easeInOut`、`smoothstep` 缓动函数

### 4. 粒子系统 (`ParticleSystem`)

- **Emitter 发射器模式**，支持粒子池复用
- 支持多种发射形状（PointShape）
- 配置参数：重力、阻力、速度、生命周期

---

## World 场景组件

### 组件分类

| 类型 | 组件 | 功能描述 |
|------|------|----------|
| **环境基础** | `Ground`, `Skydome`, `Lighting` | 地面、天空盒、光照系统 |
| **天气特效** | `Rain`, `Snow`, `Fog`, `Lightning`, `WindLines` | 雨、雪、雾、闪电、风线 |
| **场景物体** | `Tent`, `Bridge`, `Rocks`, `Bush`, `TreesTrunks`, `Camp`, `Fire` | 帐篷、桥梁、岩石、灌木、树干、营地、篝火 |
| **动态特效** | `FallingLeaves`, `Fireflies` | 落叶、萤火虫 |

### 组件生命周期

```typescript
// 初始化 → 激活 → 更新 → 销毁
await component.initialize();
component.activate();
await component.update({ delta, elapsedTime });
component.dispose();
```

---

## 资源管理

### 资源类型

```typescript
// src/settings/resources/index.ts
const ASSETS = {
    audio: [
        // 音乐
        'morningPetalsMusic', 'windowLightMusic', 'forestDreamsMusic',
        // 环境音
        'birds1Sound', 'cricketsSound', 'owlHootingSound', 
        'rainSound', 'thunderDistantSound', 'fireBurningSound',
        // UI音效
        'clickSound', 'hoverSound'
    ],
    models: ['bridge.glb', 'tent.glb', 'camp.glb', ...],
    textures: ['grass/displacement_map.png', ...],
    cubemaps: ['map/day/', 'map/night/']
};
```

---

## 渲染管线

┌─────────────────────────────────────────────────────────────────┐ │ 渲染流程 │ ├─────────────────────────────────────────────────────────────────┤ │ 1. ClockManager 更新时间 │ │ ↓ │ │ 2. Weather.update(delta, elapsedTime) │ │ ↓ │ │ 3. World.update() → 所有组件并行更新 │ │ ↓ │ │ 4. OrbitControls.update() │ │ ↓ │ │ 5. Camera.update() │ │ ↓ │ │ 6. Renderer.render(scene, camera) │ └─────────────────────────────────────────────────────────────────┘



---

## 关键技术特性

### 1. 着色器系统
- 自定义 GLSL 着色器（草地、水面、岩石、天空盒）
- 着色器 Chunk 模块化管理，支持复用

### 2. 性能优化
- **粒子池复用**：避免频繁创建销毁
- **组件按需更新**：静态物体（如帐篷、桥梁）无需每帧更新
- **距离衰减音效**：根据相机距离动态调整环境音音量

### 3. 响应式设计
- 窗口大小变化自动调整相机和渲染器
- 透视相机宽高比动态计算

### 4. 生命周期管理
- 完整的资源释放流程（`dispose`）
- 页面隐藏/焦点丢失时暂停音效

---

## UI 组件

| 组件 | 功能 |
|------|------|
| `ControlPanel` | 天气/季节/时间控制面板 |
| `LoadingScreen` | 资源加载进度条 |
| `ShaderReveal` | 着色器转场动画 |
| `ToastContainer` | 通知提示系统 |
| `SettingsModal` | 设置弹窗 |

---

## 总结

`elemental-weather` 是一个**功能完整、架构清晰**的沉浸式天气可视化应用，核心亮点：

1. **沉浸式体验**：视觉（3D场景+着色器）+ 听觉（环境音效+音乐）的完整感官体验
2. **动态响应系统**：天气、季节、时间联动，场景实时变化
3. **模块化架构**：组件化设计，职责清晰，易于扩展
4. **性能优化**：粒子池、按需更新、资源缓存等策略
5. **事件驱动**：基于 `eventBus` 的解耦通信机制

---

## 文件结构

src/ ├── hooks/ # React Hooks │ └── useToast.ts # Toast通知Hook ├── manager/ # 管理器层 │ ├── sounds/ # 音频管理 │ │ ├── ambient.ts # 环境音管理器 │ │ ├── audio.ts # 音频播放器 │ │ ├── index.ts │ │ └── music.ts # 音乐管理器 │ ├── weather/ # 天气管理 │ │ ├── index.ts │ │ ├── manager.ts # 天气状态管理 │ │ └── types.ts # 类型定义 │ └── index.ts ├── particle/ # 粒子系统 │ ├── index.ts # 粒子核心实现 │ └── types.ts ├── settings/ # 配置管理 │ ├── bush/ # 灌木配置 │ ├── resources/ # 资源配置 │ ├── seasons/ # 四季配置 │ │ ├── autumn.json │ │ ├── spring.json │ │ ├── summer.json │ │ └── winter.json │ ├── weather/ # 天气配置 │ │ ├── cloudy.json │ │ ├── foggy.json │ │ ├── rainy.json │ │ └── snowy.json │ ├── index.ts │ ├── loader.ts # 配置加载器 │ ├── manager.ts # 配置管理器 │ ├── types.ts │ └── utils.ts # 工具函数 ├── shaders/ # 着色器 │ ├── Chunks/ # 着色器片段 │ └── Materials/ # 材质着色器 ├── utils/ # 工具函数 │ ├── haptics.ts # 触觉反馈 │ ├── index.ts │ └── math.ts # 数学工具 ├── views/ # React视图组件 │ ├── controls/ # 控制面板 │ ├── loading/ # 加载界面 │ ├── menu/ # 菜单 │ ├── settings/ # 设置弹窗 │ ├── shader/ # 着色器转场 │ ├── title/ # 标题 │ ├── toast/ # 通知 │ └── index.tsx # 主视图 ├── weather/ # 3D场景组件 │ ├── components/ # 各场景组件 │ │ ├── bridge/ │ │ ├── bush/ │ │ ├── camp/ │ │ └── ... │ ├── index.ts # Weather主类 │ └── word.ts # World场景容器 ├── App.scss ├── App.tsx ├── index.scss └── main.tsx
