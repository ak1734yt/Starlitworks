import os
import time
import sqlite3
import httpx
import threading
from database import DB_SHOP

def update_discord_member_count():
    selfbot_token = os.getenv("DISCORD_SELFBOT_TOKEN")
    bot_token = os.getenv("DISCORD_BOT_TOKEN")
    guild_ids_str = os.getenv("DISCORD_TARGET_GUILD_ID", "")
    
    # Parse comma-separated guild IDs
    guild_ids = [gid.strip() for gid in guild_ids_str.split(",") if gid.strip()]
    if not guild_ids:
        print("[DISCORD STATS] No target guild IDs configured in DISCORD_TARGET_GUILD_ID. Skipping.")
        return

    token = selfbot_token or bot_token
    if not token:
        print("[DISCORD STATS] No selfbot or bot token set. Skipping member count fetch.")
        return
        
    headers = {}
    if selfbot_token:
        headers["Authorization"] = selfbot_token
    else:
        headers["Authorization"] = f"Bot {bot_token}"
        
    total_members = 0
    fetched_any = False
    
    with httpx.Client(timeout=10.0) as client:
        for guild_id in guild_ids:
            # Query guild details with counts
            url = f"https://discord.com/api/v9/guilds/{guild_id}?with_counts=true"
            try:
                r = client.get(url, headers=headers)
                if r.status_code == 200:
                    data = r.json()
                    count = data.get("approximate_member_count", 0)
                    total_members += count
                    fetched_any = True
                else:
                    # Fallback to preview endpoint
                    preview_url = f"https://discord.com/api/v9/guilds/{guild_id}/preview"
                    r2 = client.get(preview_url, headers=headers)
                    if r2.status_code == 200:
                        data = r2.json()
                        count = data.get("approximate_member_count", 0)
                        total_members += count
                        fetched_any = True
                    else:
                        print(f"[DISCORD STATS] Failed to fetch guild {guild_id}: status {r.status_code}, {r.text}")
            except Exception as e:
                print(f"[DISCORD STATS] Error fetching guild {guild_id}: {e}")
                
    if fetched_any:
        try:
            conn = sqlite3.connect(DB_SHOP)
            conn.execute("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)", ("discord_member_count", str(total_members)))
            conn.commit()
            conn.close()
            print(f"[DISCORD STATS] Updated total member count to {total_members} for guilds: {guild_ids}")
        except Exception as e:
            print(f"[DISCORD STATS] Database error caching member count: {e}")

def start_discord_stats_loop():
    def _loop():
        # Delay startup to allow server initialization
        time.sleep(10)
        while True:
            try:
                update_discord_member_count()
            except Exception as e:
                print(f"[DISCORD STATS] Error in thread loop: {e}")
            time.sleep(60)
            
    threading.Thread(target=_loop, daemon=True).start()
    print("[DISCORD STATS] Background sync loop started.")
