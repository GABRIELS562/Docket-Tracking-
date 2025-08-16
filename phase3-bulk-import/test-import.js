const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const SERVER_URL = 'http://localhost:3002';

async function testImport(filename) {
  try {
    console.log(`\n🧪 Testing import with ${filename}...`);
    
    const filePath = `./test-data/${filename}`;
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }
    
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    console.log('📤 Uploading file...');
    const uploadResponse = await axios.post(`${SERVER_URL}/api/import/upload`, form, {
      headers: form.getHeaders(),
      timeout: 30000
    });
    
    const jobId = uploadResponse.data.data.jobId;
    console.log(`✅ Upload successful. Job ID: ${jobId}`);
    
    console.log('📊 Monitoring progress...');
    await monitorJob(jobId);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function monitorJob(jobId) {
  let completed = false;
  let attempts = 0;
  const maxAttempts = 60;
  
  while (!completed && attempts < maxAttempts) {
    try {
      const response = await axios.get(`${SERVER_URL}/api/import/jobs/${jobId}`);
      const job = response.data.data;
      
      const progress = job.total_records > 0 ? 
        ((job.processed_records / job.total_records) * 100).toFixed(1) : 0;
      
      console.log(`📈 Status: ${job.status} | Progress: ${progress}% | Processed: ${job.processed_records} | Success: ${job.successful_records} | Failed: ${job.failed_records}`);
      
      if (job.status === 'completed' || job.status === 'failed') {
        completed = true;
        
        if (job.failed_records > 0) {
          console.log('📋 Fetching error details...');
          const errorResponse = await axios.get(`${SERVER_URL}/api/import/jobs/${jobId}/errors?limit=5`);
          console.log('❌ Sample errors:', JSON.stringify(errorResponse.data.data.errors, null, 2));
        }
        
        console.log(`\n✅ Import ${job.status}!`);
        console.log(`   📊 Total: ${job.total_records}`);
        console.log(`   ✅ Success: ${job.successful_records}`);
        console.log(`   ❌ Failed: ${job.failed_records}`);
        console.log(`   ⏱️  Time: ${job.processing_time_ms || 'N/A'}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
    } catch (error) {
      console.error('❌ Error monitoring job:', error.message);
      break;
    }
  }
  
  if (!completed) {
    console.log('⏰ Monitoring timeout reached');
  }
}

async function runTests() {
  console.log('🚀 Phase 3 Bulk Import Test Suite');
  console.log('=====================================');
  
  try {
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    console.log('✅ Server is running:', healthResponse.data.service);
  } catch (error) {
    console.error('❌ Server not running. Start with: npm run dev');
    return;
  }
  
  await testImport('sample-1k.csv');
  
  console.log('\n🎯 Quick test completed!');
  console.log('📝 For larger tests, manually run:');
  console.log('   - sample-10k.csv (10,000 records)');  
  console.log('   - sample-100k.csv (100,000 records)');
  console.log('\n📊 Check stats at: GET /api/import/stats');
  console.log('🔧 Download template: GET /api/import/download-template');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testImport, monitorJob };