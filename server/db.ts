import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'certificates.sqlite');

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Initialize schema
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      background_data TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      elements_json TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      batch_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      course_name TEXT NOT NULL,
      student_count INTEGER NOT NULL,
      template_id TEXT,
      template_name TEXT,
      issue_date TEXT NOT NULL,
      students_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      certificate_number TEXT UNIQUE NOT NULL,
      student_name TEXT NOT NULL,
      course_name TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      batch_name TEXT,
      template_id TEXT,
      verification_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'valid',
      revoked_reason TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mark_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      batch_code TEXT,
      session_date TEXT NOT NULL,
      evaluator_name TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  saveDatabase(dbInstance);
  return dbInstance;
}

export function saveDatabase(db: Database) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}
