# Pipeline API 参考

## 基本用法

```js
import { SlideshowPipeline } from './lib/pipeline.js';

const pipeline = new SlideshowPipeline({
  workdir: '/path/to/project',
  mode: 'narrative',  // 'narrative' | 'showcase'
  requirement: { title: '我的动漫', theme: '...' },
  onPhaseStart: (id, name) => console.log(`▶ ${name}`),
  onPhaseComplete: (id, name, result) => console.log(`✅ ${name}`),
  onReviewReady: (id, name) => console.log(`🔒 审核: ${name}`),
});
```

## 执行阶段

```js
// 执行全部（传入各阶段的执行函数）
await pipeline.run(null, {
  requirement: {
    execute: async (workdir, phase) => {
      // Phase 1 逻辑：生成 requirement.json, pages.json, art_direction.json
      return { description: '需求确认完成', metrics: { pageCount: 8 } };
    }
  },
  scenes: {
    execute: async (workdir, phase) => {
      // Phase 2 逻辑：线稿→渲染
      return { description: '8张场景图', metrics: { sceneCount: 8, retryCount: 1 } };
    },
    // skipReview: true,  // 跳过审核门（不推荐）
  },
});

// 从断点恢复
await pipeline.run('scenes', { scenes: { execute: ... } });

// 只执行单个阶段
await pipeline.runPhase('requirement', {
  execute: async (workdir, phase) => { ... }
});
```

## 查询与回滚

```js
// 查看状态
const status = await pipeline.getStatus();
// → { mode, title, workdir, phases: [...], gitLog: "..." }

// 查看 git 历史
const log = await pipeline.getGitLog(20);

// 回滚到指定阶段（git checkout stage/<name>）
await pipeline.rollback('scenes');
```

## 审核门回调

审核门触发时 pipeline 会调用 `onReviewReady`，外部等待用户确认后继续：

```js
const pipeline = new SlideshowPipeline({
  workdir,
  mode: 'narrative',
  onReviewReady: async (phaseId, phaseName) => {
    // 发送审核内容给用户（图片/视频）
    // 等待用户确认（返回 Promise）
    await waitForUserApproval();
  },
});
```

## Phase 执行函数签名

```js
async function execute(workdir, phase) {
  // workdir: 项目工作目录
  // phase: { id, name, stage, description, review }
  
  // 在 workdir 下生成产物（文件会自动 git commit）
  
  return {
    description: '阶段描述（用于 commit message）',
    metrics: { key: value },  // 可选，用于 commit message
  };
}
```

## 双模式 Phase 对比

| # | 叙事模式 | 展示模式 |
|---|---------|---------|
| 1 | requirement (需求+剧本+美术) | requirement (需求+美术) |
| 2 | characters (角色设计) | — |
| 3 | scenes (场景图) | scenes (场景图) |
| 4 | parallax (旁白TTS+视差) | parallax (视差) |
| 5 | delivery (合成) | delivery (合成) |
