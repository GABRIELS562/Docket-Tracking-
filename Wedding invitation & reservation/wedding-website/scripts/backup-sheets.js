#!/usr/bin/env node

// Google Sheets backup script for wedding RSVP data

import fs from 'fs';
import path from 'path';
import axios from 'axios';

const BACKUP_DIR = 'backups';
const MAX_BACKUPS = 30; // Keep 30 days of backups

// Configuration from environment
const SPREADSHEET_ID = process.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
const API_KEY = process.env.VITE_GOOGLE_SHEETS_API_KEY;

// Backup configuration
const SHEETS_TO_BACKUP = [
  'Guest RSVPs',
  'Meal Counts',
  'Email Log',
  'Guest List'
];

async function createBackup() {
  console.log('🔄 Starting Google Sheets backup...');
  
  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('❌ Missing Google Sheets configuration');
    console.error('Please set VITE_GOOGLE_SHEETS_SPREADSHEET_ID and VITE_GOOGLE_SHEETS_API_KEY');
    process.exit(1);
  }
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(BACKUP_DIR, `backup-${timestamp}`);
  
  try {
    fs.mkdirSync(backupFolder);
    
    console.log(`📁 Created backup folder: ${backupFolder}`);
    
    // Backup each sheet
    for (const sheetName of SHEETS_TO_BACKUP) {
      await backupSheet(sheetName, backupFolder);
    }
    
    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      spreadsheetId: SPREADSHEET_ID,
      sheets: SHEETS_TO_BACKUP,
      totalSheets: SHEETS_TO_BACKUP.length,
      backupVersion: '1.0.0'
    };
    
    fs.writeFileSync(
      path.join(backupFolder, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('✅ Backup completed successfully');
    console.log(`📦 Backup saved to: ${backupFolder}`);
    
    // Clean up old backups
    await cleanupOldBackups();
    
    // Generate backup report
    generateBackupReport(backupFolder, metadata);
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    
    // Clean up failed backup folder
    if (fs.existsSync(backupFolder)) {
      fs.rmSync(backupFolder, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

async function backupSheet(sheetName, backupFolder) {
  console.log(`📄 Backing up sheet: ${sheetName}`);
  
  try {
    // Get sheet data as CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    
    const response = await axios.get(csvUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Wedding-Website-Backup/1.0'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch sheet data: ${response.status}`);
    }
    
    // Save CSV file
    const fileName = `${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    const filePath = path.join(backupFolder, fileName);
    
    fs.writeFileSync(filePath, response.data);
    
    // Get sheet metadata using Sheets API
    try {
      const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}&fields=sheets(properties(title,sheetId,gridProperties))`;
      const metadataResponse = await axios.get(metadataUrl);
      
      const sheetMetadata = metadataResponse.data.sheets?.find(
        sheet => sheet.properties.title === sheetName
      );
      
      if (sheetMetadata) {
        const metadataFile = `${fileName.replace('.csv', '_metadata.json')}`;
        fs.writeFileSync(
          path.join(backupFolder, metadataFile),
          JSON.stringify(sheetMetadata, null, 2)
        );
      }
    } catch (metadataError) {
      console.warn(`⚠️  Could not fetch metadata for ${sheetName}:`, metadataError.message);
    }
    
    console.log(`✅ ${sheetName} backed up successfully`);
    
  } catch (error) {
    console.error(`❌ Failed to backup ${sheetName}:`, error.message);
    throw error;
  }
}

async function cleanupOldBackups() {
  console.log('🧹 Cleaning up old backups...');
  
  try {
    const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
    const backupFolders = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
      .map(entry => ({
        name: entry.name,
        path: path.join(BACKUP_DIR, entry.name),
        created: fs.statSync(path.join(BACKUP_DIR, entry.name)).birthtime
      }))
      .sort((a, b) => b.created - a.created); // Sort by newest first
    
    if (backupFolders.length > MAX_BACKUPS) {
      const foldersToDelete = backupFolders.slice(MAX_BACKUPS);
      
      for (const folder of foldersToDelete) {
        console.log(`🗑️  Removing old backup: ${folder.name}`);
        fs.rmSync(folder.path, { recursive: true, force: true });
      }
      
      console.log(`✅ Cleaned up ${foldersToDelete.length} old backups`);
    } else {
      console.log(`📊 Currently have ${backupFolders.length} backups (max: ${MAX_BACKUPS})`);
    }
    
  } catch (error) {
    console.warn('⚠️  Failed to cleanup old backups:', error.message);
  }
}

function generateBackupReport(backupFolder, metadata) {
  console.log('\n📊 Backup Report:');
  console.log('================');
  console.log(`Timestamp: ${metadata.timestamp}`);
  console.log(`Sheets backed up: ${metadata.totalSheets}`);
  
  // Calculate backup size
  const files = fs.readdirSync(backupFolder);
  let totalSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(backupFolder, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    
    console.log(`  📄 ${file}: ${formatFileSize(stats.size)}`);
  });
  
  console.log(`Total backup size: ${formatFileSize(totalSize)}`);
  console.log('================\n');
  
  // Save report to file
  const report = {
    ...metadata,
    files: files.map(file => {
      const filePath = path.join(backupFolder, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size)
      };
    }),
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize)
  };
  
  fs.writeFileSync(
    path.join(backupFolder, 'backup-report.json'),
    JSON.stringify(report, null, 2)
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Restore function for emergency recovery
async function restoreFromBackup(backupPath) {
  console.log(`🔄 Starting restore from backup: ${backupPath}`);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup path does not exist: ${backupPath}`);
    process.exit(1);
  }
  
  // Load metadata
  const metadataPath = path.join(backupPath, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Backup metadata not found');
    process.exit(1);
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  
  console.log('⚠️  RESTORE OPERATION');
  console.log('This will overwrite current data in Google Sheets!');
  console.log(`Backup from: ${metadata.timestamp}`);
  console.log(`Sheets to restore: ${metadata.sheets.join(', ')}`);
  
  // In a real implementation, you would:
  // 1. Authenticate with Google Sheets API using service account
  // 2. Clear existing data in sheets
  // 3. Upload CSV data to respective sheets
  // 4. Verify data integrity
  
  console.log('🚧 Restore functionality requires manual implementation');
  console.log('Please contact your developer for assistance with data restoration.');
}

// Command line interface
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'backup':
    createBackup();
    break;
    
  case 'restore':
    if (!arg) {
      console.error('❌ Please specify backup path for restore');
      console.log('Usage: node backup-sheets.js restore <backup-path>');
      process.exit(1);
    }
    restoreFromBackup(arg);
    break;
    
  case 'list':
    listBackups();
    break;
    
  default:
    console.log('Wedding Website - Google Sheets Backup Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node backup-sheets.js backup              - Create new backup');
    console.log('  node backup-sheets.js restore <path>      - Restore from backup');
    console.log('  node backup-sheets.js list                - List available backups');
    console.log('');
    console.log('Examples:');
    console.log('  node backup-sheets.js backup');
    console.log('  node backup-sheets.js restore backups/backup-2024-06-15T10-30-00-000Z');
    break;
}

function listBackups() {
  console.log('📋 Available Backups:');
  console.log('====================');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups found.');
    return;
  }
  
  const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
  const backupFolders = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
    .map(entry => {
      const folderPath = path.join(BACKUP_DIR, entry.name);
      const stats = fs.statSync(folderPath);
      
      // Try to read metadata
      let metadata = null;
      const metadataPath = path.join(folderPath, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (error) {
          // Ignore metadata read errors
        }
      }
      
      return {
        name: entry.name,
        path: folderPath,
        created: stats.birthtime,
        metadata
      };
    })
    .sort((a, b) => b.created - a.created);
  
  if (backupFolders.length === 0) {
    console.log('No backups found.');
    return;
  }
  
  backupFolders.forEach((backup, index) => {
    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   Created: ${backup.created.toISOString()}`);
    console.log(`   Path: ${backup.path}`);
    
    if (backup.metadata) {
      console.log(`   Sheets: ${backup.metadata.totalSheets}`);
    }
    
    console.log('');
  });
}