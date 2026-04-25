#!/usr/bin/env bash
# 最终合成：拼接所有视差视频 + 文字叠加 + BGM
set -euo pipefail

usage() {
    echo "用法: $0 --workdir <dir> [--bgm <bgm_path>] [--output <output.mp4>]"
    exit 1
}

WORKDIR=""
BGM=""
OUTPUT="final.mp4"

while [[ $# -gt 0 ]]; do
    case $1 in
        --workdir) WORKDIR="$2"; shift 2 ;;
        --bgm) BGM="$2"; shift 2 ;;
        --output) OUTPUT="$2"; shift 2 ;;
        --help) usage ;;
        *) echo "未知参数: $1"; usage ;;
    esac
done

if [[ -z "$WORKDIR" ]]; then
    echo "❌ 必须指定 --workdir"
    usage
fi

PARALLAX_DIR="${WORKDIR}/assets/parallax"
OUT_DIR="${WORKDIR}/output"
mkdir -p "$OUT_DIR"

# 收集所有视差视频
FILES=($(ls "$PARALLAX_DIR"/*.mp4 2>/dev/null | sort))
COUNT=${#FILES[@]}

if [[ $COUNT -eq 0 ]]; then
    echo "❌ 没有找到视差视频: $PARALLAX_DIR"
    exit 1
fi

echo "🎬 合成 ${COUNT} 个视频片段..."

if [[ $COUNT -eq 1 ]]; then
    # 单个视频直接复制
    cp "${FILES[0]}" "${OUT_DIR}/no_audio.mp4"
else
    # 多个视频交叉淡入淡出拼接
    # 构建 xfade filter chain
    FADE_DUR=0.5
    
    # 获取每个视频时长
    DURATIONS=()
    for f in "${FILES[@]}"; do
        d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
        DURATIONS+=("$d")
    done

    # 构建 ffmpeg xfade 滤镜
    INPUTS=""
    for f in "${FILES[@]}"; do
        INPUTS="$INPUTS -i '$f'"
    done

    # 简化方案：concat demuxer（无交叉淡入淡出）
    CONCAT_LIST="${WORKDIR}/concat_list.txt"
    > "$CONCAT_LIST"
    for f in "${FILES[@]}"; do
        echo "file '$f'" >> "$CONCAT_LIST"
    done

    ffmpeg -y -f concat -safe 0 -i "$CONCAT_LIST" -c copy "${OUT_DIR}/no_audio.mp4" 2>/dev/null
fi

# 添加 BGM
if [[ -n "$BGM" && -f "$BGM" ]]; then
    TOTAL_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "${OUT_DIR}/no_audio.mp4")
    FADE_OUT=$(echo "$TOTAL_DUR - 1" | bc)
    
    ffmpeg -y \
        -i "${OUT_DIR}/no_audio.mp4" \
        -i "$BGM" \
        -filter_complex "[1:a]afade=t=in:st=0:d=1,afade=t=out:st=${FADE_OUT}:d=1,atrim=0:${TOTAL_DUR}[bgm]" \
        -map 0:v -map "[bgm]" \
        -c:v copy -c:a aac -b:a 192k \
        "${OUT_DIR}/${OUTPUT}" 2>/dev/null
    
    echo "✅ 合成完成（含 BGM）: ${OUT_DIR}/${OUTPUT}"
else
    cp "${OUT_DIR}/no_audio.mp4" "${OUT_DIR}/${OUTPUT}"
    echo "✅ 合成完成（无 BGM）: ${OUT_DIR}/${OUTPUT}"
fi
