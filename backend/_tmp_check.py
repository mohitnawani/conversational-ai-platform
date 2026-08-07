import sqlite3

db = sqlite3.connect(r"instance\memory.db")
c = db.cursor()
c.execute("SELECT id, name, email FROM users")
print("USERS:")
for r in c.fetchall():
    print(" ", r)
c.execute("SELECT u.name, u.email FROM conversations v LEFT JOIN users u ON u.id = v.user_id")
print("\nSAMPLE CONV -> OWNER:")
for r in c.fetchall():
    print(" ", r)