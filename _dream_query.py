import sqlite3, json, os

DB = r"C:\Users\Me\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# 1. List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("=== TABLES ===")
print(tables)

# 2. Schema for key tables
for t in ['session', 'message', 'part']:
    if t in tables:
        cur.execute(f"PRAGMA table_info({t})")
        cols = [(r['name'], r['type']) for r in cur.fetchall()]
        print(f"\n=== {t} columns ===")
        print(cols)

# 3. Find this project's sessions (workspace = chat app)
print("\n=== RECENT SESSIONS (last 30) ===")
cur.execute("""
    SELECT id, directory, title, time_created 
    FROM session 
    ORDER BY time_created DESC 
    LIMIT 30
""")
for r in cur.fetchall():
    print(f"  {r['id']} | dir={r['directory']} | title={r['title']} | time={r['time_created']}")

# 4. Find sessions related to "chat app" project
print("\n=== SESSIONS matching 'chat app' ===")
cur.execute("""
    SELECT id, directory, title, time_created 
    FROM session 
    WHERE directory LIKE '%chat app%' OR directory LIKE '%chat-app%'
    ORDER BY time_created DESC 
    LIMIT 20
""")
for r in cur.fetchall():
    print(f"  {r['id']} | dir={r['directory']} | title={r['title']} | time={r['time_created']}")

conn.close()
