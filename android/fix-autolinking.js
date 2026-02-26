const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/build/generated/autolinking/src/main/java/com/facebook/react/ReactNativeApplicationEntryPoint.java');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/com\.upi\.BuildConfig/g, 'com.budrock.upitracker.BuildConfig');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed autolinking package reference');
} else {
  console.log('⚠️  Autolinking file not found yet');
}
