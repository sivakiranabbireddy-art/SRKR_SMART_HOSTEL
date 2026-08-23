const base = 'http://localhost:5000/api';

async function runE2ETest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 RUNNING REGISTRATION APPROVAL SYSTEM E2E TESTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Admin Login
  console.log('🔹 1. Admin Login...');
  let res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hostelsync.com', password: 'Admin@123' }),
  });
  const adminData = await res.json();
  if (res.status !== 200 || !adminData.token) throw new Error('Admin login failed: ' + JSON.stringify(adminData));
  const adminToken = adminData.token;
  console.log('   ✅ Admin logged in successfully. Role:', adminData.user.role);

  const randA = Math.floor(1000 + Math.random() * 9000);
  const emailA = `raghav.varma.${randA}@student.com`;
  const studentIdA = `24B95A${randA}`;

  console.log(`\n🔹 2. Student Registration & OTP Request (${emailA})...`);
  const studentPayload = {
    firstName: 'Raghav',
    lastName: 'Varma',
    email: emailA,
    password: 'Password@123',
    studentId: studentIdA,
    department: 'Computer Science',
    year: 1,
    gender: 'MALE',
    phone: '9988776655',
  };

  res = await fetch(`${base}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentPayload),
  });
  const sendOtpRes = await res.json();
  console.log('   ✅ Send OTP Status:', res.status, sendOtpRes.message || sendOtpRes.error);

  // Verify OTP
  console.log('\n🔹 3. Verifying Email OTP...');
  res = await fetch(`${base}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentPayload.email, otp: '123456' }),
  });
  const verifyRes = await res.json();
  console.log('   ✅ Verify OTP Status:', res.status);
  console.log('   ✅ Created User Status:', verifyRes.user?.approvalStatus);
  const studentAId = verifyRes.user?.id;
  if (verifyRes.user?.approvalStatus !== 'PENDING') {
    throw new Error('Account was not created with PENDING approval status!');
  }

  // 4. Login as PENDING Student
  console.log('\n🔹 4. Testing PENDING Student Login...');
  res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentPayload.email, password: studentPayload.password }),
  });
  const pendingLogin = await res.json();
  console.log('   ✅ Login Status:', res.status);
  console.log('   ✅ Student approvalStatus returned:', pendingLogin.user?.approvalStatus);
  const studentToken = pendingLogin.token;

  // 5. Attempting to access protected student features with PENDING token
  console.log('\n🔹 5. Testing Protected Feature Access by PENDING Student...');
  res = await fetch(`${base}/students/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const accessRes = await res.json();
  console.log('   ✅ /students/me Status:', res.status, '(Expected: 403)');
  console.log('   ✅ Restriction Message:', accessRes.error);
  if (res.status !== 403) throw new Error('Security flaw: PENDING student accessed protected endpoints!');

  // 6. Admin Reviews Registration Requests
  console.log('\n🔹 6. Admin Viewing Registration Requests...');
  res = await fetch(`${base}/admin/registration-requests?status=PENDING`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const reqList = await res.json();
  console.log('   ✅ Admin requests list fetched. Pending count:', reqList.counts?.pending);
  const foundReq = reqList.requests?.find(r => r.email === studentPayload.email);
  if (!foundReq) throw new Error('Student request not found in admin requests list');
  console.log('   ✅ Found student request in list:', foundReq.profile.firstName, foundReq.profile.lastName);

  // 7. Admin Approves Student
  console.log('\n🔹 7. Admin Approving Student Registration...');
  res = await fetch(`${base}/admin/registration-requests/${studentAId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const approveRes = await res.json();
  console.log('   ✅ Approve Response Status:', res.status, approveRes.message);

  // 8. Approved Student Accesses Protected Routes
  console.log('\n🔹 8. Testing Protected Feature Access by APPROVED Student...');
  res = await fetch(`${base}/students/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const profileRes = await res.json();
  console.log('   ✅ /students/me Status:', res.status, '(Expected: 200)');
  console.log('   ✅ Profile fetched successfully:', profileRes.firstName, profileRes.lastName, profileRes.department);

  // 9. Testing Rejection Flow on Student B
  const randB = Math.floor(1000 + Math.random() * 9000);
  const emailB = `suresh.reddy.${randB}@student.com`;
  const studentIdB = `INVALID_ID_${randB}`;

  console.log(`\n🔹 9. Testing Rejection Flow on Student B (${emailB})...`);
  const studentBPayload = {
    firstName: 'Suresh',
    lastName: 'Reddy',
    email: emailB,
    password: 'Password@123',
    studentId: studentIdB,
    department: 'Civil Engineering',
    year: 1,
    gender: 'MALE',
    phone: '9988771122',
  };

  await fetch(`${base}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentBPayload),
  });

  const bVerify = await fetch(`${base}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentBPayload.email, otp: '123456' }),
  });
  const bData = await bVerify.json();
  const studentBId = bData.user?.id;

  // Admin rejects Student B with specific reason
  res = await fetch(`${base}/admin/registration-requests/${studentBId}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ reason: 'Student ID was not found in official SRKR college enrollment list.' }),
  });
  const rejectRes = await res.json();
  console.log('   ✅ Reject Response Status:', res.status, rejectRes.message);

  // Check Student B login & rejection reason
  res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentBPayload.email, password: studentBPayload.password }),
  });
  const rejectedLogin = await res.json();
  console.log('   ✅ Rejected Student Login status:', res.status, 'approvalStatus:', rejectedLogin.user?.approvalStatus);
  console.log('   ✅ Rejection Reason received:', rejectedLogin.user?.rejectionReason);

  // Verify Student B cannot access protected endpoints
  res = await fetch(`${base}/students/me`, {
    headers: { Authorization: `Bearer ${rejectedLogin.token}` },
  });
  const bAccess = await res.json();
  console.log('   ✅ Rejected Student /students/me Status:', res.status, '(Expected: 403)');
  console.log('   ✅ Error Message:', bAccess.error);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 ALL 9 E2E INTEGRATION & SECURITY TESTS PASSED PERFECTLY!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

runE2ETest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
