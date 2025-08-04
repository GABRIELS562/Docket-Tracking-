# Wedding Website Setup Guide

## 🎉 Congratulations! Your wedding website is ready!

This is a complete React TypeScript wedding website with individual guest authentication and RSVP functionality, built exactly like WithJoy.com.

## ✅ What's Included

### Core Features
- ✨ **Individual Guest Authentication** - Each guest gets a unique token/URL
- 📝 **Complete RSVP System** - Guest attendance, meal preferences, dietary restrictions
- 📊 **Google Sheets Backend** - All RSVP data stored in Google Sheets
- 📧 **Email Confirmations** - Automatic email confirmations via EmailJS
- 🎨 **Beautiful Design** - Modern, responsive design with smooth animations
- 📱 **Mobile Responsive** - Perfect on all devices

### Components Built
1. **Hero Section** - Beautiful landing page with wedding details
2. **Details Section** - Ceremony/reception info and timeline
3. **Location Section** - Interactive maps and directions
4. **Registry Section** - Gift registry with priority levels
5. **RSVP Section** - Multi-step RSVP form with meal selection

### Technical Features
- Complete TypeScript type safety
- Framer Motion animations
- Google Sheets API integration
- EmailJS email service
- Form validation
- Responsive design with Tailwind CSS
- Individual guest authentication

## 🚀 Next Steps

### 1. Configure Your Wedding Information

Edit `src/data/weddingInfo.ts`:
```typescript
export const weddingInfo: WeddingInfo = {
  bride: {
    name: 'YourName',
    fullName: 'Your Full Name'
  },
  groom: {
    name: 'PartnerName', 
    fullName: 'Partner Full Name'
  },
  // Update dates, venues, timeline, registry...
};
```

### 2. Set Up Your Guest List

Edit `src/data/guestTokens.ts`:
```typescript
export const guestTokens: GuestToken[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@email.com',
    token: 'john-smith-abc123',
    maxGuests: 2,
    isUsed: false
  },
  // Add all your guests...
];
```

### 3. Customize Your Menu

Edit `src/data/menuItems.ts` with your actual menu options:
- Appetizers
- Main courses
- Desserts
- Dietary information

### 4. Set Up Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Google Sheets API Configuration
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here
VITE_GOOGLE_SHEET_ID=your_sheet_id_here

# EmailJS Configuration  
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

### 5. Set Up Google Sheets

1. Create a new Google Sheet
2. Add these headers in row 1:
   ```
   Timestamp | Guest Token | Attending | Guest Count | Guest Names | Dietary Restrictions | Meal Choices | Song Request | Special Requests | Email | Phone
   ```
3. Get your API key from Google Cloud Console
4. Copy the Sheet ID from the URL

### 6. Set Up EmailJS

1. Create account at [EmailJS](https://emailjs.com)
2. Create email service (Gmail, Outlook, etc.)
3. Create templates for RSVP confirmations
4. Get your Service ID, Template ID, and Public Key

## 🎨 Customization

### Colors & Styling
- Edit `tailwind.config.js` for color schemes
- Modify `src/App.css` for custom styles
- Update fonts in CSS imports

### Content
- Wedding information: `src/data/weddingInfo.ts`
- Menu items: `src/data/menuItems.ts`
- Guest list: `src/data/guestTokens.ts`

## 🚀 Deployment

### Option 1: Vercel (Recommended)
1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy!

### Option 2: Netlify
1. Build: `npm run build`
2. Deploy `dist` folder
3. Add environment variables
4. Configure SPA redirects

## 📝 Guest URL Format

Each guest gets a unique URL:
- Main site: `https://yourwedding.com/`
- Guest RSVP: `https://yourwedding.com/john-smith-abc123`

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 Features Overview

### RSVP Flow
1. Guest visits their unique URL
2. Authentication via token validation
3. Multi-step RSVP form:
   - Attendance confirmation
   - Guest count & names
   - Meal selections
   - Contact info & special requests
4. Data saved to Google Sheets
5. Email confirmation sent

### Admin Benefits
- All RSVPs in Google Sheets
- Easy data export for planning
- Real-time RSVP tracking
- Guest management

## 📞 Support

If you need help:
1. Check the README.md for detailed setup
2. Review the example configurations
3. Test with sample data first

---

**Your wedding website is ready! 💕 Time to celebrate and share those invitation links!**