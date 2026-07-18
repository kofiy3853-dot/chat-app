import sqlite3, json, os

DB = r"C:\Users\Me\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get real user sessions (not checkpoint-writer) for chat app project, last 7 days
# time_created is in ms. 7 days = 7*24*3600*1000 = 604800000
import time
seven_days_ago_ms = (time.time() - 7*24*3600) * 1000
print(f"=== Real user sessions (last 7 days, after {int(seven_days_ago_ms)}) ===")

cur.execute("""
    SELECT id, title, time_created, time_updated
    FROM session 
    WHERE directory LIKE '%chat app%'
      AND title NOT LIKE 'checkpoint-writer%'
      AND title NOT LIKE 'Auto Dream%'
      AND time_created > ?
    ORDER BY time_created DESC 
""", (int(seven_days_ago_ms),))
sessions = cur.fetchall()
for s in sessions:
    print(f"  {s['id']} | title={s['title']} | created={s['time_created']} | updated={s['time_updated']}")

# Get older sessions too for context
print("\n=== Older user sessions ===")
cur.execute("""
    SELECT id, title, time_created, time_updated
    FROM session 
    WHERE directory LIKE '%chat app%'
      AND title NOT LIKE 'checkpoint-writer%'
      AND title NOT LIKE 'Auto Dream%'
      AND time_created <= ?
    ORDER BY time_created DESC 
    LIMIT 10
""", (int(seven_days_ago_ms),))
for s in cur.fetchall():
    print(f"  {s['id']} | title={s['title']} | created={s['time_created']} | updated={s['time_updated']}")

conn.close()
