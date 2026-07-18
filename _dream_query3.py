import sqlite3, json, time

DB = r"C:\Users\Me\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

seven_days_ago_ms = int((time.time() - 7*24*3600) * 1000)

# Search for user messages with decision/rule/pattern keywords across all chat app sessions
keywords = ['always', 'never', 'remember', 'rule', 'decision', 'decided', 'prefer', 'use', 'should', 'must', 'don\'t', 'do not']

print("=== USER MESSAGES with decision/rule keywords (recent sessions) ===")
cur.execute("""
    SELECT m.id, m.session_id, m.time_created, json_extract(m.data, '$.role') as role, 
           json_extract(m.data, '$.content') as content
    FROM message m
    WHERE m.session_id IN (
        SELECT id FROM session 
        WHERE directory LIKE '%chat app%'
          AND title NOT LIKE 'checkpoint-writer%'
          AND time_created > ?
    )
    AND json_extract(m.data, '$.role') = 'user'
    ORDER BY m.time_created DESC
    LIMIT 50
""", (seven_days_ago_ms,))

for r in cur.fetchall():
    content = r['content'] or ''
    if any(kw in content.lower() for kw in keywords):
        # Truncate long messages
        preview = content[:300] if len(content) > 300 else content
        print(f"\n  [session {r['session_id']} | {r['time_created']}]")
        print(f"  {preview}")
        print(f"  ---")

conn.close()
