/**
 * User Management System Test
 * Tests user, role, and permission functionality
 */

const dotenv = require('dotenv');
dotenv.config();

const API_BASE = `http://localhost:${process.env.PORT || 3001}/api`;
let authToken = '';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

async function login() {
  console.log(`${colors.blue}Logging in...${colors.reset}`);
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@dockettrack.gov',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    if (data.success && data.data?.token) {
      authToken = data.data.token;
      console.log(`${colors.green}✓ Login successful${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Login failed: ${data.error}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Login error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testEndpoint(name, method, endpoint, body) {
  console.log(`\n${colors.yellow}Testing: ${name}${colors.reset}`);
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    if (response.ok && data.success !== false) {
      console.log(`${colors.green}✓ ${name} - Status: ${response.status}${colors.reset}`);
      if (data.data && Array.isArray(data.data)) {
        console.log(`  Found: ${data.data.length} items`);
      } else if (data.data) {
        console.log(`  Data: ${typeof data.data === 'object' ? 'Object returned' : data.data}`);
      }
      return { success: true, data: data.data || data };
    } else {
      console.log(`${colors.red}✗ ${name} - Status: ${response.status}, Error: ${data.error || 'Unknown'}${colors.reset}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log(`${colors.red}✗ ${name} - Error: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function runUserManagementTests() {
  console.log(`\n${colors.magenta}=== User Management System Tests ===${colors.reset}\n`);
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log(`${colors.red}Cannot proceed without authentication${colors.reset}`);
    return;
  }
  
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  // Test Get All Users
  const users = await testEndpoint(
    'Get All Users',
    'GET',
    '/users'
  );
  testResults.total++;
  if (users.success) testResults.passed++; else testResults.failed++;
  
  // Test Get Roles
  const roles = await testEndpoint(
    'Get Roles',
    'GET',
    '/users/roles/list'
  );
  testResults.total++;
  if (roles.success) testResults.passed++; else testResults.failed++;
  
  // Test Get Departments
  const departments = await testEndpoint(
    'Get Departments',
    'GET',
    '/users/departments/list'
  );
  testResults.total++;
  if (departments.success) testResults.passed++; else testResults.failed++;
  
  // Test Get Permissions
  const permissions = await testEndpoint(
    'Get Permissions',
    'GET',
    '/users/permissions/list'
  );
  testResults.total++;
  if (permissions.success) testResults.passed++; else testResults.failed++;
  
  // Test Get Permission Matrix
  const matrix = await testEndpoint(
    'Get Permission Matrix',
    'GET',
    '/users/permissions/matrix'
  );
  testResults.total++;
  if (matrix.success) testResults.passed++; else testResults.failed++;
  
  // Test Create User
  const newUser = await testEndpoint(
    'Create New User',
    'POST',
    '/users',
    {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      full_name: 'Test User',
      department: 'IT',
      position: 'Developer',
      is_admin: false,
      roles: []
    }
  );
  testResults.total++;
  if (newUser.success) testResults.passed++; else testResults.failed++;
  
  let userId = newUser.data?.id;
  
  // Test Update User (if user was created)
  if (userId) {
    const updateUser = await testEndpoint(
      'Update User',
      'PUT',
      `/users/${userId}`,
      {
        full_name: 'Updated Test User',
        position: 'Senior Developer'
      }
    );
    testResults.total++;
    if (updateUser.success) testResults.passed++; else testResults.failed++;
  }
  
  // Test Create Role
  const newRole = await testEndpoint(
    'Create New Role',
    'POST',
    '/users/roles',
    {
      name: 'Test Role',
      description: 'A test role for development',
      permissions: []
    }
  );
  testResults.total++;
  if (newRole.success) testResults.passed++; else testResults.failed++;
  
  let roleId = newRole.data?.id;
  
  // Test Update Role (if role was created)
  if (roleId) {
    const updateRole = await testEndpoint(
      'Update Role',
      'PUT',
      `/users/roles/${roleId}`,
      {
        description: 'Updated test role description'
      }
    );
    testResults.total++;
    if (updateRole.success) testResults.passed++; else testResults.failed++;
  }
  
  // Test User Search/Filter
  const searchUsers = await testEndpoint(
    'Search Users',
    'GET',
    '/users?search=test'
  );
  testResults.total++;
  if (searchUsers.success) testResults.passed++; else testResults.failed++;
  
  // Test Filter by Department
  const filterUsers = await testEndpoint(
    'Filter Users by Department',
    'GET',
    '/users?department=IT'
  );
  testResults.total++;
  if (filterUsers.success) testResults.passed++; else testResults.failed++;
  
  // Test Password Reset (if user exists)
  if (userId) {
    const resetPassword = await testEndpoint(
      'Reset User Password',
      'POST',
      `/users/${userId}/reset-password`,
      {
        password: 'newpassword123'
      }
    );
    testResults.total++;
    if (resetPassword.success) testResults.passed++; else testResults.failed++;
  }
  
  // Cleanup: Delete test user (if created)
  if (userId) {
    const deleteUser = await testEndpoint(
      'Deactivate Test User',
      'DELETE',
      `/users/${userId}`
    );
    testResults.total++;
    if (deleteUser.success) testResults.passed++; else testResults.failed++;
  }
  
  // Cleanup: Delete test role (if created)
  if (roleId) {
    const deleteRole = await testEndpoint(
      'Delete Test Role',
      'DELETE',
      `/users/roles/${roleId}`
    );
    testResults.total++;
    if (deleteRole.success) testResults.passed++; else testResults.failed++;
  }
  
  // Summary
  console.log(`\n${colors.magenta}=== Test Summary ===${colors.reset}`);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log(`\n${colors.green}🎉 All user management tests passed!${colors.reset}`);
    console.log(`\n${colors.blue}User Management Features Available:${colors.reset}`);
    console.log(`• User CRUD operations`);
    console.log(`• Role-based access control`);
    console.log(`• Department management`);
    console.log(`• Permission matrix`);
    console.log(`• User search and filtering`);
    console.log(`• Password management`);
  } else {
    console.log(`\n${colors.yellow}⚠️ Some tests failed. Please review the errors above.${colors.reset}`);
  }
}

// Run the tests
runUserManagementTests().catch(error => {
  console.error(`${colors.red}Test execution failed: ${error}${colors.reset}`);
  process.exit(1);
});