const axios = require('axios');

async function testBankAccount() {
  try {
    const res = await axios.post('http://localhost:4000/api/v1/accounts', {
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
    }, {
      headers: {
        'Authorization': 'Bearer 1' // mock auth
      }
    });
    console.log("Success:", res.data);
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
}

testBankAccount();
