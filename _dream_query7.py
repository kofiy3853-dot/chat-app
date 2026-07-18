import sqlite3, json, time

DB = r"C:\Users\Me\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get all user text parts from the most important sessions
# ses_096f822c9ffeE2q4Xnd5UUqsjB = "App analysis" (has test suite implementation)
# ses_09745e5b6ffeBCOXfR9iyVFjwu = "Folder analysis" (cleanup, navbar, performance)
# ses_09be9fa89ffeL4d7kWAbqI4z3Z = "Folder analysis" (Morph integration, security)

sessions = [
    ('ses_096f822c9ffeE2q4Xnd5UUqsjB', 'App analysis - test suite'),
    ('ses_09745e5b6ffeBCOXfR9iyVFjwu', 'Folder analysis - cleanup/perf'),
    ('ses_09be9fa89ffeL4d7kWAbqI4z3Z', 'Folder analysis - Morph integration'),
]

for sid, label in sessions:
    print(f"\n{'='*60}")
    print(f"  {label} ({sid})")
    print(f"{'='*60}")
    
    # Get ALL user parts in order (text + tool results with user-like content)
    cur.execute("""
        SELECT p.time_created, p.data
        FROM part p
        WHERE p.session_id = ?
        ORDER BY p.time_created ASC
    """, (sid,))
    
    all_parts = []
    for r in cur.fetchall():
        d = json.loads(r['data'])
        ptype = d.get('type', '')
        text = d.get('text', '')
        if ptype == 'text' and text:
            all_parts.append(('text', text, r['time_created']))
    
    for ptype, text, ts in all_parts:
        # Show user-like messages (short, imperative, or decision-like)
        if len(text) < 500 and not text.startswith('<system-reminder>') and not text.startswith('You are doing'):
            preview = text[:300].replace('\n', ' ')
            print(f"  [{ts}] {preview}")

conn.close()
