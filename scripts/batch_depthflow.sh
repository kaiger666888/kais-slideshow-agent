#!/usr/bin/env bash
# DepthFlow 批量视差生成
# 从 Windows 端通过 SSH 调用 DepthFlow CLI
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_windows}"
SSH_HOST="${SSH_HOST:-kai@192.168.71.38}"
DEPTHFLOW="${DEPTHFLOW:-C:\\Python311\\Scripts\\depthflow.exe}"
WIN_INPUT_DIR="${WIN_INPUT_DIR:-C:\\Users\\kai\\slideshow_input}"
WIN_OUTPUT_DIR="${WIN_OUTPUT_DIR:-C:\\Users\\kai\\slideshow_output}"
DURATION="${DURATION:-4}"
WIDTH="${WIDTH:-1080}"
HEIGHT="${HEIGHT:-1920}"
EFFECT="${EFFECT:-circle blur vignette}"

usage() {
    echo "用法: $0 [--pages pages.json] [--effect 'circle blur vignette'] [--duration 4] [--width 1080] [--height 1920]"
    echo ""
    echo "批量生成 DepthFlow 视差视频。"
    echo "pages.json 格式: [{index, prompt, text, effect, duration, image_path}, ...]"
    exit 1
}

# 默认参数
PAGES_JSON="pages.json"

while [[ $# -gt 0 ]]; do
    case $1 in
        --pages) PAGES_JSON="$2"; shift 2 ;;
        --effect) EFFECT="$2"; shift 2 ;;
        --duration) DURATION="$2"; shift 2 ;;
        --width) WIDTH="$2"; shift 2 ;;
        --height) HEIGHT="$2"; shift 2 ;;
        --help) usage ;;
        *) echo "未知参数: $1"; usage ;;
    esac
done

if [[ ! -f "$PAGES_JSON" ]]; then
    echo "❌ 找不到 $PAGES_JSON"
    exit 1
fi

echo "🎬 DepthFlow 批量视差生成"
echo "   效果: $EFFECT"
echo "   分辨率: ${WIDTH}x${HEIGHT}"
echo "   时长: ${DURATION}s/页"
echo ""

# 读取页面列表并逐个生成
TOTAL=$(python3 -c "import json; print(len(json.load(open('$PAGES_JSON'))['pages']))")
SUCCESS=0
FAIL=0

for i in $(seq 0 $((TOTAL - 1))); do
    PAGE=$(python3 -c "
import json
p = json.load(open('$PAGES_JSON'))['pages'][$i]
print(p.get('image_path', ''))
print(p.get('effect', '$EFFECT'))
print(p.get('duration', $DURATION))
")

    IMG_PATH=$(echo "$PAGE" | sed -n '1p')
    PAGE_EFFECT=$(echo "$PAGE" | sed -n '2p')
    PAGE_DUR=$(echo "$PAGE" | sed -n '3p')

    # 如果页面指定了效果，使用页面效果；否则用全局效果
    EFFECT_TO_USE="${PAGE_EFFECT:-$EFFECT}"
    DUR_TO_USE="${PAGE_DUR:-$DURATION}"

    if [[ -z "$IMG_PATH" ]]; then
        echo "⚠️  页面 $i: 无 image_path，跳过"
        continue
    fi

    # 转换路径为 Windows 格式
    WIN_IMG=$(echo "$IMG_PATH" | sed 's|/|\\|g')

    OUTPUT_NAME="parallax_$(printf '%02d' $i).mp4"
    WIN_OUTPUT="${WIN_OUTPUT_DIR}\\${OUTPUT_NAME}"

    echo "📄 页面 $((i+1))/$TOTAL: ${EFFECT_TO_USE} (${DUR_TO_USE}s)"
    
    # SSH 调用 DepthFlow
    if ssh -i "$SSH_KEY" "$SSH_HOST" \
        "\"$DEPTHFLOW\" input -i \"$WIN_IMG\" $EFFECT_TO_USE h264 main -t $DUR_TO_USE -w $WIDTH -h $HEIGHT -o \"$WIN_OUTPUT\"" 2>/dev/null; then
        echo "   ✅ $OUTPUT_NAME"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "   ❌ 失败"
        FAIL=$((FAIL + 1))
    fi
done

echo ""
echo "📊 完成: ✅ $SUCCESS 成功, ❌ $FAIL 失败"
