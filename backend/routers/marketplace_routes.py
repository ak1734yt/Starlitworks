from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import json
import time
from database import get_db
from auth import get_current_user, get_optional_user, require_admin, create_notification, send_modular_webhook

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class OnboardingBody(BaseModel):
    discord_username: str
    server_genre: str
    customization_details: str
    budget: str
    timeline: str

class BlogCreateBody(BaseModel):
    title: str
    slug: str
    content: str
    category: str = "General"

class TemplateCreateBody(BaseModel):
    title: str
    description: Optional[str] = ""
    price: float
    template_link: str
    roles_json: Optional[str] = "[]"
    channels_json: Optional[str] = "[]"

# ── FAQ List ──────────────────────────────────────────────────────────────────
DEFAULT_FAQS = [
    {
        "id": 1,
        "question": "What services does Starlit Siege Works provide?",
        "answer": "We offer premium custom Discord bot development, full-scale Discord server creation (moderation setup, community systems, gaming integrations), custom web dashboards, and community growth marketing consultancy."
    },
    {
        "id": 2,
        "question": "How do Discord server templates work?",
        "answer": "Once you purchase a server template from our Marketplace, and your payment is verified, you will instantly receive a 'discord.new' creation link. Clicking this link lets you duplicate the exact role structure, channels, and permissions into a brand-new Discord server instantly!"
    },
    {
        "id": 3,
        "question": "Are the payment plans flexible?",
        "answer": "Yes! We offer single-payment plans, advance milestones (50% upfront, 50% on delivery), and custom installment plans depending on project scope."
    },
    {
        "id": 4,
        "question": "How do you ensure my Discord server is secure?",
        "answer": "We install advanced anti-raid systems, proper hierarchy for server roles, strict channel overrides, secure webhook pipelines, and verified moderation bots to defend against spam and rogue accounts."
    },
    {
        "id": 5,
        "question": "Can I request changes or maintenance after delivery?",
        "answer": "Absolutely! We offer ongoing retainer plans that include regular updates, uptime monitoring, bug fixes, and active configuration support."
    }
]

# ── Onboarding Endpoint ────────────────────────────────────────────────────────
@router.post("/onboarding")
def save_onboarding(body: OnboardingBody, user=Depends(get_current_user)):
    db = get_db()
    
    # 1. Fetch current details
    row = db.execute("SELECT details FROM auth.users WHERE id = ?", (user["id"],)).fetchone()
    current_details = {}
    if row and row["details"]:
        try:
            current_details = json.loads(row["details"])
        except Exception:
            pass
            
    # 2. Update details
    current_details["onboarded"] = True
    current_details["discord_username"] = body.discord_username
    current_details["server_genre"] = body.server_genre
    current_details["customization_details"] = body.customization_details
    current_details["budget"] = body.budget
    current_details["timeline"] = body.timeline
    current_details["onboarded_at"] = int(time.time())
    
    db.execute("UPDATE auth.users SET details = ?, phone = ? WHERE id = ?", (json.dumps(current_details), body.discord_username, user["id"]))
    db.commit()
    db.close()
    
    create_notification(
        user_id=user["id"],
        title="🎉 Onboarding Complete!",
        message="Your client onboarding questionnaire has been submitted successfully. Welcome to Starlit Siege Works!",
        type_="success"
    )
    
    return {"success": True, "message": "Onboarding information saved."}

# ── FAQ Endpoint ─────────────────────────────────────────────────────────────
@router.get("/faq")
def get_faqs():
    return DEFAULT_FAQS

# ── Blog Endpoints ────────────────────────────────────────────────────────────
@router.get("/blogs")
def get_blogs():
    db = get_db()
    rows = db.execute("SELECT * FROM shop.blogs WHERE is_deleted = 0 ORDER BY created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/blogs/{slug}")
def get_blog_by_slug(slug: str):
    db = get_db()
    row = db.execute("SELECT * FROM shop.blogs WHERE slug = ? AND is_deleted = 0", (slug,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Blog article not found")
    return dict(row)

@router.post("/blogs")
def create_or_update_blog(body: BlogCreateBody, user=Depends(require_admin)):
    db = get_db()
    # Check if slug exists to update or insert
    existing = db.execute("SELECT id FROM shop.blogs WHERE slug = ?", (body.slug,)).fetchone()
    if existing:
        db.execute("""
            UPDATE shop.blogs 
            SET title = ?, content = ?, category = ?, is_deleted = 0 
            WHERE slug = ?
        """, (body.title, body.content, body.category, body.slug))
    else:
        db.execute("""
            INSERT INTO shop.blogs (title, slug, content, category)
            VALUES (?, ?, ?, ?)
        """, (body.title, body.slug, body.content, body.category))
    db.commit()
    db.close()
    return {"success": True, "message": "Blog article published successfully."}

# ── Templates Marketplace Endpoints ──────────────────────────────────────────
@router.get("/marketplace/templates")
def get_templates(user=Depends(get_optional_user)):
    db = get_db()
    rows = db.execute("SELECT id, title, description, price, roles_json, channels_json, template_link FROM shop.templates WHERE is_deleted = 0").fetchall()
    
    # Fetch purchased template IDs if user is logged in
    purchased_ids = set()
    if user:
        orders = db.execute("""
            SELECT service_id FROM orders.orders 
            WHERE user_id = ? AND (payment_status = 'verified' OR payment_status = 'completed' OR status = 'completed')
        """, (user["id"],)).fetchall()
        for o in orders:
            srv_id = o["service_id"]
            if srv_id.startswith("template_"):
                try:
                    purchased_ids.add(int(srv_id.replace("template_", "")))
                except ValueError:
                    pass
    db.close()
    
    res = []
    for r in rows:
        d = dict(r)
        has_purchased = d["id"] in purchased_ids
        d["has_purchased"] = has_purchased
        if not has_purchased:
            d["template_link"] = None
            
        try:
            d["roles"] = json.loads(d["roles_json"])
            d["channels"] = json.loads(d["channels_json"])
        except Exception:
            d["roles"] = []
            d["channels"] = []
        del d["roles_json"]
        del d["channels_json"]
        res.append(d)
    return res

@router.get("/marketplace/templates/{template_id}")
def get_template_detail(template_id: int, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM shop.templates WHERE id = ? AND is_deleted = 0", (template_id,)).fetchone()
    
    if not row:
        db.close()
        raise HTTPException(404, "Template not found")
        
    template = dict(row)
    
    # Check purchase status
    purchased = db.execute("""
        SELECT id, payment_status, status FROM orders.orders 
        WHERE user_id = ? AND service_id = ? AND (payment_status = 'verified' OR payment_status = 'completed' OR status = 'completed')
    """, (user["id"], f"template_{template_id}")).fetchone()
    db.close()
    
    try:
        template["roles"] = json.loads(template["roles_json"])
        template["channels"] = json.loads(template["channels_json"])
    except Exception:
        template["roles"] = []
        template["channels"] = []
        
    del template["roles_json"]
    del template["channels_json"]
    
    # Secure the template link
    if not purchased:
        template["template_link"] = None
        template["has_purchased"] = False
    else:
        template["has_purchased"] = True
        
    return template

@router.post("/marketplace/templates/{template_id}/purchase")
async def purchase_template(template_id: int, user=Depends(get_current_user)):
    db = get_db()
    template = db.execute("SELECT * FROM shop.templates WHERE id = ? AND is_deleted = 0", (template_id,)).fetchone()
    
    if not template:
        db.close()
        raise HTTPException(404, "Template not found")
        
    # Check if there is already a pending or verified order for this template by this user
    existing_order = db.execute("""
        SELECT id, payment_status, status FROM orders.orders 
        WHERE user_id = ? AND service_id = ? AND status != 'rejected'
    """, (user["id"], f"template_{template_id}")).fetchone()
    
    if existing_order:
        db.close()
        return {"success": True, "order_id": existing_order["id"], "message": "Existing purchase order found."}
        
    # Create order
    title = template["title"]
    
    result = db.execute("""
        INSERT INTO orders.orders (user_id, service_id, service_name, server_link, description, timeline,
            discord_username, quoted_price, tax_rate, cgst, sgst, total_amount, payment_plan, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user["id"],
        f"template_{template_id}",
        f"Template: {title}",
        "",
        f"Custom quote request for server layout template '{title}' (ID: {template_id}).",
        "Flexible",
        user.get("name", "DiscordClient"),
        0.0,
        0.0, 0.0, 0.0, 0.0,
        "full",
        1
    ))
    db.commit()
    order_id = result.lastrowid
    db.close()
    
    # Send webhook alert
    await send_modular_webhook("ORDERS", {
        "embeds": [{
            "title": f"🛒 Template Quote Requested: #{order_id}",
            "description": f"**Client:** {user['name']}\n**Template:** {title}\n**Price:** Custom Quote (Talk to us)",
            "color": 3447003,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat()
        }]
    })
    
    create_notification(
        user_id=user["id"],
        title="🛒 Template Quote Requested",
        message=f"Order #{order_id} for '{title}' template quote request has been created. Please talk to us in the order chat to get your custom price.",
        type_="info"
    )
    
    return {"success": True, "order_id": order_id}

@router.post("/marketplace/templates/admin")
def create_template(body: TemplateCreateBody, user=Depends(require_admin)):
    db = get_db()
    cursor = db.execute("""
        INSERT INTO shop.templates (title, description, price, roles_json, channels_json, template_link)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        body.title,
        body.description,
        body.price,
        body.roles_json,
        body.channels_json,
        body.template_link
    ))
    db.commit()
    new_id = cursor.lastrowid
    db.close()
    return {"success": True, "id": new_id, "message": "Template created successfully."}

@router.put("/marketplace/templates/admin/{template_id}")
def update_template(template_id: int, body: TemplateCreateBody, user=Depends(require_admin)):
    db = get_db()
    row = db.execute("SELECT id FROM shop.templates WHERE id = ? AND is_deleted = 0", (template_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "Template not found")
        
    db.execute("""
        UPDATE shop.templates
        SET title = ?, description = ?, price = ?, roles_json = ?, channels_json = ?, template_link = ?
        WHERE id = ?
    """, (
        body.title,
        body.description,
        body.price,
        body.roles_json,
        body.channels_json,
        body.template_link,
        template_id
    ))
    db.commit()
    db.close()
    return {"success": True, "message": "Template updated successfully."}

@router.delete("/marketplace/templates/admin/{template_id}")
def delete_template(template_id: int, user=Depends(require_admin)):
    db = get_db()
    row = db.execute("SELECT id FROM shop.templates WHERE id = ? AND is_deleted = 0", (template_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "Template not found")
        
    db.execute("UPDATE shop.templates SET is_deleted = 1 WHERE id = ?", (template_id,))
    db.commit()
    db.close()
    return {"success": True, "message": "Template deleted successfully."}
