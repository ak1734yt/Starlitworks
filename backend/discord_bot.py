import os, time, json, asyncio
import discord
from discord.ext import commands, tasks
import psutil
from datetime import datetime
from database import get_db

# ── Paths ─────────────────────────────────────────────────────────────────────
DATA_DIR   = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
CONFIG     = os.path.join(DATA_DIR, "webhooks_config.json")
POSTED     = os.path.join(DATA_DIR, "bot_posted_orders.json")
START_TIME = time.time()

# ── Config helpers ─────────────────────────────────────────────────────────────
def load_config():
    try:
        with open(CONFIG, "r") as f: return json.load(f)
    except: return {}

def save_config(data):
    with open(CONFIG, "w") as f: json.dump(data, f, indent=2)

def load_posted():
    try:
        with open(POSTED, "r") as f: return set(json.load(f))
    except: return set()

def save_posted(s):
    with open(POSTED, "w") as f: json.dump(list(s), f)

# ── DB ─────────────────────────────────────────────────────────────────────────
def db():
    return get_db()

def get_order(order_id):
    c = db()
    row = c.execute("""
        SELECT o.*, u.name AS client_name, u.email AS client_email
        FROM orders.orders o JOIN auth.users u ON o.user_id=u.id
        WHERE o.id=?""", (order_id,)).fetchone()
    c.close()
    return dict(row) if row else None

def write_order(order_id, **kwargs):
    if not kwargs: return
    import re
    # Validate column names to prevent SQL injection (defense-in-depth)
    for k in kwargs:
        if not re.match(r"^[a-zA-Z0-9_]+$", k):
            raise ValueError(f"Invalid column name: {k}")
    cols = ", ".join(f"{k}=?" for k in kwargs)
    vals = list(kwargs.values()) + [int(time.time()), order_id]
    c = db()
    c.execute(f"UPDATE orders.orders SET {cols}, updated_at=? WHERE id=?", vals)
    c.commit(); c.close()

# ── Visual helpers ─────────────────────────────────────────────────────────────
STATUS_COLORS = {
    "pending":         0x6b7280,
    "quoted":          0x3b82f6,
    "accepted":        0x8b5cf6,
    "payment_pending": 0xf59e0b,
    "in_progress":     0x7c3aed,
    "completed":       0x10b981,
    "rejected":        0xef4444,
}
STATUS_EMOJI = {
    "pending": "🟡", "quoted": "📋", "accepted": "✅",
    "payment_pending": "⏳", "in_progress": "⚡",
    "completed": "🟢", "rejected": "🔴",
}

def bar(pct, n=14):
    f = int(round(n * pct / 100))
    return f"`[{'█'*f}{'░'*(n-f)}]` **{pct:.1f}%**"

def timeline(status):
    steps = ["pending","quoted","accepted","in_progress","completed"]
    s = status.lower()
    if s == "payment_pending": s = "accepted"
    if s == "rejected": s = "pending"
    done = True
    parts = []
    for st in steps:
        if st == s:
            parts.append(f"**[{st.upper().replace('_',' ')}]**")
            done = False
        elif done:
            parts.append(f"~~{st.replace('_',' ')}~~")
        else:
            parts.append(st.replace('_',' '))
    return " → ".join(parts)

def order_embed(o):
    status = o.get("status","pending")
    color  = STATUS_COLORS.get(status, 0x7c3aed)
    price  = o.get("quoted_price") or 0.0
    cred   = o.get("credits_applied") or 0.0
    tax    = (o.get("cgst") or 0) + (o.get("sgst") or 0)
    total  = o.get("total_amount") or 0.0

    e = discord.Embed(
        title=f"📋 Order #{o['id']} — {o['service_name']}",
        description=f"{STATUS_EMOJI.get(status,'📌')} **{status.upper().replace('_',' ')}**\n\n{timeline(status)}",
        color=color, timestamp=datetime.utcnow()
    )
    e.add_field(name="👤 Client",      value=f"{o['client_name']}\n`{o.get('discord_username') or 'N/A'}`", inline=True)
    e.add_field(name="🛠 Service",      value=f"`{o['service_id']}`", inline=True)
    e.add_field(name="📅 Timeline",    value=o.get("timeline") or "Flexible", inline=True)

    spec = (o.get("description") or "").strip()
    if spec:
        e.add_field(name="📝 Specs", value=f"```{spec[:300]}```", inline=False)

    ledger = (
        "```\n"
        f"  Quoted:   ₹{price:>10,.2f}\n"
        f"  Credits: -₹{cred:>10,.2f}\n"
        f"  Tax:     +₹{tax:>10,.2f}\n"
        "  ─────────────────\n"
        f"  TOTAL:    ₹{total:>10,.2f}\n"
        "```"
    )
    e.add_field(name="💰 Invoice", value=ledger, inline=False)
    e.add_field(name="💳 Payment", value=f"`{o.get('payment_status','pending').upper()}`", inline=True)
    e.add_field(name="📆 Created",
                value=datetime.fromtimestamp(o['created_at']).strftime('%d %b %Y %H:%M'), inline=True)
    e.set_footer(text="Starlit Siege Works • Use buttons below to manage this order")
    return e

# ── Button Views ───────────────────────────────────────────────────────────────
class QuoteModal(discord.ui.Modal, title="Set Quote Price"):
    price = discord.ui.TextInput(label="Quoted Price (₹)", placeholder="e.g. 1500", max_length=10)
    notes = discord.ui.TextInput(label="Admin Notes (optional)", required=False, max_length=200,
                                  style=discord.TextStyle.paragraph)

    def __init__(self, order_id):
        super().__init__(); self.order_id = order_id

    async def on_submit(self, interaction: discord.Interaction):
        try:
            p = float(self.price.value.replace(",","").replace("₹",""))
            write_order(self.order_id, quoted_price=p, status="quoted",
                        admin_notes=self.notes.value or "")
            o = get_order(self.order_id)
            await interaction.response.edit_message(embed=order_embed(o), view=OrderView(self.order_id))
            await interaction.followup.send(
                f"✅ Order **#{self.order_id}** quoted at **₹{p:,.2f}** — status set to `QUOTED`.", ephemeral=True)
        except ValueError:
            await interaction.response.send_message("❌ Invalid price. Enter a number like `1500`.", ephemeral=True)

class OrderView(discord.ui.View):
    def __init__(self, order_id):
        super().__init__(timeout=None)
        self.order_id = order_id

    @discord.ui.button(label="💰 Set Quote", style=discord.ButtonStyle.primary, custom_id="btn_quote")
    async def btn_quote(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(QuoteModal(self.order_id))

    @discord.ui.button(label="✅ Accept", style=discord.ButtonStyle.success, custom_id="btn_accept")
    async def btn_accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        write_order(self.order_id, status="accepted")
        o = get_order(self.order_id)
        await interaction.response.edit_message(embed=order_embed(o), view=OrderView(self.order_id))
        await interaction.followup.send(f"✅ Order **#{self.order_id}** marked `ACCEPTED`.", ephemeral=True)

    @discord.ui.button(label="⚡ Start Work", style=discord.ButtonStyle.primary, custom_id="btn_start")
    async def btn_start(self, interaction: discord.Interaction, button: discord.ui.Button):
        write_order(self.order_id, status="in_progress")
        o = get_order(self.order_id)
        await interaction.response.edit_message(embed=order_embed(o), view=OrderView(self.order_id))
        await interaction.followup.send(f"⚡ Order **#{self.order_id}** is now `IN PROGRESS`.", ephemeral=True)

    @discord.ui.button(label="🎉 Complete", style=discord.ButtonStyle.success, custom_id="btn_complete")
    async def btn_complete(self, interaction: discord.Interaction, button: discord.ui.Button):
        write_order(self.order_id, status="completed", payment_status="verified")
        o = get_order(self.order_id)
        await interaction.response.edit_message(embed=order_embed(o), view=OrderView(self.order_id))
        await interaction.followup.send(f"🎉 Order **#{self.order_id}** marked `COMPLETED`.", ephemeral=True)

    @discord.ui.button(label="🔴 Reject", style=discord.ButtonStyle.danger, custom_id="btn_reject")
    async def btn_reject(self, interaction: discord.Interaction, button: discord.ui.Button):
        write_order(self.order_id, status="rejected")
        o = get_order(self.order_id)
        await interaction.response.edit_message(embed=order_embed(o), view=OrderView(self.order_id))
        await interaction.followup.send(f"🔴 Order **#{self.order_id}** marked `REJECTED`.", ephemeral=True)

# ── Bot init ───────────────────────────────────────────────────────────────────
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)

# ── Ticket/channel finders ─────────────────────────────────────────────────────
async def get_or_create_category(guild, name):
    cat = discord.utils.get(guild.categories, name=name)
    return cat or await guild.create_category(name)

async def get_or_create_channel(guild, cat, name, **kwargs):
    ch = discord.utils.get(cat.channels, name=name)
    return ch or await guild.create_text_channel(name, category=cat, **kwargs)

async def find_or_create_order_thread(guild, order_id, order=None):
    """Find or create a private thread for an order inside #ticket-hub."""
    ticket_cat = discord.utils.get(guild.categories, name="🎫 Client Tickets")
    if not ticket_cat:
        return None
    hub = discord.utils.get(ticket_cat.channels, name="ticket-hub")
    if not hub:
        return None
    thread_name = f"order-{order_id}"
    for thread in hub.threads:
        if thread.name.startswith(thread_name):
            return thread
    # Also check archived threads
    async for thread in hub.archived_threads(private=True, limit=100):
        if thread.name.startswith(thread_name):
            await thread.edit(archived=False)
            return thread
    # Create new private thread
    if not order:
        order = get_order(order_id)
    if not order:
        return None
    tname = f"order-{order_id} · {order['client_name'][:20]} · {order['service_name'][:20]}"
    thread = await hub.create_thread(
        name=tname,
        type=discord.ChannelType.private_thread,
        auto_archive_duration=10080,  # 7 days
        reason=f"Starlit ticket for Order #{order_id}"
    )
    return thread

async def get_pipeline_channel(guild, service_id):
    """Get or create the category channel matching the order's service category."""
    cfg = load_config()
    pipeline_cat = discord.utils.get(guild.categories, name="📂 Order Pipeline")
    if not pipeline_cat:
        return None
    # Derive clean channel name from service_id/category
    slug = str(service_id).lower().replace(" ", "-").replace("_", "-")[:30]
    ch_name = f"orders-{slug}"
    ch = discord.utils.get(pipeline_cat.channels, name=ch_name)
    if not ch:
        try:
            ch = await guild.create_text_channel(ch_name, category=pipeline_cat)
        except Exception:
            ch = discord.utils.get(pipeline_cat.channels, name="orders-general")
    return ch

async def post_order_to_pipeline(guild, order_id):
    """Post an order card with buttons to the correct pipeline channel."""
    o = get_order(order_id)
    if not o:
        return
    ch = await get_pipeline_channel(guild, o.get("service_id","general"))
    if not ch:
        return
    await ch.send(embed=order_embed(o), view=OrderView(order_id))

async def post_order_thread(guild, order_id):
    """Create private thread and post the order card with buttons inside it."""
    o = get_order(order_id)
    if not o:
        return
    thread = await find_or_create_order_thread(guild, order_id, o)
    if not thread:
        return
    await thread.send(
        content=f"🎫 **Private Thread for Order #{order_id}**\nUse the buttons below to manage this order.",
        embed=order_embed(o),
        view=OrderView(order_id)
    )
    return thread

# ── Events ─────────────────────────────────────────────────────────────────────
@bot.event
async def on_ready():
    print(f"[BOT] {bot.user.name} online (ID: {bot.user.id})")
    await bot.change_presence(
        activity=discord.Activity(type=discord.ActivityType.watching, name="📋 Starlit Orders • !help")
    )
    poll_new_orders.start()

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send(embed=discord.Embed(
            title="⚠️ Missing Argument",
            description=f"Usage: `!{ctx.command.name} {ctx.command.signature}`",
            color=0xf59e0b))
    elif isinstance(error, commands.CommandNotFound):
        pass  # Silently ignore unknown commands
    else:
        await ctx.send(embed=discord.Embed(
            title="🔴 Error", description=f"`{error}`", color=0xef4444))

# ── Background task: auto-post new orders ─────────────────────────────────────
@tasks.loop(seconds=60)
async def poll_new_orders():
    await bot.wait_until_ready()
    if not bot.guilds:
        return
    guild = bot.guilds[0]
    posted = load_posted()
    try:
        c = db()
        rows = c.execute(
            "SELECT id FROM orders.orders ORDER BY created_at DESC LIMIT 50"
        ).fetchall()
        c.close()
        for row in rows:
            oid = row[0]
            if oid not in posted:
                await post_order_to_pipeline(guild, oid)
                await post_order_thread(guild, oid)
                posted.add(oid)
        save_posted(posted)
    except Exception as e:
        print(f"[BOT] poll_new_orders error: {e}")

# ── !help ──────────────────────────────────────────────────────────────────────
@bot.command(name="help")
async def bot_help(ctx):
    e = discord.Embed(
        title="🛰️ Starlit Command Center",
        description="Full command reference for the Starlit Siege Works operations bot.",
        color=0x7c3aed, timestamp=datetime.utcnow()
    )
    e.add_field(name="📋 `!order <id>`",        value="View order details + action buttons.", inline=False)
    e.add_field(name="🎫 `!ticket <id>`",        value="Open/find the private thread for an order.", inline=False)
    e.add_field(name="📊 `!pipeline`",           value="Live pipeline overview with counts + progress bars.", inline=False)
    e.add_field(name="🟡 `!pending`",            value="Quick list of all pending orders.", inline=False)
    e.add_field(name="📦 `!catalog`",            value="Browse all shop packages.", inline=False)
    e.add_field(name="🖥️ `!telemetry`",          value="Host CPU/RAM/DB health metrics.", inline=False)
    e.add_field(name="⚙️ `!build_loggers`",      value="*(Admin)* Full channel + webhook setup.", inline=False)
    e.add_field(name="🔁 `!repost <id>`",        value="*(Admin)* Re-post order card to pipeline.", inline=False)
    e.set_footer(text="Starlit Siege Works v3.0 • Button-driven order management")
    if bot.user.avatar:
        e.set_thumbnail(url=bot.user.avatar.url)
    await ctx.send(embed=e)

# ── !save ──────────────────────────────────────────────────────────────
@bot.command(name="save")
@commands.has_permissions(administrator=True)
async def bot_save(ctx, action: str, *, title: str):
    if action.lower() != "ourwork":
        await ctx.send(embed=discord.Embed(title="⚠️ Invalid Command", description="Usage: `!save ourwork <Template Name>`", color=0xf59e0b))
        return

    price = 0.0
    template_link = ""
    guild = ctx.guild
    
    # Extract roles (highest position first, skipping default @everyone)
    roles = []
    for r in sorted(guild.roles, key=lambda x: x.position, reverse=True):
        if r.is_default():
            continue
        roles.append({
            "name": r.name,
            "color": str(r.color),
            "hoist": r.hoist,
            "position": r.position
        })

    # Extract channels
    channels_data = []
    for c in sorted(guild.channels, key=lambda x: x.position):
        if isinstance(c, discord.CategoryChannel):
            continue
        ch_type = "text"
        if isinstance(c, discord.VoiceChannel):
            ch_type = "voice"
        elif isinstance(c, discord.StageChannel):
            ch_type = "stage"
        elif isinstance(c, discord.ForumChannel):
            ch_type = "forum"

        channels_data.append({
            "name": c.name,
            "type": ch_type,
            "category": c.category.name if c.category else "Uncategorized",
            "position": c.position
        })

    try:
        c = db()
        c.execute("""
            INSERT INTO shop.templates (title, description, price, roles_json, channels_json, template_link)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            title,
            f"Premium Discord server template for {title} cloned directly from guild '{guild.name}' via Starlit Bot.",
            price,
            json.dumps(roles),
            json.dumps(channels_data),
            template_link
        ))
        c.commit()
        c.close()

        e = discord.Embed(
            title="✅ Server Template Saved",
            description=f"Successfully copied server layout and saved to marketplace catalog.",
            color=0x10b981
        )
        e.add_field(name="🏷️ Title", value=title, inline=True)
        e.add_field(name="💰 Price", value=f"₹{price:.2f}", inline=True)
        e.add_field(name="👥 Roles Copied", value=f"{len(roles)} roles", inline=True)
        e.add_field(name="📂 Channels Copied", value=f"{len(channels_data)} channels", inline=True)
        e.set_footer(text="Starlit Siege Works Template System")
        await ctx.send(embed=e)

    except Exception as ex:
        await ctx.send(embed=discord.Embed(
            title="🔴 Save Template Failed",
            description=f"Error saving template: `{ex}`",
            color=0xef4444
        ))

# ── !order ─────────────────────────────────────────────────────────────────────
@bot.command(name="order")
async def bot_order(ctx, order_id: int):
    o = get_order(order_id)
    if not o:
        await ctx.send(embed=discord.Embed(title="🔍 Not Found",
            description=f"Order **#{order_id}** not found.", color=0xf59e0b))
        return
    await ctx.send(embed=order_embed(o), view=OrderView(order_id))

# ── !ticket ────────────────────────────────────────────────────────────────────
@bot.command(name="ticket")
async def bot_ticket(ctx, order_id: int):
    o = get_order(order_id)
    if not o:
        await ctx.send(embed=discord.Embed(title="🔍 Not Found",
            description=f"Order **#{order_id}** not found.", color=0xf59e0b))
        return
    msg = await ctx.send(embed=discord.Embed(
        title="🎫 Opening Ticket...", color=0x3b82f6))
    thread = await find_or_create_order_thread(ctx.guild, order_id, o)
    if not thread:
        await msg.edit(embed=discord.Embed(
            title="⚠️ Setup Required",
            description="Run `!build_loggers` first to create the `🎫 Client Tickets` category.",
            color=0xf59e0b))
        return
    # Post card if thread is new (no messages)
    try:
        msgs = [m async for m in thread.history(limit=1)]
        if not msgs:
            await thread.send(embed=order_embed(o), view=OrderView(order_id))
    except Exception:
        pass
    await msg.edit(embed=discord.Embed(
        title="🎫 Ticket Ready",
        description=f"Private thread: {thread.mention}\n**Order:** #{order_id} — {o['service_name']}\n**Client:** {o['client_name']}",
        color=0x10b981))

# ── !pipeline ──────────────────────────────────────────────────────────────────
@bot.command(name="pipeline")
async def bot_pipeline(ctx):
    try:
        c = db()
        total     = c.execute("SELECT COUNT(*) FROM orders.orders").fetchone()[0]
        pending   = c.execute("SELECT COUNT(*) FROM orders.orders WHERE status='pending'").fetchone()[0]
        quoted    = c.execute("SELECT COUNT(*) FROM orders.orders WHERE status='quoted'").fetchone()[0]
        pay_pend  = c.execute("SELECT COUNT(*) FROM orders.orders WHERE status='payment_pending'").fetchone()[0]
        active    = c.execute("SELECT COUNT(*) FROM orders.orders WHERE status='in_progress'").fetchone()[0]
        completed = c.execute("SELECT COUNT(*) FROM orders.orders WHERE status='completed'").fetchone()[0]
        rejected  = c.execute("SELECT COUNT(*) FROM orders.orders WHERE status='rejected'").fetchone()[0]
        c.close()

        open_orders = pending + quoted + pay_pend + active
        pct = lambda n: (n / total * 100) if total else 0

        e = discord.Embed(
            title="📊 Live Order Pipeline Dashboard",
            description=f"**{open_orders}** open orders · **{total}** total recorded",
            color=0x7c3aed, timestamp=datetime.utcnow()
        )
        e.add_field(name="🟡 Pending Review",     value=f"{bar(pct(pending))}  `{pending}`",   inline=False)
        e.add_field(name="📋 Quoted",              value=f"{bar(pct(quoted))}  `{quoted}`",     inline=False)
        e.add_field(name="⏳ Payment Pending",     value=f"{bar(pct(pay_pend))}  `{pay_pend}`", inline=False)
        e.add_field(name="⚡ In Progress",         value=f"{bar(pct(active))}  `{active}`",     inline=False)
        e.add_field(name="🟢 Completed",           value=f"{bar(pct(completed))}  `{completed}`", inline=False)
        e.add_field(name="🔴 Rejected",            value=f"{bar(pct(rejected))}  `{rejected}`", inline=False)
        e.set_footer(text="Starlit Pipeline • Updates every 60s via background poller")
        await ctx.send(embed=e)
    except Exception as ex:
        await ctx.send(embed=discord.Embed(title="🔴 Error", description=f"`{ex}`", color=0xef4444))

# ── !pending ───────────────────────────────────────────────────────────────────
@bot.command(name="pending")
async def bot_pending(ctx):
    try:
        c = db()
        rows = c.execute("""
            SELECT o.id, o.service_name, o.status, u.name
            FROM orders.orders o JOIN auth.users u ON o.user_id=u.id
            WHERE o.status IN ('pending','quoted','payment_pending')
            ORDER BY o.created_at DESC LIMIT 20
        """).fetchall()
        c.close()
        if not rows:
            await ctx.send(embed=discord.Embed(
                title="✅ All Clear!", description="No pending orders right now.", color=0x10b981))
            return
        lines = []
        for r in rows:
            em = STATUS_EMOJI.get(r[1], "📌")
            lines.append(f"{em} **#{r[0]}** — {r[2]} | `{r[1].upper()}` | {r[3]}")
        e = discord.Embed(
            title=f"🟡 Pending Orders ({len(rows)})",
            description="\n".join(lines),
            color=0xf59e0b, timestamp=datetime.utcnow()
        )
        e.set_footer(text="Use !order <id> to open with action buttons")
        await ctx.send(embed=e)
    except Exception as ex:
        await ctx.send(embed=discord.Embed(title="🔴 Error", description=f"`{ex}`", color=0xef4444))

# ── !catalog ───────────────────────────────────────────────────────────────────
@bot.command(name="catalog")
async def bot_catalog(ctx):
    try:
        c = db()
        products = c.execute("SELECT * FROM shop.products WHERE is_deleted = 0 ORDER BY category, sort_order").fetchall()
        c.close()
        if not products:
            await ctx.send(embed=discord.Embed(title="⚠️ Empty Catalog", color=0xf59e0b)); return

        CAT_ICONS = {"bot":"🤖","subscription":"💎","setup":"⚙️","promo":"🚀","server":"⚡"}
        embeds, cur_cat, emb = [], None, None
        for p in products:
            p = dict(p)
            cat = p["category"].replace("_"," ").title()
            icon = next((v for k,v in CAT_ICONS.items() if k in cat.lower()), "📦")
            if cat != cur_cat:
                if emb: embeds.append(emb)
                cur_cat = cat
                emb = discord.Embed(title=f"{icon} {cat}", color=0x7c3aed)
            price = "📋 Custom Quote" if p["is_manual_price"] else f"₹{p['price']:.2f}" + (f"/{p.get('unit_label') or 'mo'}" if p["is_recurring"] else "")
            feats = json.loads(p.get("features","[]"))
            fbullet = "\n".join(f"✨ {f}" for f in feats[:3]) or "• Standard specs"
            tag = f" `{p['tag']}`" if p.get("tag") else ""
            emb.add_field(
                name=f"{p['name']} — {price}{tag}",
                value=f"`{p['product_key']}`\n{p['description'][:120]}\n{fbullet}\n\u200b",
                inline=False)
            if len(emb.fields) >= 6:
                embeds.append(emb)
                emb = discord.Embed(title=f"{icon} {cat} (cont.)", color=0x7c3aed)
        if emb: embeds.append(emb)
        for em in embeds[:5]:
            em.set_footer(text="Starlit Siege Works • Live catalog")
            await ctx.send(embed=em)
    except Exception as ex:
        await ctx.send(embed=discord.Embed(title="🔴 Error", description=f"`{ex}`", color=0xef4444))

# ── !telemetry ─────────────────────────────────────────────────────────────────
@bot.command(name="telemetry")
async def bot_telemetry(ctx):
    try:
        cpu   = psutil.cpu_percent(interval=0.5)
        mem   = psutil.virtual_memory()
        disk  = psutil.disk_usage("/")
        lat   = round(bot.latency * 1000, 1)
        up_s  = int(time.time() - psutil.boot_time())
        bot_s = int(time.time() - START_TIME)
        c = db()
        ucnt = c.execute("SELECT COUNT(*) FROM auth.users").fetchone()[0]
        ocnt = c.execute("SELECT COUNT(*) FROM orders.orders").fetchone()[0]
        pcnt = c.execute("SELECT COUNT(*) FROM shop.products WHERE is_deleted = 0").fetchone()[0]
        c.close()

        cpu_st  = "🟢 OK" if cpu<60 else ("🟡 Warn" if cpu<85 else "🔴 CRIT")
        mem_st  = "🟢 OK" if mem.percent<75 else ("🟡 High" if mem.percent<90 else "🔴 CRIT")
        lat_st  = "🟢 Fast" if lat<60 else ("🟡 OK" if lat<150 else "🔴 Slow")

        e = discord.Embed(title="🖥️ Host Telemetry", color=0x10b981, timestamp=datetime.utcnow())
        e.add_field(name="⚙️ CPU",     value=f"{bar(cpu)}\n{cpu_st}", inline=False)
        e.add_field(name="🧠 RAM",     value=f"{bar(mem.percent)}\n{mem_st} — {mem.used//1048576}MB / {mem.total//1048576}MB", inline=False)
        e.add_field(name="💽 Disk",    value=f"{bar(disk.percent)}\n{disk.free//1073741824}GB free", inline=False)
        e.add_field(name="📡 Latency", value=f"`{lat}ms` {lat_st}", inline=True)
        e.add_field(name="🤖 Bot Up",  value=f"`{bot_s//3600}h {(bot_s%3600)//60}m`", inline=True)
        e.add_field(name="💻 Host Up", value=f"`{up_s//86400}d {(up_s%86400)//3600}h`", inline=True)
        e.add_field(name="🗄️ Database",
                    value=f"👤 `{ucnt}` users  📦 `{pcnt}` products  📋 `{ocnt}` orders", inline=False)
        e.set_footer(text="Starlit Systems Telemetry")
        await ctx.send(embed=e)
    except Exception as ex:
        await ctx.send(embed=discord.Embed(title="🔴 Error", description=f"`{ex}`", color=0xef4444))

# ── !repost ────────────────────────────────────────────────────────────────────
@bot.command(name="repost")
@commands.has_permissions(administrator=True)
async def bot_repost(ctx, order_id: int):
    """Re-post an order to its pipeline channel."""
    o = get_order(order_id)
    if not o:
        await ctx.send("❌ Order not found."); return
    await post_order_to_pipeline(ctx.guild, order_id)
    await ctx.send(f"✅ Order **#{order_id}** reposted to pipeline.", delete_after=10)

# ── !build_loggers ─────────────────────────────────────────────────────────────
@bot.command(name="build_loggers")
@commands.has_permissions(administrator=True)
async def build_loggers(ctx):
    init_emb = discord.Embed(
        title="⚙️ Building Starlit Infrastructure...",
        description="Creating categories, channels and webhooks. Please wait.",
        color=0x3b82f6)
    msg = await ctx.send(embed=init_emb)
    guild = ctx.guild
    logs, webhooks = [], {}
    try:
        # ── 1. Operations category (webhook channels) ──────────────────────────
        ops_cat = await get_or_create_category(guild, "⚡ Starlit Operations")
        logs.append("📁 `⚡ Starlit Operations` category ready")
        for name in ["logins","orders","chats","referrals","payments","telemetry"]:
            ch = await get_or_create_channel(guild, ops_cat, f"starlit-{name}")
            hooks = await ch.webhooks()
            hook = discord.utils.get(hooks, name=f"Starlit {name.title()}")
            if not hook:
                hook = await ch.create_webhook(name=f"Starlit {name.title()}")
                logs.append(f"🔌 Webhook created: `#starlit-{name}`")
            else:
                logs.append(f"🔗 Webhook verified: `#starlit-{name}`")
            webhooks[name.upper()] = hook.url

        # ── 2. Client Tickets category ─────────────────────────────────────────
        ticket_cat = await get_or_create_category(guild, "🎫 Client Tickets")
        hub = await get_or_create_channel(guild, ticket_cat, "ticket-hub")
        logs.append("🎫 `🎫 Client Tickets` category + `#ticket-hub` ready")

        # ── 3. Order Pipeline category ─────────────────────────────────────────
        pipe_cat = await get_or_create_category(guild, "📂 Order Pipeline")
        # Create channels per product category
        c = db()
        cats = c.execute("SELECT DISTINCT category FROM shop.products WHERE is_deleted = 0").fetchall()
        c.close()
        for cat_row in cats:
            slug = cat_row[0].lower().replace(" ","-").replace("_","-")[:28]
            await get_or_create_channel(guild, pipe_cat, f"orders-{slug}")
            logs.append(f"📂 Pipeline channel: `#orders-{slug}`")
        await get_or_create_channel(guild, pipe_cat, "orders-general")
        logs.append("📂 `#orders-general` fallback channel ready")

        # ── 4. Save config ─────────────────────────────────────────────────────
        save_config(webhooks)
        logs.append("🔒 Webhook config saved to `webhooks_config.json`")

        emb = discord.Embed(
            title="⚡ Starlit Infrastructure Complete!",
            description=(
                "All systems operational. New orders will auto-post to pipeline channels "
                "and private threads in `#ticket-hub`.\n\n"
                + "\n".join(logs)
            ),
            color=0x10b981, timestamp=datetime.utcnow()
        )
        emb.add_field(name="🎫 Client Threads", value=f"{hub.mention} — private thread per order", inline=False)
        emb.add_field(name="📊 Next Step",      value="Use `!pipeline` to check order status, `!ticket <id>` to open a client thread.", inline=False)
        emb.set_footer(text="Starlit Siege Works • Operations online")
        await msg.edit(embed=emb)

    except Exception as ex:
        await msg.edit(embed=discord.Embed(
            title="🔴 Setup Failed", description=f"`{ex}`", color=0xef4444))

@build_loggers.error
async def bl_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send(embed=discord.Embed(
            title="🚫 Access Denied",
            description="`!build_loggers` requires **Administrator** permissions.",
            color=0xef4444))

# ── Bot runner ─────────────────────────────────────────────────────────────────
async def start_discord_bot():
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        print("[BOT] No DISCORD_BOT_TOKEN found. Bot aborted.")
        return
    try:
        await bot.start(token)
    except Exception as e:
        print(f"[BOT] Terminated: {e}")

