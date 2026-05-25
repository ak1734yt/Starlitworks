import os
import time
import sqlite3
import httpx
import threading
from database import DB_SHOP

def update_discord_member_count():
    bot_token = os.getenv("DISCORD_BOT_TOKEN")
    selfbot_token = os.getenv("DISCORD_SELFBOT_TOKEN")
    guild_ids_str = os.getenv("DISCORD_TARGET_GUILD_ID", "")
    configured_guild_ids = [gid.strip() for gid in guild_ids_str.split(",") if gid.strip()]
    
    guild_members = {}  # guild_id -> member_count
    
    # 1. Fetch from active bot instance
    try:
        from discord_bot import bot
        if bot and bot.is_ready() and bot.guilds:
            for g in bot.guilds:
                if g.id and g.member_count:
                    guild_members[str(g.id)] = g.member_count
            print(f"[DISCORD STATS] Fetched {len(guild_members)} guilds from active bot instance.")
    except Exception as e:
        print(f"[DISCORD STATS] Error getting count from active bot instance: {e}")
        
    # 2. Fetch using bot token via REST API if active instance had no guilds and token is set
    if not guild_members and bot_token:
        print("[DISCORD STATS] Active bot instance not ready or empty. Fetching bot guilds via REST API...")
        headers = {"Authorization": f"Bot {bot_token}"}
        bot_guild_ids = list(configured_guild_ids)
        with httpx.Client(timeout=10.0) as client:
            if not bot_guild_ids:
                try:
                    r = client.get("https://discord.com/api/v9/users/@me/guilds", headers=headers)
                    if r.status_code == 200:
                        bot_guild_ids = [g["id"] for g in r.json() if "id" in g]
                except Exception as e:
                    print(f"[DISCORD STATS] Error fetching bot @me/guilds: {e}")
            
            for gid in bot_guild_ids:
                try:
                    r = client.get(f"https://discord.com/api/v9/guilds/{gid}?with_counts=true", headers=headers)
                    if r.status_code == 200:
                        guild_members[str(gid)] = r.json().get("approximate_member_count", 0)
                    else:
                        r2 = client.get(f"https://discord.com/api/v9/guilds/{gid}/preview", headers=headers)
                        if r2.status_code == 200:
                            guild_members[str(gid)] = r2.json().get("approximate_member_count", 0)
                except Exception as e:
                    print(f"[DISCORD STATS] Error fetching bot guild {gid}: {e}")
                time.sleep(2)  # Cooldown to prevent rate limiting
                    
    # 3. Fetch from selfbot (shelbot)
    if selfbot_token:
        print("[DISCORD STATS] Fetching selfbot (shelbot) guilds via REST API...")
        headers = {"Authorization": selfbot_token}
        self_guild_ids = list(configured_guild_ids)
        with httpx.Client(timeout=10.0) as client:
            if not self_guild_ids:
                try:
                    r = client.get("https://discord.com/api/v9/users/@me/guilds", headers=headers)
                    if r.status_code == 200:
                        self_guild_ids = [g["id"] for g in r.json() if "id" in g]
                except Exception as e:
                    print(f"[DISCORD STATS] Error fetching selfbot @me/guilds: {e}")
            
            for gid in self_guild_ids:
                try:
                    r = client.get(f"https://discord.com/api/v9/guilds/{gid}?with_counts=true", headers=headers)
                    if r.status_code == 200:
                        guild_members[str(gid)] = r.json().get("approximate_member_count", 0)
                    else:
                        r2 = client.get(f"https://discord.com/api/v9/guilds/{gid}/preview", headers=headers)
                        if r2.status_code == 200:
                            guild_members[str(gid)] = r2.json().get("approximate_member_count", 0)
                except Exception as e:
                    print(f"[DISCORD STATS] Error fetching selfbot guild {gid}: {e}")
                time.sleep(2)  # Cooldown to prevent rate limiting
                    
    total_members = sum(guild_members.values())
    
    if total_members > 0:
        try:
            conn = sqlite3.connect(DB_SHOP)
            conn.execute("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)", ("discord_member_count", str(total_members)))
            conn.commit()
            conn.close()
            print(f"[DISCORD STATS] Updated total merged member count: {total_members} across {len(guild_members)} unique guilds.")
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
            time.sleep(3600)  # Update once per hour
            
    threading.Thread(target=_loop, daemon=True).start()
    print("[DISCORD STATS] Background sync loop started.")
