import sqlite3, json, time

DB = r"C:\Users\Me\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

seven_days_ago_ms = int((time.time() - 7*24*3600) * 1000)

# First check message data format
print("=== SAMPLE MESSAGE DATA ===")
cur.execute("""
    SELECT data FROM message 
    WHERE session_id IN (
        SELECT id FROM session 
        WHERE directory LIKE '%chat app%'
        AND title NOT LIKE 'checkpoint-writer%'
    )
    AND json_extract(data, '$.role') = 'user'
    ORDER BY time_created DESC
    LIMIT 3
""")
for r in cur.fetchall():
    d = json.loads(r['data'])
    # Show keys and content preview
    keys = list(d.keys())
    content = d.get('content', d.get('text', d.get('message', '')))
    if isinstance(content, list):
        # Multi-part content
        text_parts = [p.get('text', '') for p in content if isinstance(p, dict) and p.get('type') == 'text']
        content = ' '.join(text_parts)
    print(f"  Keys: {keys}")
    preview = str(content)[:500]
    print(f"  Content preview: {preview}")
    print(f"  ---")

# Now search for user messages with decision keywords
print("\n=== USER MESSAGES with decision/rule keywords ===")
cur.execute("""
    SELECT m.id, m.session_id, m.time_created, m.data
    FROM message m
    WHERE m.session_id IN (
        SELECT id FROM session 
        WHERE directory LIKE '%chat app%'
          AND title NOT LIKE 'checkpoint-writer%'
          AND time_created > ?
    )
    AND json_extract(m.data, '$.role') = 'user'
    ORDER BY m.time_created DESC
""", (seven_days_ago_ms,))

keywords = ['always', 'never', 'remember', 'rule', 'decision', 'decided', 'prefer', 'should', 'must', 'don\'t', 'do not', 'use the', 'use a', 'no more', 'stop', 'fix this']

found = 0
for r in cur.fetchall():
    d = json.loads(r['data'])
    content = d.get('content', d.get('text', d.get('message', '')))
    if isinstance(content, list):
        text_parts = [p.get('text', '') for p in content if isinstance(p, dict) and p.get('type') == 'text']
        content = ' '.join(text_parts)
    content = str(content)
    if any(kw in content.lower() for kw in keywords):
        found += 1
        preview = content[:400]
        print(f"\n  [session {r['session_id']} | time={r['time_created']}]")
        print(f"  {preview}")
        print(f"  ---")
        if found >= 25:
            break

if found == 0:
    print("  (no matches)")

# Get assistant messages about decisions
print("\n=== ASSISTANT MESSAGES about decisions/architecture ===")
cur.execute("""
    SELECT m.id, m.session_id, m.time_created, m.data
    FROM message m
    WHERE m.session_id IN (
        SELECT id FROM session 
        WHERE directory LIKE '%chat app%'
          AND title NOT LIKE 'checkpoint-writer%'
          AND time_created > ?
    )
    AND json_extract(m.data, '$.role') = 'assistant'
    AND m.agent_id = ''
    ORDER BY m.time_created DESC
""", (seven_days_ago_ms,))

decision_kw = ['decision', 'decided', 'architecture', 'pattern', 'recommend', 'approach', 'tradeoff', 'trade-off']
found2 = 0
for r in cur.fetchall():
    d = json.loads(r['data'])
    content = d.get('content', d.get('text', d.get('message', '')))
    if isinstance(content, list):
        text_parts = [p.get('text', '') for p in content if isinstance(p, dict) and p.get('type') == 'text']
        content = ' '.join(text_parts)
    content = str(content)
    if any(kw in content.lower() for kw in decision_kw):
        found2 += 1
        preview = content[:400]
        print(f"\n  [session {r['session_id']} | time={r['time_created']}]")
        print(f"  {preview}")
        print(f"  ---")
        if found2 >= 15:
            break

if found2 == 0:
    print("  (no matches)")

conn.close()
