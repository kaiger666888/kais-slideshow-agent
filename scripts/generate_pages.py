#!/usr/bin/env python3
"""生成 slideshow 页面列表 (pages.json)
根据主题和美术方向，为每一页生成 prompt、文字和效果推荐。
"""
import json, sys, os

def generate_pages(theme, page_count, art_direction, extra_context=""):
    """生成页面列表。实际使用时由 LLM 生成，这里提供结构模板。"""
    pages = []
    for i in range(page_count):
        pages.append({
            "index": i,
            "prompt": f"[LLM生成的场景描述，基于主题: {theme}, 风格: {art_direction}]",
            "text": f"[第{i+1}页标题]",
            "effect": "circle blur vignette",  # 默认推荐
            "duration": 4.0,
        })
    return pages

if __name__ == "__main__":
    # CLI 模式：读取 requirement.json + art_direction.json → 输出 pages.json
    import argparse
    parser = argparse.ArgumentParser(description="生成 slideshow 页面列表")
    parser.add_argument("--requirement", default="requirement.json", help="需求文件路径")
    parser.add_argument("--art-direction", default="art_direction.json", help="美术方向文件路径")
    parser.add_argument("--output", default="pages.json", help="输出文件路径")
    args = parser.parse_args()

    with open(args.requirement) as f:
        req = json.load(f)
    with open(args.art_direction) as f:
        art = json.load(f)

    # 结构模板，实际 prompt 由 LLM 生成
    pages = generate_pages(
        theme=req.get("theme", ""),
        page_count=req.get("page_count", 6),
        art_direction=art.get("style_name", ""),
    )
    
    with open(args.output, "w") as f:
        json.dump({"pages": pages}, f, ensure_ascii=False, indent=2)
    print(f"✅ 生成 {len(pages)} 页 → {args.output}")
