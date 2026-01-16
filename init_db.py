from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, User
from app.database import SQLALCHEMY_DATABASE_URL
from app.auth import get_password_hash

def init_db():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Check if admin exists
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        print("Creating default admin user...")
        hashed_password = get_password_hash("admin123")
        admin = User(
            username="admin",
            hashed_password=hashed_password,
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("Admin user created: username='admin', password='admin123'")
    else:
        print("Admin user already exists.")

    db.close()

if __name__ == "__main__":
    init_db()
