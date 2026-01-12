import asyncio
from sqlalchemy import text
import sys
import os

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from app.db.session import engine

async def main():
    try:
        async with engine.begin() as conn:
            # Check current version
            try:
                result = await conn.execute(text("SELECT version_num FROM alembic_version"))
                current = result.scalar()
                print(f"Current version found: {current}")
            except Exception as e:
                print(f"Error checking version: {e}")
                # If table doesn't exist or empty, handle it? 
                # Assuming table exists as per error logs.

            # Update to 0e96eecb3279
            print("Updating version to '0e96eecb3279'...")
            await conn.execute(text("UPDATE alembic_version SET version_num = '0e96eecb3279'"))
            print("Successfully updated version to '0e96eecb3279'")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
