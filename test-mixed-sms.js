// Test mixed SMS samples
const testSamples = [
  {
    name: "JioHotstar Subscription",
    body: "Congratulations! Your JioHotstar mobile subscription for 28 days is now active. Enjoy unlimited Cricket & Entertainment for 28 Days.",
    expected: "SHOULD DETECT"
  },
  {
    name: "Google Play UPI Mandate (SBI)",
    body: "Your UPI-Mandate for Rs.60.00 is successfully created towards Google Play from A/c No: XXXXXX2572. UMN:4b4ff9ae5cb44c15e063e8eee20a18a5@pthdfc. If not you, kindly report on 18001234. -SBI",
    expected: "SHOULD DETECT"
  },
  {
    name: "Google Play Autopay (Paytm)",
    body: "Congratulations! Automatic payment of Rs.60 for Google Play has been setup successfully - Paytm",
    expected: "SHOULD DETECT"
  },
  {
    name: "Google AutoPay Mandate (Kotak)",
    body: "Your ASPRESENTED UPI AutoPay Mandate from 18/01/2026 to 31/12/2036 is successfully created towards Google for Rs.100.00. Refer UM no. 922c555ed5fd4bb4a26b2bd313d1e3ed@ibl. Regards, Kotak Bank",
    expected: "SHOULD DETECT"
  },
  {
    name: "L&T Finance EMI Reminder",
    body: "Dear Customer, Your account has been set up with us and we are here to assist you with your financial needs. This message is a reminder that you have an upcoming EMI of Rs.3268/- due on 2024-09-03, kindly keep your bank account funded with an adequate balance amount. Thank you for being our valuable customer. Regards, L&T Finance Ltd.",
    expected: "SHOULD DETECT (EMI)"
  },
  {
    name: "AWS India AutoPay Mandate (Kotak)",
    body: "Your ASPRESENTED UPI AutoPay Mandate from 21/02/2026 to 21/02/2041 is successfully created towards AWS India for Rs.15000.00. Refer UM no. b40b3f804bf84894b2a4775eaa6d6af5@ibl. Regards, Kotak Bank",
    expected: "SHOULD DETECT"
  },
  {
    name: "Google AutoPay Mandate 2 (Kotak)",
    body: "Your ASPRESENTED UPI AutoPay Mandate from 15/01/2026 to 31/12/2036 is successfully created towards Google for Rs.100.00. Refer UM no. 7ef81e9384e547e08ff538157d5d15d9@ibl. Regards, Kotak Bank",
    expected: "SHOULD DETECT"
  },
  {
    name: "Spotify Mandate (Federal Bank)",
    body: "Dear Customer, You have successfully created a mandate on SPOTIFY for a ASPRESENTED frequency starting from 26-02-2026 for a maximum amount of Rs 199.00 Mandate Ref No- ecbb57f197f4446a82593597d06d922a@ybl - Federal Bank",
    expected: "SHOULD DETECT"
  },
  {
    name: "P2P Transfer to MEKALA VINOD KUM (SBI)",
    body: "Dear UPI user A/C X4148 debited by 550.00 on date 20Feb26 trf to MEKALA VINOD KUM Refno 044363811479 If not u? call-1800111109 for other services-18001234-SBI",
    expected: "SHOULD REJECT (P2P)"
  }
];

function testCurrentLogic(body) {
  const lowerBody = body.toLowerCase();
  
  // Step 1: Check if it's subscription payment
  const isSubscriptionPayment = /autopay|mandate|standing instruction|automatic payment|recurring|nach|monthly|yearly|quarterly|subscription|e-mandate/i.test(body);
  
  if (!isSubscriptionPayment) {
    return { detected: false, reason: "No subscription keywords" };
  }
  
  // Step 2: Extract amount
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
    /debited\s+by\s+([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];
  
  let amount = null;
  for (const pattern of amountPatterns) {
    const match = body.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) break;
    }
  }
  
  // Step 3: Extract merchant
  const merchantPatterns = [
    /(?:towards|for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:from|for|rs|inr|₹|a\/c))/i,
    /(?:autopay|mandate).*?(?:towards|for|on)\s+([A-Z\s]+?)(?:\s+(?:for|from|starting))/i,
    /automatic payment.*?for\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:has|been))/i,
  ];
  
  let merchant = null;
  for (const pattern of merchantPatterns) {
    const match = body.match(pattern);
    if (match) {
      merchant = match[1].trim();
      if (merchant.length >= 2 && merchant.length <= 50) break;
    }
  }
  
  if (amount && merchant) {
    return { detected: true, merchant, amount };
  } else if (amount) {
    return { detected: false, reason: "Amount found but no merchant" };
  } else if (merchant) {
    return { detected: false, reason: "Merchant found but no amount" };
  }
  
  return { detected: false, reason: "Missing amount and merchant" };
}

console.log("=".repeat(100));
console.log("SMS DETECTION TEST - CURRENT LOGIC");
console.log("=".repeat(100));

let totalTests = testSamples.length;
let correctDetections = 0;
let incorrectDetections = 0;

testSamples.forEach((sample, index) => {
  console.log(`\n[${index + 1}/${totalTests}] ${sample.name}`);
  console.log("-".repeat(100));
  console.log(`SMS: ${sample.body.substring(0, 120)}...`);
  console.log(`Expected: ${sample.expected}`);
  
  const result = testCurrentLogic(sample.body);
  
  if (result.detected) {
    console.log(`✅ DETECTED: ${result.merchant} - ₹${result.amount}`);
    if (sample.expected.includes("SHOULD DETECT")) {
      correctDetections++;
    } else {
      incorrectDetections++;
      console.log("⚠️  FALSE POSITIVE!");
    }
  } else {
    console.log(`❌ REJECTED: ${result.reason}`);
    if (sample.expected.includes("SHOULD REJECT")) {
      correctDetections++;
    } else {
      incorrectDetections++;
      console.log("⚠️  FALSE NEGATIVE!");
    }
  }
});

console.log("\n" + "=".repeat(100));
console.log(`RESULTS: ${correctDetections}/${totalTests} correct (${Math.round(correctDetections/totalTests*100)}% accuracy)`);
console.log(`Correct: ${correctDetections} | Incorrect: ${incorrectDetections}`);
console.log("=".repeat(100));
