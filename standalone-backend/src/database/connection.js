const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection singleton
class Database {
  constructor() {
    this.db = null;
    this.connect();
  }

  connect() {
    const dbPath = path.join(__dirname, '../../database.sqlite');
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection failed:', err.message);
      } else {
        console.log('📦 Connected to SQLite database');
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
      }
    });
  }

  getDb() {
    return this.db;
  }

  // Promise wrapper for database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
module.exports = new Database();
