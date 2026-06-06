pub mod schema;
pub mod operations;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Lock error")]
    Lock,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Create or open database with WAL mode enabled
    pub fn new(db_path: &Path) -> Result<Self, DbError> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(db_path)?;

        // Enable WAL mode for concurrent reads/writes
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA synchronous=NORMAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let db = Self {
            conn: Mutex::new(conn),
        };

        // Initialize schema
        db.init_schema()?;

        Ok(db)
    }

    /// Initialize all database tables
    fn init_schema(&self) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|_| DbError::Lock)?;
        schema::create_tables(&conn)?;
        Ok(())
    }

    /// Get a lock on the connection for operations
    pub fn connection(&self) -> Result<std::sync::MutexGuard<Connection>, DbError> {
        self.conn.lock().map_err(|_| DbError::Lock)
    }
}
