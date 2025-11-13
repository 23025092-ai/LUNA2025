import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    concurrent_teams: {
      executor: 'per-vu-iterations',
      vus: 24, // 24 concurrent teams
      iterations: 1,
      maxDuration: '30m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s
    http_req_failed: ['rate<0.1'], // Error rate should be below 10%
    errors: ['rate<0.1'],
  },
};

// Base configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:8000';
const API_BASE = `${BASE_URL}/api/v1`;

// Generate unique team data
function getTeamData(teamId) {
  return {
    team_id: teamId,
    dataset_name: `dataset-team-${teamId}-${Date.now()}`,
    description: `Test dataset for team ${teamId}`,
    files: [
      {
        filename: `xray-1-team-${teamId}.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 1024 * 500, // 500KB
      },
      {
        filename: `xray-2-team-${teamId}.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 1024 * 600,
      },
      {
        filename: `xray-3-team-${teamId}.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 1024 * 550,
      },
    ],
  };
}

// Generate sample image data
function generateImageData(sizeBytes) {
  const buffer = new Array(sizeBytes);
  for (let i = 0; i < sizeBytes; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

export default function () {
  const teamId = __VU; // VU ID as team ID (1-24)
  const teamData = getTeamData(teamId);

  console.log(`Team ${teamId}: Starting upload workflow`);

  // Step 1: Request upload start
  console.log(`Team ${teamId}: Requesting upload URLs...`);
  const uploadStartPayload = JSON.stringify(teamData);
  
  const uploadStartRes = http.post(`${API_BASE}/upload/start`, uploadStartPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'upload_start' },
  });

  const uploadStartSuccess = check(uploadStartRes, {
    'upload start status is 200': (r) => r.status === 200,
    'upload start has dataset_id': (r) => JSON.parse(r.body).dataset_id !== undefined,
    'upload start has upload_urls': (r) => JSON.parse(r.body).upload_urls.length > 0,
  });

  if (!uploadStartSuccess) {
    console.error(`Team ${teamId}: Upload start failed: ${uploadStartRes.status} ${uploadStartRes.body}`);
    errorRate.add(1);
    return;
  }

  const uploadStartData = JSON.parse(uploadStartRes.body);
  const datasetId = uploadStartData.dataset_id;
  const uploadUrls = uploadStartData.upload_urls;

  console.log(`Team ${teamId}: Got dataset ID ${datasetId}, uploading ${uploadUrls.length} files...`);

  // Step 2: Upload files using presigned URLs
  for (let i = 0; i < uploadUrls.length; i++) {
    const urlInfo = uploadUrls[i];
    const imageData = generateImageData(teamData.files[i].size_bytes);
    
    console.log(`Team ${teamId}: Uploading file ${i + 1}/${uploadUrls.length}: ${urlInfo.filename}`);
    
    const uploadRes = http.put(urlInfo.upload_url, imageData, {
      headers: { 'Content-Type': urlInfo.headers['Content-Type'] },
      tags: { name: 'file_upload' },
    });

    const uploadSuccess = check(uploadRes, {
      'file upload status is 200': (r) => r.status === 200 || r.status === 201,
    });

    if (!uploadSuccess) {
      console.error(`Team ${teamId}: File upload failed for ${urlInfo.filename}: ${uploadRes.status}`);
      errorRate.add(1);
    }

    sleep(0.5); // Small delay between file uploads
  }

  console.log(`Team ${teamId}: All files uploaded, marking upload complete...`);

  // Step 3: Mark upload complete and trigger validation
  const uploadCompletePayload = JSON.stringify({ dataset_id: datasetId });
  
  const uploadCompleteRes = http.post(`${API_BASE}/upload/complete`, uploadCompletePayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'upload_complete' },
  });

  const uploadCompleteSuccess = check(uploadCompleteRes, {
    'upload complete status is 200': (r) => r.status === 200,
    'upload complete has validation_job_id': (r) => JSON.parse(r.body).validation_job_id !== undefined,
  });

  if (!uploadCompleteSuccess) {
    console.error(`Team ${teamId}: Upload complete failed: ${uploadCompleteRes.status} ${uploadCompleteRes.body}`);
    errorRate.add(1);
    return;
  }

  const uploadCompleteData = JSON.parse(uploadCompleteRes.body);
  const validationJobId = uploadCompleteData.validation_job_id;

  console.log(`Team ${teamId}: Upload complete, validation job ${validationJobId} queued`);

  // Step 4: Poll validation status
  let validationComplete = false;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)

  while (!validationComplete && attempts < maxAttempts) {
    sleep(5); // Wait 5 seconds between polls
    attempts++;

    console.log(`Team ${teamId}: Checking validation status (attempt ${attempts}/${maxAttempts})...`);
    
    const validationStatusRes = http.get(`${API_BASE}/validation/${datasetId}/status`, {
      tags: { name: 'validation_status' },
    });

    const validationStatusSuccess = check(validationStatusRes, {
      'validation status is 200': (r) => r.status === 200,
    });

    if (!validationStatusSuccess) {
      console.error(`Team ${teamId}: Validation status check failed: ${validationStatusRes.status}`);
      errorRate.add(1);
      break;
    }

    const validationData = JSON.parse(validationStatusRes.body);
    const status = validationData.status;

    console.log(`Team ${teamId}: Validation status: ${status}`);

    if (status === 'completed') {
      validationComplete = true;
      console.log(`Team ${teamId}: ✅ Validation completed successfully!`);
      console.log(`Team ${teamId}: Results:`, JSON.stringify(validationData.validation_results));
    } else if (status === 'failed') {
      console.error(`Team ${teamId}: ❌ Validation failed: ${validationData.error_message}`);
      errorRate.add(1);
      break;
    } else if (status === 'pending' || status === 'processing') {
      // Continue polling
      console.log(`Team ${teamId}: Validation still ${status}...`);
    }
  }

  if (!validationComplete && attempts >= maxAttempts) {
    console.error(`Team ${teamId}: ⏰ Validation timeout after ${maxAttempts} attempts`);
    errorRate.add(1);
  }

  console.log(`Team ${teamId}: Test workflow completed`);
}

export function teardown(data) {
  console.log('===== Load Test Summary =====');
  console.log('All 24 concurrent team upload workflows completed');
  console.log('Check the summary statistics above for detailed metrics');
}
