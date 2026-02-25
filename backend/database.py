import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "dte_app"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME", "dte_rajasthan"),
    "autocommit": False,
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}

connection_pool = pooling.MySQLConnectionPool(
    pool_name="dte_pool",
    pool_size=10,
    **db_config
)


def get_db():
    """Get a connection from the pool."""
    return connection_pool.get_connection()


def execute_query(query, params=None, fetch=True, commit=False):
    """Execute a query safely with parameterized inputs."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params or ())
        if commit:
            conn.commit()
        if fetch:
            return cursor.fetchall()
        return cursor.lastrowid
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def execute_one(query, params=None, commit=False):
    """Execute a query and return one result."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params or ())
        if commit:
            conn.commit()
        return cursor.fetchone()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()