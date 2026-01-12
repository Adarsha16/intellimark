"""
Script to make a user an admin.
Usage: python make_admin.py <user_email>
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.group import Group, user_groups  # Import to resolve relationships


async def make_admin(email: str):
    """Make a user an admin by their email."""
    async with AsyncSessionLocal() as db:
        # Find the user
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user:
            print(f"[ERROR] User with email '{email}' not found!")
            return
        
        # Update role to admin
        user.role = "admin"
        await db.commit()
        await db.refresh(user)
        
        print(f"[SUCCESS] Successfully made '{email}' an admin!")
        print(f"   User ID: {user.id}")
        print(f"   Role: {user.role}")


async def list_users():
    """List all users and their roles."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        if not users:
            print("No users found in the database.")
            return
        
        print("\n[LIST] All Users:")
        print("-" * 60)
        for user in users:
            role_icon = "[ADMIN]" if user.role == "admin" else "[USER]"
            print(f"{role_icon} {user.email} (ID: {user.id}) - Role: {user.role}")
        print("-" * 60)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python make_admin.py <user_email>  - Make a user admin")
        print("  python make_admin.py --list        - List all users")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        asyncio.run(list_users())
    else:
        email = sys.argv[1]
        asyncio.run(make_admin(email))
