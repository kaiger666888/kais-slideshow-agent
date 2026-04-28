---
name: kais-slideshow-agent
version: 1.1.0
description: "AI Slideshow 短视频全流程自动制作管线。支持两种模式：(1)叙事模式：剧本+角色+场景→AI动漫/视觉小说 slideshow；(2)展示模式：主题→场景→DepthFlow视差→电影级 slideshow。从需求→美术→场景→视差→合成交付，审核门+Git版本管理。触发词：slideshow agent, 幻灯片制作, AI幻灯片, slideshow管线, slideshow pipeline, AI幻灯片视频, 电影级幻灯片, 视差幻灯片, 2.5D幻灯片, 动态幻灯片, slideshow视频, 生成幻灯片, make slideshow, create slideshow, slideshow video, AI slideshow, slideshow制作, 全自动幻灯片, 一键幻灯片, AI做幻灯片, 幻灯片视频生成, slideshow自动生成, 深度幻灯片, depthflow幻灯片, 电影感幻灯片, 视差幻灯片视频, parallax slideshow, 自动slideshow, AI slideshow maker, AI动漫幻灯片, 动漫slideshow, 视觉小说slideshow, story slideshow, 叙事幻灯片, AI动漫制作, 动漫制作, visual novel slideshow"
---

# kais-slideshow-agent — AI Slideshow 短视频全流程管线

> 从 kais-movie-agent 提取管线架构，将视频生成替换为 DepthFlow 视差动效，保留剧本/角色/旁白等叙事能力，集成 kais-parallax-scene。

## 两种模式

| 维度 | 🎬 叙事模式 | 🖼️ 展示模式 |
|------|-----------|-----------|
| 适用 | AI动漫、视觉小说、故事绘本、知识科普 | 产品展示、旅行记录、品牌宣传 |
| Phase 1 | 需求+剧本大纲+角色 | 需求+美术方向 |
| Phase 2 | 角色设计+场景图 | 场景图 |
| Phase 3 | 旁白TTS+视差动效 | 视差动效 |
| Phase 4 | 字幕+配音+BGM合成 | 文字+BGM合成 |
| 审核门 | 4 个 | 3 个 |

**自动判断**：用户提供故事/剧本/角色 → 叙事模式；提供主题/图片 → 展示模式。也可在需求确认时显式选择。

## 与 kais-movie-agent 的关系

| 维度 | movie-agent | slideshow-agent |
|------|------------|----------------|
| 动效 | Seedance 视频生成+延长链 | DepthFlow 视差 / Ken Burns |
| 分镜 | 完整分镜板+镜头规划 | 每页一张场景图 |
| 配音 | TTS 多角色+对白 | TTS 旁白（可选） |
| 后期 | 字幕+配音+BGM混流 | 文字叠加+BGM合成 |
| 管线复杂度 | 8 Phase + 7 审核门 | 4 Phase + 3-4 审核门 |

**保留的核心能力**：剧本编写、角色设计、美术方向、线稿→渲染、质量门控、Git 版本管理、审核门机制。

**移除的能力**：分镜板（slideshow 无需多镜头）、延长链（视差替代视频生成）、拍摄手法规划。

## ⚠️ 强制审核门（Review Gate）

| Phase | 审核内容 | 模式 | 展示方式 |
|-------|---------|------|---------|
| Phase 1 | 剧本+角色+美术方向 / 美术方向 | 两者 | 发送图片+摘要，等确认 |
| Phase 2 | 角色设计图+场景图 / 场景图 | 两者 | 发送图片，等确认 |
| Phase 3 | 旁白试听+视差预览 / 视差预览 | 两者 | 发送视频/音频，等确认 |

**执行规则**：
1. 到达审核门时**必须停止**，不要继续下一个 Phase
2. 发送产出物 + 审核选项（✅通过 / 🔄重做 / ✏️修改）
3. **只有收到用户明确的"通过"后**，才能 git checkpoint 并进入下一阶段

---

## 管线流程

### 🎬 叙事模式

```
Phase 1: 需求确认 + 剧本 + 美术方向                 → 🔒 REVIEW GATE
  └─ 1.1: 需求确认（标题/页数/风格/分辨率）
  └─ 1.2: 剧本大纲（kais-scenario-writer，输出页面级剧本）
  └─ 1.3: 角色定义（角色名/外貌/性格，可选角色设计图）
  └─ 1.4: 美术方向（kais-art-direction）
Phase 2: 角色设计 + 场景图生成                       → 🔒 REVIEW GATE
  └─ 2.1: 角色设计图（kais-character-designer）
  └─ 2.2: 场景线稿→渲染（sketch-generator → sketch-to-render）
  └─ 2.3: 质量检查（scene-evaluator + anatomy-validator）
Phase 3: 旁白TTS + 视差动效                          → 🔒 REVIEW GATE
  └─ 3.1: 旁白TTS生成（kais-voice，每页旁白音频）
  └─ 3.2: DepthFlow 批量视差 / Ken Burns 备选
  └─ 3.3: 采样预览（2-3 页效果视频+旁白）
Phase 4: 字幕 + BGM + 合成交付                        → checkpoint
  └─ 4.1: 字幕叠加（旁白字幕+场景标题）
  └─ 4.2: BGM 匹配（kais-bgm）
  └─ 4.3: FFmpeg 合成（视差视频+旁白+BGM）
  └─ 4.4: 交付
```

### 🖼️ 展示模式

```
Phase 1: 需求确认 + 美术方向                         → 🔒 REVIEW GATE
  └─ 1.1: 需求确认（标题/主题/页数/风格/分辨率）
  └─ 1.2: 美术方向（kais-art-direction）
  └─ 1.3: 生成页面列表（每页 prompt + 文字 + 效果）
Phase 2: 场景图生成                                  → 🔒 REVIEW GATE
  └─ 2.1: 线稿生成（sketch-generator.py）
  └─ 2.2: 基于线稿渲染（sketch-to-render.py）
  └─ 2.3: 质量检查（scene-evaluator.py）
Phase 3: 视差动效生成                                → 🔒 REVIEW GATE
  └─ 3.1: DepthFlow 批量视差（推荐）
  └─ 3.2: Ken Burns 动效（备选）
  └─ 3.3: 采样预览
Phase 4: 文字叠加 + BGM + 合成交付                    → checkpoint
  └─ 4.1: 文字叠加（PIL）
  └─ 4.2: BGM 匹配（kais-bgm）
  └─ 4.3: FFmpeg 合成
  └─ 4.4: 交付
```

---

## Phase 1：需求确认 + 剧本 + 美术方向

### 1.1 需求确认

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `title` | 标题 | 必填 |
| `mode` | narrative / showcase | 自动判断 |
| `theme` | 主题/故事概要 | 必填 |
| `page_count` | 页数 | 6-12（叙事）/ 5-10（展示） |
| `ratio` | 宽高比 | 9:16 / 16:9 |
| `resolution` | 分辨率 | 1080p |
| `parallax_mode` | 视差模式 | depthflow |
| `duration_per_page` | 每页时长(秒) | 4.0 |
| `narration` | 是否需要旁白 | 叙事模式默认 true |

### 1.2 剧本大纲（叙事模式）

调用 kais-scenario-writer，输出**页面级剧本**（非分镜）：

```json
{
  "pages": [
    {
      "index": 0,
      "scene": "清晨的森林小径，阳光透过树叶洒下斑驳光影",
      "narration": "在一个宁静的清晨，少女小雪踏上了前往迷雾森林的旅程...",
      "characters": ["小雪"],
      "emotion": "宁静、期待",
      "visual_intent": "温暖晨光，森林氛围",
      "prompt": "A young girl walking on a forest path at sunrise, golden light filtering through leaves, anime style, Studio Ghibli inspired, soft colors, 8k",
      "text": "第一章：启程",
      "effect": "horizontal vignette",
      "duration": 5.0
    }
  ],
  "characters": [
    { "name": "小雪", "description": "15岁少女，银色短发，蓝色眼睛，穿白色连衣裙" }
  ]
}
```

**与 movie-agent 的区别**：不需要分镜（每页就是一张场景图），但保留 `narration`（旁白）、`characters`（角色）、`emotion`（情绪）字段。

### 1.3 角色定义（叙事模式）

- **轻量级**：剧本中直接定义角色外貌描述，无需单独角色设计图
- **完整级**：调用 kais-character-designer 生成角色参考图（转面图），用于场景图生成时的角色一致性

用户在 Phase 1 审核门选择级别。

### 1.4 美术方向

调用 kais-art-direction 定义视觉风格。叙事模式额外提供风格参考（如"吉卜力风格""新海诚风格""赛博朋克"）。

**输出**：`art_direction.json` + mood board 图片

---

## Phase 2：角色设计 + 场景图生成

### 2.1 角色设计（叙事模式，可选）

如果 Phase 1 选择了完整级角色设计：
- 调用 kais-character-designer 生成角色转面图
- 角色参考图注入场景图 prompt（`--style-ref`）

### 2.2 场景线稿→渲染

```bash
# 线稿
python3 LIB_SCRIPTS/sketch-generator.py \
  --prompt "..." --width 1080 --height 1920 \
  --output assets/sketches/page_00.png

# 渲染（注入美术方向+角色参考）
python3 LIB_SCRIPTS/sketch-to-render.py \
  --sketch assets/sketches/page_00.png \
  --style-ref art_direction.json \
  --character-ref assets/characters/xiaoxue.png \
  --prompt "..." \
  --output assets/scenes/page_00.png
```

⚠️ **强制规则：所有页面必须先线稿后渲染，无例外。**

### 2.3 质量检查

```bash
python3 LIB_SCRIPTS/scene-evaluator.py --image assets/scenes/page_00.png --mode render --threshold 0.7
# 含人物时额外检查
python3 LIB_SCRIPTS/anatomy-validator.py assets/scenes/page_00.png --mode full --threshold 0.6
```

不合格自动重试（最多 3 次）。

---

## Phase 3：旁白TTS + 视差动效

### 3.1 旁白TTS（叙事模式）

调用 kais-voice 为每页生成旁白音频：

```bash
# 每页旁白
python3 lib/tts_generate.py \
  --text "在一个宁静的清晨..." \
  --voice "温柔女声" \
  --output assets/tts/page_00.wav
```

**旁白时长决定页面时长**：`page_duration = max(narration_audio_duration + 1.0, 3.0)`

### 3.2 DepthFlow 批量视差

通过 SSH 在 Windows 端执行：

```bash
ssh -i ~/.ssh/id_windows kai@192.168.71.38 \
  "C:\Python311\Scripts\depthflow.exe input \
    -i C:\Users\kai\page_00.png \
    circle blur vignette h264 main \
    -t 5 -w 1080 -h 1920 \
    -o C:\Users\kai\parallax_page_00.mp4"
```

根据页面内容自动选择效果：风景用 `circle blur vignette`，建筑用 `dolly blur`，叙事推进用 `horizontal vignette`。

> 📖 完整效果预设参考见 [`references/depthflow-presets.md`](references/depthflow-presets.md)

### 3.3 采样预览

选取 2-3 页（首、中、尾），生成预览视频（叙事模式叠加旁白）发送给用户确认。

---

## Phase 4：合成与交付

### 4.1 字幕叠加（叙事模式）

旁白字幕 + 场景标题，使用 PIL：

```python
font = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", 48)
# 半透明黑底 + 白色居中文字
draw.rectangle([(0, H - 140), (W, H)], fill=(0, 0, 0, 160))
draw.text(((W - tw) // 2, H - 110), text, fill=(255, 255, 255), font=font)
```

### 4.2 BGM 匹配

调用 kais-bgm 自动匹配。叙事模式根据情绪曲线匹配（开场轻柔→高潮激昂→结尾收束）。

### 4.3 FFmpeg 合成

拼接视差视频 + 叠加旁白/BGM。具体命令见 `scripts/compose_final.sh`。

### 4.4 交付

通过 message tool 以 document 形式发送最终视频。

---

## 管线编排器（pipeline.js）

### 自动 Git 持久化

每个项目 workdir 首次运行时自动 `git init`（无需远程仓库），每阶段完成后 `git add -A && git commit`，**提交所有产物**（图片、音频、视频、JSON）。支持 `git tag` 定位 + `rollback` 回滚。

> 📖 完整 API 用法（JS API + 审核门回调 + Phase 执行函数签名）见 [`references/pipeline-api.md`](references/pipeline-api.md)

### CLI

```bash
node lib/pipeline.js init <workdir>              # 初始化 git
node lib/pipeline.js status --workdir <dir>      # 查看状态
node lib/pipeline.js log --workdir <dir>         # git 历史
node lib/pipeline.js rollback <stage>            # 回滚
node lib/pipeline.js checkpoint <stage> [desc]   # 手动打点
```

### Stage 映射

| Stage | Phase | 产出 |
|-------|-------|------|
| `requirement` | 1 | requirement.json, pages.json, art_direction.json, characters.json |
| `characters` | 2 | assets/characters/ |
| `scenes` | 3 | assets/sketches/, assets/scenes/ |
| `parallax` | 4 | assets/parallax/, assets/tts/ |
| `delivery` | 5 | output/final.mp4 |

---

## 子 Skill 列表

| Skill | Phase | 功能 | 模式 |
|-------|-------|------|------|
| kais-scenario-writer | 1.2 | 剧本/页面级剧本编写 | 叙事 |
| kais-character-designer | 2.1 | 角色设计+参考图 | 叙事(可选) |
| kais-art-direction | 1.4 | 美术方向定义 | 两者 |
| kais-scene-designer | 2.2 | 场景图生成 | 两者 |
| kais-parallax-scene | 3.2 | DepthFlow 视差 | 两者 |
| kais-slideshow | 3.2 | Ken Burns 备选 | 两者 |
| kais-voice | 3.1 | 旁白 TTS | 叙事 |
| kais-bgm | 4.2 | BGM 匹配 | 两者 |
| kais-anatomy-guard | 2.3 | 肢体解剖检测 | 两者(含人物) |

## 共享工具

| 工具 | 来源 | 功能 |
|------|------|------|
| pipeline.js | 本 skill | 管线编排器（自动 git checkpoint/rollback） |
| jimeng-client.js | kais-movie-agent/lib/ | 即梦 API 客户端 |
| quality-gate.js | kais-movie-agent/lib/ | 质量门控 |
| sketch-generator.py | kais-movie-agent/lib/scripts/ | 线稿生成 |
| sketch-to-render.py | kais-movie-agent/lib/scripts/ | 线稿→渲染 |
| scene-evaluator.py | kais-movie-agent/lib/scripts/ | 场景图评价 |
| anatomy-validator.py | kais-movie-agent/lib/scripts/ | 解剖质量检测 |

## 环境变量

- `JIMENG_SESSION_ID`: 即梦 session ID
- `JIMENG_API_URL`: 即梦 API 地址（默认 http://localhost:8000）
- `ZHIPU_API_KEY`: 智谱 API Key（TTS 旁白）

## 项目持久化目录

默认路径 `~/Projects/slideshow/<project-name>/<YYYYMMDD-HHMM>/`，用 `createWorkdir()` 自动生成：

```
~/Projects/slideshow/
└── spring-story/
    └── 20260428-1340/
        ├── requirement.json      # Phase 1
        ├── pages.json            # Phase 1（页面级剧本/列表）
        ├── art_direction.json    # Phase 1
        ├── characters.json       # Phase 1（叙事模式）
        ├── .pipeline-state.json  # 管线状态
        ├── assets/
        │   ├── characters/       # 角色参考图
        │   ├── sketches/         # 线稿
        │   ├── scenes/           # 渲染图
        │   ├── parallax/         # 视差视频
        │   └── tts/              # 旁白音频
        └── output/
            └── slideshow_final.mp4
```

同一项目多次迭代产生多个时间戳目录，互不干扰。

## 教训与最佳实践

### ❌ 不要做的事
1. **不要跳过线稿直接渲染** — 构图崩坏
2. **不要用 ffmpeg zoompan 做动效** — 图片变形
3. **不要所有页面用同一效果** — 单调乏味
4. **不要用不支持中文的字体** — 显示方框
5. **不要跳过审核门** — 积分浪费

### ✅ 推荐做法
1. **效果多样化** — 交替使用不同视差效果
2. **质量优先** — 不考虑积分成本
3. **采样预览** — 批量生成前先看 2-3 页
4. **旁白驱动时长** — 叙事模式根据旁白时长调整页面时长
5. **BGM 情绪匹配** — 叙事模式根据情绪曲线选 BGM
6. **Git checkpoint** — 每个 Phase 完成后打点
