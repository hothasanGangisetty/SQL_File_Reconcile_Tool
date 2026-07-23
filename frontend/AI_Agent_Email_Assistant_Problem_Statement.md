# AI Agent for Local Email Triage & Action Detection
### Problem Statement, Constraints, and Solution Design

---

## 1. Background / Context

As part of exploring practical AI Agent architectures (building on fundamentals of tool-calling, agent loops, LangChain, and LangGraph), this project applies those concepts to a real, everyday workplace problem: **email overload in a corporate (banking) environment**, where:

- Access to Azure AD app registrations, API keys, and admin-consented permissions is **extremely restricted or impossible** to obtain as an intern/employee.
- The only guaranteed access point is a **locally signed-in Outlook desktop client** on a company laptop.
- The inbox contains a mix of **newsletters, automated notifications, and genuinely actionable emails** (e.g., teammates requesting reports), and manually triaging these daily is time-consuming and error-prone — actionable emails get buried.

---

## 2. Problem Statement

> Design and build a locally-run AI agent that reads emails from an already-authenticated Outlook desktop client (no API keys, no Azure app registration, no admin access), summarizes recent emails individually, distinguishes actionable emails from noise (newsletters/FYI), extracts concrete action items with deadlines, handles both HTML-formatted emails and image-based content correctly, and optionally runs continuously to process new incoming mail in real time — all within the access constraints typical of a regulated enterprise (bank) environment. Additionally, assess whether a similar approach is feasible for Microsoft Teams.

### Key constraints identified
| Constraint | Implication |
|---|---|
| No API keys / Azure AD app registration possible | Cloud Graph API access is off the table |
| Outlook is locally signed in | Local automation (not cloud API) is the only viable access path |
| Emails contain sensitive/internal content | Raw content should not be sent to external APIs without checking data governance policy |
| Mixed formatting (HTML, images, plain text) | Naive text extraction will produce noisy or incomplete results |
| Need for "always-on" awareness of new mail | Static one-time scripts aren't sufficient — needs a persistent/running process |

---

## 3. Solution Architecture (End-to-End)

```
Outlook Desktop (already signed in)
        ↓  [COM automation — pywin32]
Raw Email Object (Body / HTMLBody / Attachments)
        ↓  [Cleaning layer — BeautifulSoup]
Clean Text + Filtered Attachments
        ↓  [Conditional — OCR / Vision model, only if image content-heavy]
Enriched Email Content
        ↓  [LLM prompt — Claude API]
Structured Output: Summary + Actionable flag + Action item + Deadline
        ↓
Digest (Actionable list vs FYI list) → optionally pushed to Slack/console/file
```

---

## 4. Component-by-Component Solution

### 4.1 Reading Emails Without Any API Key

**Mechanism:** Windows COM automation via `pywin32`, which talks directly to the already-running, already-authenticated Outlook desktop application — functionally identical to a human manually opening emails, just scripted.

```python
import win32com.client

def get_recent_emails(count=10):
    outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
    inbox = outlook.GetDefaultFolder(6)  # 6 = Inbox
    messages = inbox.Items
    messages.Sort("[ReceivedTime]", True)

    emails = []
    for i, msg in enumerate(messages):
        if i >= count:
            break
        emails.append({
            "sender": msg.SenderName,
            "sender_email": msg.SenderEmailAddress,
            "subject": msg.Subject,
            "received": str(msg.ReceivedTime),
            "html_body": msg.HTMLBody,
            "plain_body": msg.Body,
            "has_attachments": msg.Attachments.Count > 0
        })
    return emails
```

**Why this works without credentials:** No cloud API call is made. The script talks to the local Outlook process using the identity it's already logged in as — no Azure AD app, no admin consent, no API key required.

**Searching by specific sender (on-demand, prompt-driven):**

```python
def search_emails_from_sender(sender_keyword, scan_count=50):
    outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
    inbox = outlook.GetDefaultFolder(6)
    messages = inbox.Items
    messages.Sort("[ReceivedTime]", True)

    matches = []
    for i, msg in enumerate(messages):
        if i >= scan_count:
            break
        if sender_keyword.lower() in msg.SenderName.lower() or sender_keyword.lower() in msg.SenderEmailAddress.lower():
            matches.append(msg)
    return matches
```

---

### 4.2 Handling HTML-Formatted Emails

**Problem:** `.Body` sometimes mangles structured content (tables, bullet lists); `.HTMLBody` is accurate but full of tags/CSS/tracking pixels that waste tokens.

**Solution:** Parse `.HTMLBody` with BeautifulSoup, strip non-content tags, and extract clean readable text.

```python
from bs4 import BeautifulSoup

def clean_html_body(html_content):
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    for tag in soup(["script", "style", "img", "head"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)
```

Preference order: use cleaned `HTMLBody` if present, fallback to `.Body`.

---

### 4.3 Handling Images in Emails

**Two categories identified:**

| Type | Examples | Treatment |
|---|---|---|
| Decorative | Logos, signature banners, tracking pixels | Ignore — filtered out by size/filename heuristics |
| Content-bearing | Screenshots, scanned documents, charts | Process via OCR or vision model |

**Filtering heuristic (avoid wasting time/tokens on every image):**

```python
def is_likely_content_image(attachment, size_threshold_kb=50):
    filename = attachment["filename"].lower()
    if any(x in filename for x in ["image001", "logo", "signature", "icon"]):
        return False
    if attachment["size_kb"] < size_threshold_kb:
        return False
    return filename.endswith((".png", ".jpg", ".jpeg"))
```

**Solution A — OCR (local, free, text-only extraction):**

```python
import pytesseract
from PIL import Image

def extract_text_from_image(image_path):
    img = Image.open(image_path)
    return pytesseract.image_to_string(img).strip()
```

**Solution B — Vision-capable LLM (better for charts/diagrams where layout/context matters, not just raw text):**

```python
import base64

def analyze_image_with_claude(image_path):
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}},
                {"type": "text", "text": "Describe what's in this image and extract any important text or numbers."}
            ]
        }]
    )
    return response.content[0].text
```

**Efficiency rule applied:** Only trigger image analysis when body text is very short (e.g., "see attached") AND a qualifying content image exists — avoids processing images for the majority of emails where they're irrelevant.

```python
def needs_image_analysis(body_text, image_paths):
    return len(body_text.strip()) < 50 and len(image_paths) > 0
```

---

### 4.4 Summarization + Actionable Detection (LLM Layer)

```python
def analyze_email(email):
    prompt = f"""
Analyze this email and respond in this exact format:

SUMMARY: (1-2 sentence summary of what this email is about)
IS_ACTIONABLE: (Yes/No — does this require me to DO something, e.g. send a report, reply, review, attend? Newsletters/FYI-only are NOT actionable)
ACTION_NEEDED: (if actionable, describe the action and any deadline mentioned; else "None")

From: {email['sender']} ({email['sender_email']})
Subject: {email['subject']}
Body: {email['body']}
"""
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
```

**Digest builder** separates actionable items from FYI noise:

```python
def build_digest(emails):
    actionable, fyi = [], []
    for email in emails:
        analysis = analyze_email(email)
        (actionable if "IS_ACTIONABLE: Yes" in analysis else fyi).append((email, analysis))
    return actionable, fyi
```

---

### 4.5 Running Continuously ("Alive" Agent)

Two solutions considered:

**Option A — Polling loop (simple, works everywhere):**
Checks for new emails every N seconds by comparing latest `ReceivedTime` against the last checkpoint. Runs until manually stopped with `Ctrl+C` (caught via `KeyboardInterrupt`).

**Option B — Event-driven (instant, more advanced):**
Uses Outlook's native COM event `OnNewMailEx`, which fires immediately when new mail arrives — no polling delay.

```python
class OutlookEventHandler:
    def OnNewMailEx(self, item_ids):
        outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
        for entry_id in item_ids.split(","):
            mail_item = outlook.GetItemFromID(entry_id)
            # process immediately: clean body, analyze, log/notify
```

**Recommendation:** Prototype with polling first (simpler to debug), then move to event-driven once stable.

| | Polling | Event-driven |
|---|---|---|
| Delay | Up to poll interval | Instant |
| Complexity | Low | Medium |
| Best for | Learning / prototyping | Stable daily-use version |

---

## 5. Microsoft Teams — Feasibility Assessment

**Finding:** Unlike Outlook, Teams has **no local COM automation equivalent**. The only official access path is the **Microsoft Graph API**, which requires:
- Azure AD app registration
- Permission scopes like `Chat.Read` / `ChannelMessage.Read.All`
- In most cases, **admin consent at the organization/tenant level**

**Feasibility ranked (most to least realistic):**
1. **Delegated permission self-consent test** — some tenants allow a user to consent to their *own* chat access without admin approval; worth a 10-minute test, but many regulated tenants (especially banks) disable this.
2. **Manual export** of individual conversations — not automatable, clunky.
3. **Screen-scraping/OCR automation** (e.g., `pyautogui` + OCR) — technically avoids APIs entirely but is fragile and likely against internal security policy for automated screen capture.

**Conclusion:** Teams automation is **not realistically buildable** without formal IT/security involvement in a bank environment — this is a genuine access/governance boundary, not a technical shortfall.

---

## 6. Data Governance Consideration (Cross-Cutting)

Regardless of technical feasibility, sending real internal email content (client names, financial data, project details) to an **external** LLM API may violate data governance policy. Recommended approach:
- Prototype/test using personal or non-sensitive test emails first.
- Check whether the organization has an **approved internal LLM gateway** (many banks now provide this specifically to allow AI use without external data exposure) before running this on real work inbox content.

---

## 7. Summary Table — Access Difficulty vs. Solution

| Component | Access Needed | Difficulty (Bank Environment) | Solution Used |
|---|---|---|---|
| Read Outlook emails | None (local COM) | Easy | `pywin32` COM automation |
| Search by sender | None (local COM) | Easy | Same COM object, filtered scan |
| Clean HTML emails | None | Easy | BeautifulSoup |
| Handle image attachments | None (local file access) | Easy | Size/filename heuristic + OCR or vision model |
| Summarize / detect actionability | LLM API key or internal gateway | Medium (governance-dependent) | Claude API prompt |
| Run continuously | None | Easy | Polling loop or COM event hook |
| Microsoft Teams equivalent | Graph API + admin consent | Hard / likely blocked | Not feasible without IT approval |

---

## 8. Key Takeaway

The core engineering insight from this exercise: **in enterprise/regulated environments, the hard part of building an AI agent is rarely the AI itself — it's working within access, credential, and data-governance constraints.** This project deliberately routes around cloud API restrictions by using local, already-authenticated desktop automation (a technique conceptually similar to RPA tools like UiPath), while explicitly identifying where a real boundary (Teams/Graph API) cannot be worked around without formal approval.
