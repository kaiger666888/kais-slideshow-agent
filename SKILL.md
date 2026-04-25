---
name: kais-slideshow-agent
version: 1.0.0
description: "AI Slideshow 短视频全流程自动制作管线。从主题→美术→场景图→DepthFlow视差动效→合成交付，一键生成电影级幻灯片视频。触发词：slideshow agent, 幻灯片制作, AI幻灯片, slideshow管线, slideshow pipeline, AI幻灯片视频, 电影级幻灯片, 视差幻灯片, 2.5D幻灯片, 动态幻灯片, slideshow视频, 生成幻灯片, make slideshow, create slideshow, slideshow video, AI slideshow, slideshow制作, 全自动幻灯片, 一键幻灯片, AI做幻灯片, 幻灯片视频生成, slideshow自动生成, 深度幻灯片, depthflow幻灯片, 电影感幻灯片, 视差幻灯片视频, parallax slideshow, 自动slideshow, AI slideshow maker"
---

# kais-slideshow-agent — AI Slideshow 短视频全流程管线

> 从 kais-movie-agent 提取管线架构和审核门机制，将生成目标从叙事视频转为 slideshow 视频，集成 kais-parallax-scene 的 DepthFlow 视差效果。

## 与 kais-movie-agent 的关系

| 维度 | kais-movie-agent | kais-slideshow-agent |
|------|-----------------|---------------------|
| 目标 | 叙事短片/短剧 | Slideshow 短视频 |
| 剧本 | 完整剧本+分镜 | 主题+页面列表 |
| 角色 | 角色设计+转面图 | 无需角色 |
| 配音 | TTS 多音色 | 可选旁白 |
| 场景 | 多镜头分镜 | 每页一张场景图 |
| 动效 | 视频生成+延长链 | DepthFlow 视差 / Ken Burns |
| 后期 | 字幕+配音+BGM合成 | 文字+BGM合成 |
| 审核门 | 7 个 | 3 个（简化） |

## 与 kais-slideshow 的关系

kais-slideshow 是**手动脚本模板**（用户提供图片→裁剪→动效→合成），kais-slideshow-agent 是**全自动管线**（主题→AI生图→视差→合成），两者互补。

## ⚠️ 强制审核门（Review Gate）

**以下 Phase 完成后必须暂停，展示产出物给用户审核，收到确认后才能继续：**

| Phase | 审核内容 | 展示方式 |
|-------|---------|---------|
| Phase 1 | 需求确认 + 美术方向（mood board） | 发送图片+摘要到当前会话，等用户确认 |
| Phase 2 | 所有场景图（每页渲染图） | 发送图片到当前会话，等用户确认 |
| Phase 3 | 视差效果预览（sample 视频） | 发送视频/截图到当前会话，等用户确认 |

**执行规则：**
1. 到达审核门时，**必须停止执行**，不要继续下一个 Phase
2. 将产出物发送给用户，附上简要说明和审核选项（✅通过 / 🔄重做 / ✏️修改）
3. 使用 `message` 工具发送图片（带 inline buttons 让用户选择）
4. **只有收到用户明确的"通过"回复后，才能执行 git checkpoint 并进入下一阶段**
5. 用户要求重做时，回滚到对应 Phase 重新生成

---

## 管线流程

```
Phase 1: 需求确认 + 美术方向                      → 🔒 REVIEW GATE
  └─ 1.1: 确认主题、页数、风格、分辨率
  └─ 1.2: 美术方向定义（kais-art-direction）
  └─ 1.3: 生成页面列表（每页 prompt + 文字）
Phase 2: 场景图生成                                → 🔒 REVIEW GATE
  └─ 2.1: 线稿生成（sketch-generator.py）
  └─ 2.2: 基于线稿渲染（sketch-to-render.py）
  └─ 2.3: 质量检查（scene-evaluator.py）
Phase 3: 视差动效生成                              → 🔒 REVIEW GATE
  └─ 3.1: DepthFlow 批量视差（推荐）
  └─ 3.2: 或 Ken Burns 动效（备选）
  └─ 3.3: 采样预览（2-3 页效果视频）
Phase 4: 文字叠加 + BGM + 合成交付                  → checkpoint
  └─ 4.1: 文字叠加（PIL）
  └─ 4.2: BGM 匹配（kais-bgm）
  └─ 4.3: FFmpeg 合成
  └─ 4.4: 交付
```

---

## Phase 1：需求确认 + 美术方向

### 1.1 需求确认

与用户确认以下信息：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `title` | Slideshow 标题 | 必填 |
| `theme` | 主题描述 | 必填 |
| `page_count` | 页数 | 5-10 |
| `style` | 视觉风格 | 由美术方向决定 |
| `ratio` | 宽高比 | 9:16（竖版）/ 16:9（横版） |
| `resolution` | 分辨率 | 1080p |
| `parallax_mode` | 视差模式 | depthflow |
| `duration_per_page` | 每页时长(秒) | 4.0 |
| `transition` | 过渡效果 | crossfade 0.5s |
| `narration` | 是否需要旁白 | false |

**输出**：`requirement.json`

### 1.2 美术方向

调用 kais-art-direction 定义视觉风格：
- 色彩调性（温暖/冷调/对比）
- 光影风格
- 画面质感
- 文字风格

**输出**：`art_direction.json` + mood board 图片

### 1.3 生成页面列表

基于主题和美术方向，为每一页生成：
- `prompt`：场景图生成 prompt（英文）
- `text`：叠加文字（标题/描述）
- `effect`：推荐的视差效果（horizontal/zoom/dolly/circle 等）

**输出**：`pages.json`

```json
{
  "pages": [
    {
      "index": 0,
      "prompt": "A serene mountain lake at sunrise, golden light reflecting on crystal clear water, misty mountains in background, photorealistic, cinematic lighting, 8k",
      "text": "晨曦初照",
      "effect": "zoom_in",
      "duration": 4.0
    }
  ]
}
```

---

## Phase 2：场景图生成

### 2.1 线稿生成

使用 movie-agent 的 sketch-generator.py 生成线稿，锁定构图。

```bash
python3 LIB_SCRIPTS/sketch-generator.py \
  --prompt "..." \
  --width 1080 --height 1920 \
  --output assets/sketches/page_00.png
```

### 2.2 基于线稿渲染

使用 sketch-to-render.py，注入美术方向风格：

```bash
python3 LIB_SCRIPTS/sketch-to-render.py \
  --sketch assets/sketches/page_00.png \
  --style-ref art_direction.json \
  --prompt "..." \
  --output assets/scenes/page_00.png
```

### 2.3 质量检查

```bash
python3 LIB_SCRIPTS/scene-evaluator.py \
  --image assets/scenes/page_00.png \
  --mode render \
  --threshold 0.7
```

不合格自动重试（最多 3 次）。

---

## Phase 3：视差动效生成

### 3.1 DepthFlow 批量视差（推荐）

通过 SSH 在 Windows 端执行 DepthFlow：

```bash
ssh -i ~/.ssh/id_windows kai@192.168.71.38 \
  "C:\Python311\Scripts\depthflow.exe input \
    -i C:\Users\kai\page_00.png \
    circle blur vignette h264 main \
    -t 4 -w 1080 -h 1920 \
    -o C:\Users\kai\parallax_page_00.mp4"
```

#### 效果映射

根据页面内容自动选择最佳效果：风景用 `circle blur vignette`，建筑用 `dolly blur`，产品用 `orbital blur`，叙事用 `horizontal vignette`。

> 📖 完整效果预设参考见 [`references/depthflow-presets.md`](references/depthflow-presets.md)

### 3.2 Ken Burns 动效（备选）

当 DepthFlow 不可用时，使用 kais-slideshow 的 MoviePy 动效：

| 效果 | 适用 |
|------|------|
| zoom_in | 产品特写 |
| zoom_out | 风景建筑 |
| pan_left / pan_right | 时间线叙事 |
| pan_up / pan_down | 建筑、天空 |

实现参考 kais-slideshow 的 `make_clip()` 函数。

### 3.3 采样预览

选取 2-3 页（首、中、尾），生成预览视频发送给用户确认效果。

---

## Phase 4：文字叠加 + BGM + 合成交付

### 4.1 文字叠加

使用 PIL 在每帧下方叠加文字：

```python
from PIL import ImageDraw, ImageFont

# 中文字体
font = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", 48)

# 半透明黑底 + 白色居中文字
draw.rectangle([(0, H - 140), (W, H)], fill=(0, 0, 0, 160))
draw.text(((W - tw) // 2, H - 110), text, fill=(255, 255, 255), font=font)
```

**注意**：必须使用支持中文的字体。

### 4.2 BGM 匹配

调用 kais-bgm 自动匹配背景音乐：

```bash
cd ~/.openclaw/workspace/skills/kais-bgm
node -e "
import { selectBGM } from './lib/bgm-selector.js';
import { readFileSync } from 'node:fs';
const lib = JSON.parse(readFileSync('./lib/bgm-library.json'));
const results = selectBGM('<主题描述>', '<情感标签>', lib, { topN: 3, minDuration: 15, maxDuration: 60 });
for (const r of results) {
  console.log('[' + r.score + '分]', r.filename, '| 时长:', r.duration.toFixed(1) + 's');
}
"
```

### 4.3 FFmpeg 合成

```bash
# 拼接所有视差视频 + 交叉淡入淡出
ffmpeg -y \
  -i parallax_page_00.mp4 -i parallax_page_01.mp4 ... \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=3.5[v01];..." \
  -map "[vfinal]" output_no_audio.mp4

# 添加 BGM
ffmpeg -y -i output_no_audio.mp4 -i bgm.mp3 \
  -filter_complex "[1:a]afade=t=in:st=0:d=1,afade=t=out:st=${total_dur-1}:d=1,atrim=0:${total_dur}[bgm]" \
  -map 0:v -map "[bgm]" -c:v copy -c:a aac -b:a 192k output.mp4
```

### 4.4 交付

通过 message tool 以 document 形式发送最终视频。

---

## Git 版本管理

复用 kais-movie-agent 的 git-stage-manager.js，适配 slideshow 阶段：

```bash
# 初始化
node lib/git-stage-manager.js init <workdir>

# Phase 完成后 checkpoint
node lib/git-stage-manager.js checkpoint <workdir> requirement
node lib/git-stage-manager.js checkpoint <workdir> scenes
node lib/git-stage-manager.js checkpoint <workdir> parallax
node lib/git-stage-manager.js checkpoint <workdir> delivery

# 查看历史
node lib/git-stage-manager.js log <workdir>

# 回滚
node lib/git-stage-manager.js rollback <workdir> scenes
```

### Stage 映射

| Stage Name | Phase | 产出文件 |
|------------|-------|---------|
| `requirement` | 1 | requirement.json, art_direction.json, pages.json |
| `scenes` | 2 | assets/sketches/*.png, assets/scenes/*.png |
| `parallax` | 3 | assets/parallax/*.mp4 |
| `delivery` | 4 | output/final.mp4 |

---

## 线稿控制（Phase 2）

⚠️ **强制规则：所有页面必须先线稿后渲染，无例外。** 质量优先。

线稿锁定构图 → 渲染释放风格。跳过线稿直接渲染会导致构图崩坏。

---

## 子 Skill 列表

| Skill | Phase | 功能 |
|-------|-------|------|
| kais-art-direction | 1.2 | 美术方向/视觉风格定义 |
| kais-scene-designer | 2 | 场景图生成（即梦 API） |
| kais-parallax-scene | 3 | DepthFlow 视差 / AI三步法分层 |
| kais-slideshow | 3.2 | Ken Burns 动效（备选） |
| kais-bgm | 4.2 | BGM 匹配选择 |
| kais-voice | 可选 | 旁白 TTS |
| kais-anatomy-guard | 2 | 肢体解剖检测（如场景含人物） |

## 共享工具

复用 kais-movie-agent 的工具（symlink 或 copy）：

| 工具 | 来源 | 功能 |
|------|------|------|
| sketch-generator.py | kais-movie-agent/lib/scripts/ | 线稿生成 |
| sketch-to-render.py | kais-movie-agent/lib/scripts/ | 线稿→渲染 |
| scene-evaluator.py | kais-movie-agent/lib/scripts/ | 场景图评价 |
| anatomy-validator.py | kais-movie-agent/lib/scripts/ | 解剖质量检测 |
| jimeng-client.js | kais-movie-agent/lib/ | 即梦 API 客户端 |
| git-stage-manager.js | kais-movie-agent/lib/ | Git 阶段版本管理 |
| quality-gate.js | kais-movie-agent/lib/ | 质量门控 |

## 环境变量

- `JIMENG_SESSION_ID`: 即梦 session ID
- `JIMENG_API_URL`: 即梦 API 地址（默认 http://localhost:8000）
- `ZHIPU_API_KEY`: 智谱 API Key（TTS 旁白）

## 项目工作目录结构

运行时在 `<workdir>` 下创建：

```
<workdir>/
├── requirement.json          # Phase 1 产出
├── art_direction.json        # Phase 1 产出
├── pages.json                # Phase 1 产出
├── assets/
│   ├── sketches/             # Phase 2 线稿
│   │   ├── page_00.png
│   │   └── ...
│   ├── scenes/               # Phase 2 渲染图
│   │   ├── page_00.png
│   │   └── ...
│   └── parallax/             # Phase 3 视差视频
│       ├── parallax_00.mp4
│       └── ...
└── output/
    └── final.mp4             # Phase 4 最终交付
```

## Skill 文件结构

```
kais-slideshow-agent/
├── SKILL.md
├── lib/                      # 共享工具（symlink → kais-movie-agent）
├── scripts/
│   ├── generate_pages.py     # 生成页面列表
│   ├── batch_depthflow.sh    # DepthFlow 批量视差
│   └── compose_final.sh      # 最终合成
└── references/
    └── depthflow-presets.md  # DepthFlow 效果预设参考
```

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
3. **采样预览** — 批量生成前先看 2-3 页效果
4. **BGM 淡入淡出** — 首尾各 1s
5. **Git checkpoint** — 每个 Phase 完成后打点
