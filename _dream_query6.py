import sqlite3, json, time

DB = r"C:\Users\Me\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get all chat app sessions
print("=== ALL CHAT APP USER SESSIONS ===")
cur.execute("""
    SELECT id, title, time_created
    FROM session 
    WHERE directory LIKE '%chat app%'
      AND title NOT LIKE 'checkpoint-writer%'
      AND title NOT LIKE 'Auto Dream%'
    ORDER BY time_created DESC
""")
sessions = cur.fetchall()
for s in sessions:
    print(f"  {s['id']} | {s['title']} | {s['time_created']}")

# For each session, get user text parts (actual user input, not system reminders)
print("\n=== USER TEXT INPUT PER SESSION ===")
for s in sessions[:6]:
    cur.execute("""
        SELECT p.data
        FROM part p
        WHERE p.session_id = ?
        AND json_extract(p.data, '$.type') = 'text'
        ORDER BY p.time_created ASC
    """, (s['id'],))
    
    user_texts = []
    for r in cur.fetchall():
        d = json.loads(r['data'])
        text = d.get('text', '')
        # Skip system reminders and empty
        if text and not text.startswith('<system-reminder>') and len(text.strip()) > 10:
            user_texts.append(text)
    
    if user_texts:
        print(f"\n--- {s['title']} ({s['id']}) ---")
        for t in user_texts[:10]:
            preview = t[:300].replace('\n', ' ')
            print(f"  > {preview}")

conn.close()
