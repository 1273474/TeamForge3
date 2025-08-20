const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../../database.sqlite');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('📦 Connected to SQLite database');
});

// Create tables
const createTables = () => {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      picture TEXT,
      google_id TEXT UNIQUE NOT NULL,
      google_user_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Teams table
    `CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`,

    // Team members table
    `CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(team_id, user_id)
    )`,

    // Messages table
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id TEXT,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'user',
      mentioned_users TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )`,

    // Tasks table
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      assigned_to TEXT,
      created_by TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // Task comments table
    `CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`
  ];

  db.serialize(() => {
    tables.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err) {
          console.error(`Error creating table ${index + 1}:`, err.message);
        } else {
          console.log(`✅ Table ${index + 1} created successfully`);
        }
      });
    });

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_team_id ON messages(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)'
    ];

    indexes.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err) {
          console.error(`Error creating index ${index + 1}:`, err.message);
        } else {
          console.log(`📊 Index ${index + 1} created successfully`);
        }
      });
    });
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('🎉 Database initialization completed successfully!');
      console.log('📍 Database location:', dbPath);
    }
  });
};

createTables();
