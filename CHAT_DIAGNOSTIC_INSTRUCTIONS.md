# Chat Message Diagnostic - Testing Instructions

## 🔍 Purpose
We've added comprehensive diagnostic logging to identify the EXACT structure of chat messages being passed to the formatter.

## 📋 Testing Steps

### 1. Start/Restart Your Development Server
If already running:
```bash
# Press Ctrl+C to stop
npm run dev
```

### 2. Open Meeting Room
1. Navigate to your meeting URL: `http://localhost:3000/meeting/{sessionId}`
2. Join the meeting with both mentor and mentee accounts
3. **Open Browser Developer Tools** (F12 or Right-click → Inspect)
4. Go to the **Console** tab

### 3. Send Test Messages
Send a few chat messages from either participant and watch the console output.

## 🔎 What to Look For

For EACH message sent, you'll see diagnostic logs like:

```
🔍 DIAGNOSTIC - Message type: [string | object]
🔍 DIAGNOSTIC - Is string?: [true | false]
🔍 DIAGNOSTIC - Full message: [the actual data]
```

**If message is an object:**
```
🔍 DIAGNOSTIC - Object keys: [array of property names]
🔍 DIAGNOSTIC - message.message: [value or undefined]
🔍 DIAGNOSTIC - message.text: [value or undefined]
🔍 DIAGNOSTIC - message.from: [participant info or undefined]
```

## 📊 Expected Scenarios

### Scenario A: Message is a String
```
🔍 DIAGNOSTIC - Message type: string
🔍 DIAGNOSTIC - Is string?: true
🔍 DIAGNOSTIC - Full message: "Hello everyone"
✅ Message is a string, getting local participant
```
**Expected Result:** Message displays as "YourName: Hello everyone"

### Scenario B: Message is an Object
```
🔍 DIAGNOSTIC - Message type: object
🔍 DIAGNOSTIC - Is string?: false
🔍 DIAGNOSTIC - Full message: {...}
🔍 DIAGNOSTIC - Object keys: ["message", "id", "timestamp", "from"]
🔍 DIAGNOSTIC - message.message: "Hello everyone"
🔍 DIAGNOSTIC - message.text: undefined
🔍 DIAGNOSTIC - message.from: {identity: "mentor-user123", ...}
```
**Expected Result:** Message displays with correct sender name and text

### Scenario C: Object with Different Property Names
```
🔍 DIAGNOSTIC - Object keys: ["payload", "id", "timestamp"]
🔍 DIAGNOSTIC - message.message: undefined
🔍 DIAGNOSTIC - message.text: undefined
```
**This tells us we need to check a DIFFERENT property!**

## 📝 What to Report Back

Copy and paste the FULL console output from ONE message send. It will look something like:

```
🔍 DIAGNOSTIC - Message type: object
🔍 DIAGNOSTIC - Is string?: false
🔍 DIAGNOSTIC - Full message: {id: "abc123", timestamp: 1234567890, ...}
🔍 DIAGNOSTIC - Object keys: [...]
🔍 DIAGNOSTIC - message.message: ...
🔍 DIAGNOSTIC - message.text: ...
🔍 DIAGNOSTIC - message.from: ...
```

## 🎯 Once We Have the Data

Based on the console output:
1. We'll know the EXACT property name to use
2. We'll update the code to access the correct property
3. We'll remove the diagnostic logs
4. Chat will work perfectly

**No guessing. Only facts. Production-grade debugging.**
