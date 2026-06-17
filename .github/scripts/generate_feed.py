#!/usr/bin/env python3
"""从 games_detail.json 生成 Atom feed.xml"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape


def build_date(d: str | None) -> str:
    if d:
        try:
            dt = datetime.strptime(d, '%d %b, %Y')
            return dt.strftime('%Y-%m-%dT00:00:00Z')
        except ValueError:
            pass
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def main():
    base_dir = Path(os.getcwd())
    detail_file = base_dir / 'games_detail.json'
    feed_file = base_dir / 'feed.xml'

    if not detail_file.exists():
        print('games_detail.json 不存在，跳过 RSS 生成')
        return

    with open(detail_file, encoding='utf-8') as f:
        data = json.load(f)

    games = data.get('games', [])
    if not games:
        print('无游戏数据，跳过 RSS 生成')
        return

    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    total = len(games)

    entries = []
    for g in games:
        name = g.get('name', '')
        appid = g.get('appid', '')
        reason = g.get('reason', '') or g.get('short_description', '') or ''
        desc = g.get('short_description', '') or ''
        release = g.get('release_date', '')

        if not name or not appid:
            continue

        entry_date = build_date(release)
        link = f'https://store.steampowered.com/app/{appid}/'
        content = f'{escape(reason)}<br><br>{escape(desc)}' if reason else escape(desc)

        entries.append(f'''  <entry>
    <title>{escape(name)}</title>
    <link href="{escape(link)}"/>
    <id>urn:game-seeker:{appid}</id>
    <published>{entry_date}</published>
    <updated>{entry_date}</updated>
    <summary type="html">{escape(reason or desc)}</summary>
    <content type="html">{content}</content>
  </entry>''')

    feed = f'''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>识游 · GameSeeker — 游戏推荐</title>
  <subtitle>AI 驱动的 Steam 游戏探索工具 — 最新 {total} 款推荐游戏</subtitle>
  <link href="https://AIerlIz.github.io/GameSeeker/"/>
  <link rel="self" href="https://AIerlIz.github.io/GameSeeker/feed.xml"/>
  <updated>{now}</updated>
  <author>
    <name>GameSeeker</name>
  </author>
  <id>urn:game-seeker:feed</id>
{chr(10).join(entries)}
</feed>
'''

    with open(feed_file, 'w', encoding='utf-8') as f:
        f.write(feed)

    print(f'✓ feed.xml 已生成 ({total} 条)')


if __name__ == '__main__':
    main()
