import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
print("Connection successful!")

cur = conn.cursor()
print("Cursor created successfully!")

cur.close()
conn.close()
print("Connection closed successfully!")