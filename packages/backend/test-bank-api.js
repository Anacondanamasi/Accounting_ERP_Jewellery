async function testBankAccount() {
  try {
    const res = await fetch('http://localhost:4000/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 1' // mock auth
      },
      body: JSON.stringify({
        code: "BA-TEST-" + Date.now().toString().slice(-4),
        name: "Test Bank API",
        description: "Bank Account: 123",
        groupId: null,
        type: "Bank",
        openingBalance: 0,
        taxCode: "Tax Exempt (0%)",
        isBankAccount: true,
        enablePayments: true,
        showOnDashboard: true,
        isActive: true,
        allowManualJournals: true
      })
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

testBankAccount();
