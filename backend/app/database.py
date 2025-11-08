import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# lấy DATABASE_URL từ env; nếu không có, build URL từ biến phụ hoặc fallback sqlite
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    host = os.getenv("DB_HOST", os.getenv("POSTGRES_HOST", "localhost"))  # default localhost
    port = os.getenv("POSTGRES_PORT", "5432")
    dbname = os.getenv("POSTGRES_DB", "luna")
    DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

# cố gắng kết nối; nếu fail (dev), fallback sang sqlite để app chạy được
try:
    engine = create_engine(DATABASE_URL, future=True)
except Exception:
    DATABASE_URL = "sqlite:///./dev.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
