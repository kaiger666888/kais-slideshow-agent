# DepthFlow 效果预设参考

> 来自 kais-parallax-scene 的实测数据（RTX 3060 Ti）

## 基础动画（6种）

| 预设 | 运动 | 适用场景 |
|------|------|----------|
| `horizontal` | 水平平移 | 场景展示、交代环境 |
| `vertical` | 垂直移动 | 建筑、瀑布 |
| `zoom` | 缩放 | 聚焦主体、情绪递进 |
| `dolly` | 推拉变焦 | 希区柯克眩晕感 |
| `circle` | 圆弧运动 | 3D旋转展示 |
| `orbital` | 轨道环绕 | 产品展示、360° |

## 后处理（可叠加）

| 效果 | 说明 |
|------|------|
| `blur` | 深度感知景深虚化（DOF） |
| `vignette` | 边缘暗角，电影感 |
| `lens` | 镜头畸变，戏剧性 |
| `colors` | 自动调色 |

## 推荐组合

| 场景类型 | CLI |
|----------|-----|
| 电影级场景 | `circle blur vignette` |
| 希区柯克 | `dolly blur` |
| 产品展示 | `orbital blur` |
| 经典电影 | `horizontal vignette` |
| 冲击力 | `zoom lens` |
| 画质拉满 | `realesr circle blur vignette` |

## CLI 模板

```bash
ssh -i ~/.ssh/id_windows kai@192.168.71.38 \
  "C:\Python311\Scripts\depthflow.exe input \
    -i C:\Users\kai\IMAGE.png \
    {EFFECT} h264 main \
    -t 4 -w 1080 -h 1920 \
    -o C:\Users\kai\OUTPUT.mp4"
```

## 注意事项

- SSH 会话用 `h264`（非 `h264-nvenc`）
- 首次运行自动下载 DepthAnything V2 模型（~80s）
- `-d` 可指定自定义深度图
- `--intensity` 调整全局强度（0-4）
