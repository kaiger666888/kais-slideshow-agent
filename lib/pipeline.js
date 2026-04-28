/**
 * kais-slideshow-pipeline — Slideshow 管线编排器
 * 简化版 kais-movie-agent pipeline，适配 slideshow 双模式（叙事/展示）
 * 本机 git init，无需远程仓库，每阶段 commit 产物持久化
 */
import { execFile } from 'node:child_process';
import { writeFile, readFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { homedir } from 'node:os';

// ─── 默认持久化目录 ──────────────────────────────────────

export const DEFAULT_PROJECT_ROOT = join(homedir(), 'Projects', 'slideshow');

/**
 * 生成标准 workdir 路径：~/Projects/slideshow/<project>/<timestamp>
 * @param {string} projectName - 项目名（小写英文+连字符）
 * @param {string} [timestamp] - 时间戳（默认当前时间 YYYYMMDD-HHMM）
 */
export function createWorkdir(projectName, timestamp) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = timestamp || `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return join(DEFAULT_PROJECT_ROOT, projectName, ts);
}

// ─── Stage 定义 ──────────────────────────────────────────

const STAGES = {
  requirement:  { label: '需求确认',     order: 1 },
  characters:   { label: '角色设计',     order: 2 },  // 叙事模式
  scenes:       { label: '场景图生成',   order: 3 },
  parallax:     { label: '视差动效',     order: 4 },
  delivery:     { label: '合成交付',     order: 5 },
};

const STAGE_ORDER = Object.entries(STAGES).sort((a, b) => a[1].order - b[1].order).map(([k]) => k);

// ─── Git 辅助（内联，不依赖外部 git-stage-manager）────────

function git(workdir, ...args) {
  return new Promise((resolve, reject) => {
    execFile('git', ['-C', workdir, ...args], { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && !stdout) return reject(new Error(`git failed: ${stderr || err.message}`));
      resolve(stdout.trim());
    });
  });
}

async function gitInit(workdir) {
  try {
    await git(workdir, 'rev-parse', '--git-dir');
  } catch {
    await git(workdir, 'init');
    // 创建 .gitignore
    const ignore = [
      'node_modules/', '__pycache__/', '*.pyc', '*.pyo',
      '.pipeline-state.json', '.DS_Store', '*.tmp',
    ].join('\n') + '\n';
    await writeFile(join(workdir, '.gitignore'), ignore);
    await git(workdir, 'add', '.gitignore');
    await git(workdir, 'commit', '-m', '🚀 项目初始化');
    console.log(`[git] ✅ 初始化仓库: ${workdir}`);
  }
}

async function gitCheckpoint(workdir, stage, description = '', metrics = {}) {
  await gitInit(workdir);
  // Add all changes (including binary: images, audio, video)
  await git(workdir, 'add', '-A');
  // Check if there are changes to commit
  try {
    const status = await git(workdir, 'status', '--porcelain');
    if (!status) {
      console.log(`[git] ⏭️ ${stage}: 无变更，跳过 commit`);
      return;
    }
  } catch { /* first commit after init */ }

  const stageInfo = STAGES[stage] || { label: stage };
  const metricStr = Object.entries(metrics).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join(', ');
  const msg = `[${stageInfo.order}] ${stageInfo.label}${description ? ' · ' + description : ''}${metricStr ? ' (' + metricStr + ')' : ''}`;

  await git(workdir, 'commit', '-m', msg);
  console.log(`[git] ✅ checkpoint: ${msg}`);

  // Tag for easy rollback
  const tag = `stage/${stage}`;
  try { await git(workdir, 'tag', '-f', tag); } catch { /* ignore */ }
}

async function gitRollback(workdir, stage) {
  const tag = `stage/${stage}`;
  try {
    await git(workdir, 'checkout', tag, '--', '.');
    console.log(`[git] ⏪ 回滚到: ${stage}`);
  } catch {
    throw new Error(`无法回滚到 ${stage}: tag stage/${stage} 不存在`);
  }
}

async function gitLog(workdir, limit = 20) {
  try {
    return await git(workdir, 'log', `--oneline`, `-${limit}`);
  } catch {
    return '(无 git 历史)';
  }
}

// ─── Phase 定义（双模式）─────────────────────────────────

const PHASES_NARRATIVE = [
  { id: 'requirement', name: '需求确认+剧本+美术', stage: 'requirement', review: true,
    description: '确认需求、生成剧本大纲、定义美术方向' },
  { id: 'characters', name: '角色设计', stage: 'characters', review: true,
    description: '生成角色设计图和参考图' },
  { id: 'scenes', name: '场景图生成', stage: 'scenes', review: true,
    description: '线稿→渲染，所有页面场景图' },
  { id: 'parallax', name: '旁白TTS+视差动效', stage: 'parallax', review: true,
    description: '生成旁白音频和 DepthFlow 视差视频' },
  { id: 'delivery', name: '合成与交付', stage: 'delivery', review: false,
    description: '字幕+BGM+最终合成' },
];

const PHASES_SHOWCASE = [
  { id: 'requirement', name: '需求确认+美术', stage: 'requirement', review: true,
    description: '确认需求、定义美术方向、生成页面列表' },
  { id: 'scenes', name: '场景图生成', stage: 'scenes', review: true,
    description: '线稿→渲染，所有页面场景图' },
  { id: 'parallax', name: '视差动效', stage: 'parallax', review: true,
    description: 'DepthFlow 批量视差视频生成' },
  { id: 'delivery', name: '合成与交付', stage: 'delivery', review: false,
    description: '文字叠加+BGM+最终合成' },
];

function getPhases(mode) {
  return mode === 'narrative' ? PHASES_NARRATIVE : PHASES_SHOWCASE;
}

// ─── Pipeline 类 ─────────────────────────────────────────

export class SlideshowPipeline {
  /**
   * @param {Object} config
   * @param {string} config.workdir - 项目工作目录（自动 git init）
   * @param {string} config.mode - 'narrative' | 'showcase'
   * @param {Object} config.requirement - 需求配置
   * @param {Function} [config.onPhaseStart] - phase开始回调 (phaseId, phaseName) => void
   * @param {Function} [config.onPhaseComplete] - phase完成回调 (phaseId, phaseName, result) => void
   * @param {Function} [config.onPhaseFail] - phase失败回调 (phaseId, error) => void
   * @param {Function} [config.onReviewReady] - 审核门回调 (phaseId, phaseName) => void
   */
  constructor(config) {
    this.workdir = config.workdir || process.cwd();
    this.mode = config.mode || 'showcase';
    this.requirement = config.requirement || {};
    this.onPhaseStart = config.onPhaseStart || null;
    this.onPhaseComplete = config.onPhaseComplete || null;
    this.onPhaseFail = config.onPhaseFail || null;
    this.onReviewReady = config.onReviewReady || null;
    this._phases = getPhases(this.mode);
  }

  // ─── 状态管理 ──────────────────────────────────────────

  async _loadState() {
    try {
      return JSON.parse(await readFile(join(this.workdir, '.pipeline-state.json'), 'utf-8'));
    } catch {
      return {
        mode: this.mode,
        title: this.requirement.title || 'untitled',
        phases: {},
        currentPhaseId: null,
        startedAt: null,
        completedAt: null,
      };
    }
  }

  async _saveState(state) {
    await writeFile(join(this.workdir, '.pipeline-state.json'), JSON.stringify(state, null, 2));
  }

  // ─── 核心：执行单个 Phase ──────────────────────────────

  /**
   * 执行单个 Phase
   * @param {string} phaseId - Phase ID
   * @param {Object} options
   * @param {Function} [options.execute] - 执行函数 (workdir, phase) => Promise<{metrics?, description?}>
   * @param {boolean} [options.skipReview] - 跳过审核门
   * @returns {Object} 执行结果
   */
  async runPhase(phaseId, options = {}) {
    const phase = this._phases.find(p => p.id === phaseId);
    if (!phase) throw new Error(`未知阶段: ${phaseId}（当前模式: ${this.mode}）`);

    const state = await this._loadState();
    this.onPhaseStart?.(phaseId, phase.name);

    try {
      // 确保工作目录存在
      await mkdir(this.workdir, { recursive: true });

      // 执行阶段逻辑
      let result = {};
      if (options.execute) {
        result = await options.execute(this.workdir, phase);
      }

      // 更新状态
      state.phases[phaseId] = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        mode: this.mode,
        ...result,
      };
      state.currentPhaseId = phaseId;
      await this._saveState(state);

      // Git checkpoint（提交所有产物）
      await gitCheckpoint(this.workdir, phase.stage, result.description || phase.description, result.metrics);

      // 审核门
      if (phase.review && !options.skipReview) {
        this.onReviewReady?.(phaseId, phase.name);
        // Pipeline 暂停，等待外部确认
        // 外部调用 checkpoint() 后继续下一阶段
      }

      this.onPhaseComplete?.(phaseId, phase.name, result);
      return result;

    } catch (error) {
      state.phases[phaseId] = {
        status: 'failed',
        failedAt: new Date().toISOString(),
        error: error.message,
      };
      await this._saveState(state);
      this.onPhaseFail?.(phaseId, error);
      throw error;
    }
  }

  // ─── 批量执行（从指定阶段开始）────────────────────────

  /**
   * 从指定阶段开始执行所有后续阶段
   * @param {string} [fromPhaseId] - 起始阶段（默认第一个）
   * @param {Object} phaseExecutors - { phaseId: { execute: Function, skipReview?: boolean } }
   */
  async run(fromPhaseId, phaseExecutors = {}) {
    const state = await this._loadState();
    state.startedAt = state.startedAt || new Date().toISOString();
    await this._saveState(state);

    const startIdx = fromPhaseId
      ? this._phases.findIndex(p => p.id === fromPhaseId)
      : 0;

    if (startIdx === -1) throw new Error(`未知阶段: ${fromPhaseId}`);

    const results = {};
    for (let i = startIdx; i < this._phases.length; i++) {
      const phase = this._phases[i];
      const executor = phaseExecutors[phase.id] || {};
      try {
        results[phase.id] = await this.runPhase(phase.id, executor);
      } catch (error) {
        results[phase.id] = { error: error.message };
        console.error(`[pipeline] ❌ ${phase.name} 失败: ${error.message}`);
        break;
      }
    }

    state.completedAt = new Date().toISOString();
    await this._saveState(state);
    return results;
  }

  // ─── 查询 ─────────────────────────────────────────────

  async getStatus() {
    const state = await this._loadState();
    return {
      mode: this.mode,
      title: state.title,
      workdir: this.workdir,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      phases: this._phases.map(p => ({
        id: p.id,
        name: p.name,
        stage: p.stage,
        review: p.review,
        status: state.phases[p.id]?.status || 'pending',
        completedAt: state.phases[p.id]?.completedAt || null,
      })),
      gitLog: await gitLog(this.workdir, 10),
    };
  }

  async getGitLog(limit = 20) {
    return gitLog(this.workdir, limit);
  }

  // ─── 回滚 ─────────────────────────────────────────────

  async rollback(stage) {
    await gitRollback(this.workdir, stage);
    // 更新状态：标记回滚后的阶段为 pending
    const state = await this._loadState();
    const stageOrder = STAGES[stage]?.order || 0;
    for (const [phaseId, phaseState] of Object.entries(state.phases)) {
      const phase = this._phases.find(p => p.id === phaseId);
      if (phase && STAGES[phase.stage]?.order >= stageOrder) {
        phaseState.status = 'rolled-back';
      }
    }
    await this._saveState(state);
  }

  // ─── 静态方法 ─────────────────────────────────────────

  static getPhases(mode) { return getPhases(mode); }

  static getStages() { return STAGES; }

  static getStageOrder() { return STAGE_ORDER; }
}

// ─── CLI ─────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const workdir = args.find((a, i) => args[i - 1] === '--workdir') || process.cwd();

  switch (cmd) {
    case 'init':
      await gitInit(workdir);
      break;
    case 'status':
      const pipeline = new SlideshowPipeline({ workdir, mode: 'showcase' });
      const status = await pipeline.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
    case 'log':
      console.log(await gitLog(workdir, parseInt(args[1]) || 20));
      break;
    case 'rollback':
      if (!args[1]) { console.error('用法: rollback <stage>'); process.exit(1); }
      await gitRollback(workdir, args[1]);
      break;
    case 'checkpoint':
      if (!args[1]) { console.error('用法: checkpoint <stage> [description]'); process.exit(1); }
      await gitCheckpoint(workdir, args[1], args[2] || '');
      break;
    default:
      console.log(`kais-slideshow-pipeline CLI

用法:
  node pipeline.js init --workdir <dir>          初始化 git 仓库
  node pipeline.js status --workdir <dir>        查看管线状态
  node pipeline.js log --workdir <dir> [n]       查看 git 日志
  node pipeline.js checkpoint <stage> [desc]     手动 checkpoint
  node pipeline.js rollback <stage>              回滚到指定阶段

阶段: ${STAGE_ORDER.join(', ')}

模式:
  narrative  - 叙事模式（剧本+角色+旁白）
  showcase   - 展示模式（主题+场景+视差）`);
  }
}

// 仅直接运行时执行 CLI
const isDirectRun = process.argv[1]?.endsWith('pipeline.js');
if (isDirectRun) main().catch(e => { console.error(e); process.exit(1); });

export default SlideshowPipeline;
