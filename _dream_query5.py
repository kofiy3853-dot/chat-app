import sqlite3, json, time

DB = r"C:\Users\Me\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

seven_days_ago_ms = int((time.time() - 7*24*3600) * 1000)

# Check part table structure
print("=== SAMPLE PART DATA ===")
cur.execute("""
    SELECT p.id, p.message_id, p.data
    FROM part p
    WHERE p.session_id IN (
        SELECT id FROM session 
        WHERE directory LIKE '%chat app%'
        AND title NOT LIKE 'checkpoint-writer%'
    )
    ORDER BY p.time_created DESC
    LIMIT 5
""")
for r in cur.fetchall():
    d = json.loads(r['data'])
    keys = list(d.keys())
    t = d.get('type', '?')
    text = d.get('text', '')
    if t == 'text':
        preview = str(text)[:300]
    elif t == 'tool':
        tool_name = d.get('tool', '?')
        state = d.get('state', {})
        inp = str(state.get('input', ''))[:150]
        out = str(state.get('output', ''))[:150]
        preview = f"tool={tool_name} input={inp} output={out}"
    else:
        preview = str(d)[:300]
    print(f"  type={t} keys={keys}")
    print(f"  preview: {preview}")
    print(f"  ---")

# Get user text parts (not tool calls)
print("\n=== USER TEXT PARTS with decision keywords ===")
cur.execute("""
    SELECT p.id, p.session_id, p.time_created, p.data
    FROM part p
    WHERE p.session_id IN (
        SELECT id FROM session 
        WHERE directory LIKE '%chat app%'
          AND title NOT LIKE 'checkpoint-writer%'
    )
    AND json_extract(p.data, '$.type') = 'text'
    ORDER BY p.time_created DESC
""")
keywords = ['always', 'never', 'remember', 'rule', 'decision', 'decided', 'prefer', 'should', 'must', 'don\'t', 'do not', 'use the', 'use a', 'no more', 'stop', 'fix this']

found = 0
for r in cur.fetchall():
    d = json.loads(r['data'])
    text = d.get('text', '')
    if any(kw in text.lower() for kw in keywords):
        found += 1
        preview = text[:400]
        print(f"\n  [session {r['session_id']} | time={r['time_created']}]")
        print(f"  {preview}")
        print(f"  ---")
        if found >= 20:
            break

if found == 0:
    print("  (no matches)")

conn.close()
