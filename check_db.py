import sqlite3

conn = sqlite3.connect("instance/database.db")
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()

print("Tables in database:")
for table in tables:
    print(" -", table[0])
    