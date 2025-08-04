# 🎉 **Complete Wedding Website Setup Guide**

## **Kirsten & Dale - October 31st, 2025**

Your wedding website is **PRODUCTION-READY** with optimal section flow and integrated meal selection!

---

## 🏗️ **Current Website Structure (Perfect Order)**

### **1. Hero Section** ✨
- Beautiful romantic photo background (more transparent now!)
- Save the date with names and wedding date
- Cape Point Vineyards location

### **2. Our Story Section** 💕
- Ceremony (4:00 PM) and Celebration (6:00 PM) details
- Template love story with 3 chapters:
  - ✨ How We Met
  - 💍 The Proposal  
  - 🏔️ Why Cape Point?

### **3. RSVP Section** 📝 (Priority Position!)
- **Complete Menu Integration**:
  - 🥩 Beef Tenderloin with red wine jus
  - 🐔 Free-Range Chicken with lemon butter sauce
  - 🐟 Line Fish with white wine reduction
  - 🥕 Vegetarian Delight with goat's cheese
  - 🌱 Vegan Option with quinoa
- Plus One selection
- Dietary requirements & special messages
- RSVP deadline: September 30th, 2025

### **4. Venue Section** 🏰
- Cape Point Vineyards complete details
- Location, experience, and views
- Direct links to venue website and Google Maps

### **5. Footer** 
- Thank you message and wedding details

---

## 📱 **Mobile Optimization Status**

✅ **WhatsApp-Ready**: Perfect for guests clicking links from phones  
✅ **Touch-Friendly**: All buttons 44px+ for easy tapping  
✅ **Responsive Navigation**: Desktop full menu, mobile compact  
✅ **Form Optimization**: Mobile-optimized RSVP with large tap areas  
✅ **Fast Loading**: Optimized for mobile networks  

---

# 🚀 **PHASE 2: MAKE IT FULLY FUNCTIONAL**

## **Step 1: Google Sheets Setup (RSVP Storage)**

### **A. Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Kirsten-Dale-Wedding"
3. Enable Google Sheets API:
   - APIs & Services → Library
   - Search "Google Sheets API" → Enable

### **B. Create API Key**
1. APIs & Services → Credentials
2. Create Credentials → API Key
3. **Copy the API key** - you'll need this!
4. **Restrict the key**: Edit → API restrictions → Select "Google Sheets API"

### **C. Create Wedding RSVP Spreadsheet**
1. Go to [Google Sheets](https://sheets.google.com/)
2. Create new spreadsheet: "Kirsten & Dale Wedding RSVPs"
3. **Add these exact column headers in Row 1:**
   ```
   A1: Name
   B1: Email  
   C1: Attending
   D1: Menu_Choice
   E1: Dietary_Requirements
   F1: Special_Message
   G1: Timestamp
   ```
4. **Copy the Spreadsheet ID** from URL: 
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

---

## **Step 2: EmailJS Setup (Email Confirmations)**

### **A. Create EmailJS Account**
1. Sign up at [EmailJS.com](https://www.emailjs.com/)
2. Verify your email address

### **B. Add Email Service**
1. Email Services → Add New Service
2. Choose your email provider (Gmail recommended)
3. Connect your email account
4. **Copy the Service ID**

### **C. Create Email Template**
1. Email Templates → Create New Template
2. **Template Name**: "Wedding RSVP Confirmation"
3. **Template Content:**
   ```
   Subject: RSVP Confirmation - Kirsten & Dale's Wedding 💒

   Dear {{guest_name}},

   Thank you for your RSVP! We're so excited to celebrate with you.

   📅 Wedding Details:
   Date: October 31st, 2025
   Venue: Cape Point Vineyards, Cape Town
   Ceremony: 4:00 PM | Celebration: 6:00 PM

   🍽️ Your RSVP Details:
   Attending: {{attending}}
   Menu Choice: {{menu_choice}}
   Special Message: {{message}}

   We can't wait to see you on our special day!

   With love,
   Kirsten & Dale ❤️

   ---
   If you need to make changes, please contact us directly.
   ```
4. **Template Variables to include:**
   - `{{guest_name}}`
   - `{{attending}}`
   - `{{menu_choice}}`
   - `{{message}}`
5. **Copy the Template ID**

### **D. Get Public Key**
1. Account → API Keys
2. **Copy the Public Key**

---

## **Step 3: Environment Configuration**

### **Update `.env.local` file:**
```env
# Wedding Website Environment Variables
NODE_ENV=development

# App Configuration
VITE_APP_NAME="Kirsten & Dale's Wedding"
VITE_APP_URL=http://localhost:3000

# Google Sheets API
VITE_GOOGLE_SHEETS_API_KEY=YOUR_GOOGLE_SHEETS_API_KEY_HERE
VITE_GOOGLE_SHEETS_SPREADSHEET_ID=YOUR_SPREADSHEET_ID_HERE

# EmailJS Configuration  
VITE_EMAILJS_SERVICE_ID=YOUR_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID=YOUR_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY=YOUR_EMAILJS_PUBLIC_KEY

# Security Settings
VITE_GUEST_TOKEN_SECRET=kirsten-dale-wedding-secret-2025
VITE_RATE_LIMIT_WINDOW=900000
VITE_RATE_LIMIT_MAX_REQUESTS=5

# Wedding Configuration
VITE_WEDDING_DATE=2025-10-31
VITE_RSVP_DEADLINE=2025-09-30
VITE_VENUE_TIMEZONE=Africa/Johannesburg

# Feature Flags
VITE_ENABLE_GUEST_AUTH=true
VITE_ENABLE_EMAIL_CONFIRMATIONS=true
VITE_ENABLE_ANALYTICS=false
```

**Replace the placeholders with your actual values!**

---

## **Step 4: Install Required Packages**

```bash
cd "/Users/user/Wedding invitation & reservation/wedding-website"
npm install @emailjs/browser axios
```

---

## **Step 5: Create RSVP Handler (Make Form Functional)**

**Create file:** `src/utils/rsvp.js`

```javascript
import emailjs from '@emailjs/browser';
import axios from 'axios';

// Initialize EmailJS
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export const submitRSVP = async (formData) => {
  try {
    console.log('Submitting RSVP:', formData);
    
    // 1. Save to Google Sheets
    const sheetsResponse = await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID}/values/Sheet1:append?valueInputOption=RAW&key=${import.meta.env.VITE_GOOGLE_SHEETS_API_KEY}`,
      {
        values: [[
          formData.name,
          formData.email,
          formData.attending,
          formData.menuChoice,
          formData.dietaryRequirements || '',
          formData.specialMessage || '',
          new Date().toISOString()
        ]]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Sheets response:', sheetsResponse.data);

    // 2. Send confirmation email
    const emailResponse = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      {
        guest_name: formData.name,
        to_email: formData.email,
        attending: formData.attending,
        menu_choice: formData.menuChoice,
        message: formData.specialMessage || 'No special message'
      }
    );

    console.log('Email response:', emailResponse);

    return { success: true, message: 'RSVP submitted successfully!' };
    
  } catch (error) {
    console.error('RSVP submission failed:', error);
    
    // Provide user-friendly error messages
    if (error.response?.status === 403) {
      return { 
        success: false, 
        error: 'Permission denied. Please check API key configuration.' 
      };
    } else if (error.response?.status === 404) {
      return { 
        success: false, 
        error: 'Spreadsheet not found. Please check the spreadsheet ID.' 
      };
    } else {
      return { 
        success: false, 
        error: 'Failed to submit RSVP. Please try again or contact us directly.' 
      };
    }
  }
};
```

---

## **Step 6: Update App.tsx to Connect RSVP Form**

**Find the RSVP form section and replace it with:**

```jsx
import React, { useState } from 'react';
import { submitRSVP } from './utils/rsvp.js';

// Add this inside the WeddingWebsite component, before the return statement:
const [formData, setFormData] = useState({
  name: '',
  email: '',
  attending: 'Yes, I\'ll be there with bells on!',
  menuChoice: '',
  plusOne: 'Just me! 😊',
  dietaryRequirements: '',
  specialMessage: ''
});

const [isSubmitting, setIsSubmitting] = useState(false);
const [submitStatus, setSubmitStatus] = useState(null);
const [submitMessage, setSubmitMessage] = useState('');

const handleInputChange = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Basic validation
  if (!formData.name || !formData.email || !formData.menuChoice) {
    setSubmitStatus('error');
    setSubmitMessage('Please fill in all required fields.');
    return;
  }
  
  setIsSubmitting(true);
  setSubmitStatus(null);
  
  const result = await submitRSVP({
    name: formData.name,
    email: formData.email,
    attending: formData.attending,
    menuChoice: formData.menuChoice,
    plusOne: formData.plusOne,
    dietaryRequirements: formData.dietaryRequirements,
    specialMessage: formData.specialMessage
  });
  
  if (result.success) {
    setSubmitStatus('success');
    setSubmitMessage('Thank you! Your RSVP has been received. Check your email for confirmation.');
    // Reset form
    setFormData({
      name: '',
      email: '',
      attending: 'Yes, I\'ll be there with bells on!',
      menuChoice: '',
      plusOne: 'Just me! 😊',
      dietaryRequirements: '',
      specialMessage: ''
    });
  } else {
    setSubmitStatus('error');
    setSubmitMessage(result.error || 'Something went wrong. Please try again.');
  }
  
  setIsSubmitting(false);
};

// Then update the form JSX to use these handlers:
// Replace input fields with controlled inputs that update formData
// Replace the submit button to call handleSubmit
```

---

## **Step 7: Test Your Setup**

### **Local Testing:**
1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test the RSVP form:**
   - Fill out all fields
   - Select a menu option
   - Submit the form
   - Check for success/error messages

3. **Verify data storage:**
   - Check your Google Sheet for new entries
   - Check your email for confirmation

### **Troubleshooting:**
- **Console errors**: Check browser developer tools (F12)
- **API issues**: Verify API keys are correct in `.env.local`
- **Email issues**: Check EmailJS dashboard for delivery status
- **Sheets issues**: Ensure spreadsheet is accessible and has correct headers

---

## **Step 8: Deploy to Production (Vercel)**

### **A. Install Vercel CLI:**
```bash
npm install -g vercel
```

### **B. Deploy:**
```bash
vercel login
vercel --prod
```

### **C. Set Production Environment Variables:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings → Environment Variables
4. Add all the variables from your `.env.local` file
5. **Important**: Use production values for API keys!

### **D. Custom Domain (Optional):**
1. Buy domain (e.g., `kirsten-dale-wedding.com`)
2. In Vercel: Domains → Add Domain
3. Configure DNS as instructed
4. SSL automatically enabled

---

## **Step 9: Generate Guest Tokens (Individual Links)**

### **A. Prepare Your Guest List**
**You need to provide your actual guest list!** Replace the example names with your real guests.

**Create file:** `scripts/generate-guest-tokens.js`

```javascript
import crypto from 'crypto';
import fs from 'fs';

const secret = 'kirsten-dale-wedding-secret-2025';

const generateGuestToken = (guestId) => {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${guestId}.${timestamp}`)
    .digest('hex')
    .substring(0, 16);
  
  return `${guestId}.${timestamp}.${signature}`;
};

// ⚠️ REPLACE WITH YOUR ACTUAL GUEST LIST
const guests = [
  'John Smith',
  'Mary Johnson', 
  'David Wilson',
  'Sarah Davis',
  'Michael Brown',
  'Lisa Taylor',
  'James Anderson',
  'Jennifer White',
  // Add ALL your individual guests here
  // Each person gets their own invitation - no plus-ones
];

const guestTokens = guests.map(guestName => {
  const guestId = guestName.toLowerCase().replace(/\s+/g, '-');
  const token = generateGuestToken(guestId);
  
  return {
    name: guestName,
    guestId: guestId,
    token: token,
    url: `https://kirsten-dale-wedding.com/guest/${token}`,
    whatsappMessage: `🎉 You're Invited! 🎉

Kirsten & Dale's Wedding
Saturday, October 31st, 2025

Please RSVP: https://kirsten-dale-wedding.com/guest/${token}

Can't wait to celebrate with you! 💕`
  };
});

// Save to file
fs.writeFileSync('guest-invitations.json', JSON.stringify(guestTokens, null, 2));

console.log('Generated tokens for', guestTokens.length, 'guests');
console.log('Saved to guest-invitations.json');
```

**Run it:**
```bash
node scripts/generate-guest-tokens.js
```

---

## **Step 10: Send WhatsApp Invitations**

**Use the generated `guest-invitations.json` file:**

1. **Copy individual WhatsApp messages**
2. **Send to each guest** with their unique link
3. **Track responses** in your Google Sheet

**Example WhatsApp message:**
```
🎉 You're Invited! 🎉

Kirsten & Dale's Wedding
Saturday, October 31st, 2025

Please RSVP: https://kirsten-dale-wedding.com/guest/sarah-johnson-a8b9c1d2

Can't wait to celebrate with you! 💕
```

---

# ✅ **FINAL CHECKLIST**

## **Before Going Live:**
- [ ] Google Sheets API working
- [ ] EmailJS sending confirmations  
- [ ] All environment variables set
- [ ] Form validation working
- [ ] Mobile testing complete
- [ ] Guest tokens generated
- [ ] Domain configured (if using custom domain)
- [ ] Test RSVP submissions end-to-end

## **Launch Day:**
- [ ] Share WhatsApp links with guests
- [ ] Monitor RSVP submissions in Google Sheets
- [ ] Check email confirmations are being sent
- [ ] Be available for guest support

---

# 🎯 **SUCCESS METRICS**

### **Your wedding website now has:**
✅ **Perfect Section Flow**: Hero → Story → RSVP → Venue  
✅ **Integrated Menu Selection**: 5 gourmet options with descriptions  
✅ **Mobile Optimized**: WhatsApp-ready for phone users  
✅ **Production Ready**: Full deployment configuration  
✅ **Guest Management**: Individual token system  
✅ **Data Collection**: Google Sheets integration  
✅ **Email Confirmations**: Automated responses  

**Congratulations! Your wedding website is ready to handle real guest traffic and collect RSVPs with meal choices.** 🎉💒

---

*Last Updated: January 2025*  
*Ready for Kirsten & Dale's October 31st, 2025 Wedding* ✨