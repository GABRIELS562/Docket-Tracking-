import bcrypt from 'bcryptjs';
import { DatabaseService } from '../services/DatabaseService';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  const db = DatabaseService.getInstance();
  
  try {
    await db.initialize();
    console.log('✅ Database connected');
    
    // Check if admin user already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@dockettrack.gov']
    );
    
    if (existing.rows.length > 0) {
      console.log('⚠️  Admin user already exists');
      
      // Update the password to ensure it's correct
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(
        'UPDATE users SET password_hash = $1, is_active = true WHERE email = $2',
        [hashedPassword, 'admin@dockettrack.gov']
      );
      console.log('✅ Admin password updated');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const result = await db.query(
        `INSERT INTO users (email, password_hash, role, is_active, created_at)
         VALUES ($1, $2, $3, true, NOW())
         RETURNING id, email, role`,
        ['admin@dockettrack.gov', hashedPassword, 'admin']
      );
      
      console.log('✅ Admin user created:', result.rows[0]);
    }
    
    // Create a test user as well
    const testExisting = await db.query(
      'SELECT id FROM users WHERE email = $1',
      ['test@dockettrack.gov']
    );
    
    if (testExisting.rows.length === 0) {
      const testHashedPassword = await bcrypt.hash('test123', 10);
      await db.query(
        `INSERT INTO users (email, password_hash, role, is_active, created_at)
         VALUES ($1, $2, $3, true, NOW())`,
        ['test@dockettrack.gov', testHashedPassword, 'user']
      );
      console.log('✅ Test user created: test@dockettrack.gov / test123');
    }
    
    console.log('\n📝 Login Credentials:');
    console.log('   Admin: admin@dockettrack.gov / admin123');
    console.log('   Test:  test@dockettrack.gov / test123');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();