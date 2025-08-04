# EmailJS Setup Guide for Wedding RSVP Confirmations

This guide provides step-by-step instructions for setting up professional email confirmations for your wedding RSVP system using EmailJS.

## Overview

The email service provides:
- ✅ Professional wedding-themed email templates
- ✅ Conditional content based on attendance status
- ✅ Personalized guest information
- ✅ Wedding details and venue information
- ✅ Error handling with retry logic
- ✅ Email delivery tracking

## 1. EmailJS Account Setup

### Create EmailJS Account
1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### Configure Email Service
1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose **Gmail** (recommended) or your preferred email provider
4. Follow the setup wizard to connect your email account
5. Note down your **Service ID** (e.g., `service_abc123`)

### Create Email Template
1. Go to **Email Templates** in your EmailJS dashboard
2. Click **Create New Template**
3. Use the template structure provided below
4. Note down your **Template ID** (e.g., `template_xyz789`)

### Get Public Key
1. Go to **Account** → **General**
2. Copy your **Public Key** (e.g., `user_abcdef123456`)

## 2. Environment Variables Setup

Add these variables to your `.env` file:

```bash
# EmailJS Configuration
REACT_APP_EMAILJS_SERVICE_ID=service_abc123
REACT_APP_EMAILJS_TEMPLATE_ID=template_xyz789
REACT_APP_EMAILJS_PUBLIC_KEY=user_abcdef123456
```

## 3. Email Template Configuration

### Template Variables
The service provides the following variables for your EmailJS template:

#### Header Information
- `{{bride_name}}` - Bride's first name (e.g., "Sarah")
- `{{groom_name}}` - Groom's first name (e.g., "Michael")
- `{{couple_names}}` - Combined names (e.g., "Sarah & Michael")
- `{{wedding_date}}` - Formatted wedding date (e.g., "Saturday, August 15, 2024")
- `{{wedding_time}}` - Ceremony time (e.g., "4:00 PM")

#### Guest Information
- `{{to_name}}` - Guest's full name
- `{{to_email}}` - Guest's email address
- `{{submission_id}}` - Unique submission ID for tracking

#### RSVP Details
- `{{attendance_status}}` - "attending" or "not attending"
- `{{attendance_message}}` - Personalized message based on attendance

#### Conditional Content (use with EmailJS conditions)
- `{{show_meal_info}}` - "yes" if attending, "no" if not attending
- `{{meal_choice}}` - Selected meal option
- `{{dietary_restrictions}}` - Dietary restrictions or "None specified"

#### Plus-One Information (conditional)
- `{{show_plus_one}}` - "yes" if plus-one exists, "no" otherwise
- `{{plus_one_name}}` - Plus-one's name
- `{{plus_one_meal}}` - Plus-one's meal choice
- `{{plus_one_dietary}}` - Plus-one's dietary restrictions

#### Venue Information
- `{{ceremony_venue}}` - Ceremony venue name
- `{{ceremony_address}}` - Ceremony venue address
- `{{reception_venue}}` - Reception venue name
- `{{reception_address}}` - Reception venue address

#### Additional Information
- `{{special_requests}}` - Special requests or "None"
- `{{dress_code}}` - Wedding dress code
- `{{parking_info}}` - Parking instructions
- `{{contact_phone}}` - Contact phone number
- `{{contact_email}}` - Contact email address
- `{{website_url}}` - Wedding website URL
- `{{hashtag}}` - Wedding hashtag

## 4. Professional Email Template

### Subject Line
```
RSVP Confirmation - {{bride_name}} & {{groom_name}}'s Wedding
```

### Email Template HTML
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSVP Confirmation</title>
    <style>
        body { font-family: 'Georgia', serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px; }
        .couple-names { font-size: 28px; color: #d4af37; margin-bottom: 10px; }
        .wedding-date { font-size: 18px; color: #666; }
        .greeting { font-size: 20px; margin-bottom: 20px; }
        .confirmation { background: #f9f9f9; padding: 20px; border-left: 4px solid #d4af37; margin: 20px 0; }
        .details { margin: 20px 0; }
        .section { margin: 20px 0; padding: 15px; background: #fafafa; border-radius: 5px; }
        .venue-info { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
        .highlight { color: #d4af37; font-weight: bold; }
        .conditional { display: none; }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="couple-names">{{couple_names}}</div>
        <div class="wedding-date">{{wedding_date}} at {{wedding_time}}</div>
    </div>

    <!-- Personal Greeting -->
    <div class="greeting">
        Dear {{to_name}},
    </div>

    <!-- RSVP Confirmation -->
    <div class="confirmation">
        <strong>{{attendance_message}}</strong>
        <br><br>
        <strong>Your RSVP Status:</strong> <span class="highlight">{{attendance_status}}</span>
        <br>
        <strong>Confirmation ID:</strong> {{submission_id}}
    </div>

    <!-- Meal Information (conditional - only show if attending) -->
    <div class="section" style="display: {{show_meal_info == 'yes' ? 'block' : 'none'}};">
        <h3>🍽️ Meal Selection</h3>
        <p><strong>Your Meal Choice:</strong> {{meal_choice}}</p>
        <p><strong>Dietary Restrictions:</strong> {{dietary_restrictions}}</p>
        
        <!-- Plus-One Meal Info (conditional) -->
        <div style="display: {{show_plus_one == 'yes' ? 'block' : 'none'}};">
            <hr style="margin: 15px 0;">
            <p><strong>{{plus_one_name}}'s Meal Choice:</strong> {{plus_one_meal}}</p>
            <p><strong>{{plus_one_name}}'s Dietary Restrictions:</strong> {{plus_one_dietary}}</p>
        </div>
    </div>

    <!-- Special Requests -->
    <div class="section" style="display: {{special_requests != 'None' ? 'block' : 'none'}};">
        <h3>📝 Special Requests</h3>
        <p>{{special_requests}}</p>
    </div>

    <!-- Wedding Day Information -->
    <div class="details">
        <h3>📅 Wedding Day Information</h3>
        
        <div class="venue-info">
            <strong>🏛️ Ceremony</strong><br>
            {{ceremony_venue}}<br>
            {{ceremony_address}}<br>
            {{wedding_time}}
        </div>
        
        <div class="venue-info">
            <strong>🎉 Reception</strong><br>
            {{reception_venue}}<br>
            {{reception_address}}<br>
            Immediately following ceremony
        </div>
    </div>

    <!-- Important Reminders -->
    <div class="section">
        <h3>💫 Important Reminders</h3>
        <p><strong>Dress Code:</strong> {{dress_code}}</p>
        <p><strong>Parking:</strong> {{parking_info}}</p>
        <p><strong>Wedding Website:</strong> <a href="{{website_url}}">{{website_url}}</a></p>
        <p><strong>Wedding Hashtag:</strong> {{hashtag}}</p>
    </div>

    <!-- Contact Information -->
    <div class="section">
        <h3>📞 Need to Make Changes?</h3>
        <p>If you need to update your RSVP or have any questions, please contact us:</p>
        <p><strong>Phone:</strong> {{contact_phone}}</p>
        <p><strong>Email:</strong> {{contact_email}}</p>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>We can't wait to celebrate with you!</p>
        <p>With love,<br>{{couple_names}}</p>
        <hr style="margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
            This is an automated confirmation email for your RSVP submission.<br>
            Confirmation ID: {{submission_id}}
        </p>
    </div>
</body>
</html>
```

## 5. Testing Your Setup

### Test Email Configuration
```javascript
import { testEmailConnection, validateEmailConfig } from './utils/emailService';

// Test configuration
const configCheck = await validateEmailConfig();
if (!configCheck.isValid) {
    console.error('Email config errors:', configCheck.errors);
}

// Test connection
const connectionTest = await testEmailConnection();
if (!connectionTest.success) {
    console.error('Connection test failed:', connectionTest.error);
}
```

### Send Test Email
```javascript
import { sendConfirmationEmail } from './utils/emailService';

const testRSVP = {
    token: 'TEST123',
    guestName: 'John Doe',
    email: 'john.doe@example.com',
    isAttending: true,
    mealChoice: 'Grilled Salmon',
    dietaryRestrictions: 'No allergies',
    plusOneName: 'Jane Doe',
    plusOneMealChoice: 'Beef Tenderloin',
    plusOneDietaryRestrictions: 'Gluten-free',
    wantsEmailConfirmation: true,
    specialRequests: 'Table near the dance floor',
    submittedAt: new Date().toISOString()
};

try {
    await sendConfirmationEmail(testRSVP);
    console.log('Test email sent successfully!');
} catch (error) {
    console.error('Test email failed:', error);
}
```

## 6. Email Template Customization

### Attending Guest Template Features
- ✅ Personalized greeting with guest name
- ✅ Confirmation of attendance status
- ✅ Meal selections displayed clearly
- ✅ Plus-one information (if applicable)
- ✅ Dietary restrictions noted
- ✅ Complete wedding day schedule
- ✅ Venue information with addresses
- ✅ Dress code and parking information
- ✅ Contact information for changes

### Not Attending Template Features
- ✅ Gracious acknowledgment of decision
- ✅ Contact information still provided
- ✅ Future event invitations mentioned
- ✅ Meal and venue information hidden
- ✅ Keeps door open for last-minute changes

## 7. Error Handling

The email service includes robust error handling:

- **Configuration Validation**: Checks all required EmailJS credentials
- **Email Validation**: Validates email addresses before sending
- **Retry Logic**: Attempts to send emails up to 3 times
- **Graceful Degradation**: RSVP submission succeeds even if email fails
- **Detailed Logging**: Comprehensive error logging for debugging

## 8. Production Deployment

### Before Going Live
1. ✅ Test with real email addresses
2. ✅ Verify all template variables display correctly
3. ✅ Test both attending and not-attending scenarios
4. ✅ Test plus-one scenarios
5. ✅ Verify mobile email display
6. ✅ Check spam folder delivery
7. ✅ Test with different email providers (Gmail, Outlook, Yahoo)

### Security Considerations
- ✅ Use environment variables for all credentials
- ✅ Restrict EmailJS domain access
- ✅ Monitor email quota usage
- ✅ Implement rate limiting on email sends

## 9. Troubleshooting

### Common Issues

**Email not sending:**
- Check EmailJS service status
- Verify environment variables are set correctly
- Check browser console for errors
- Ensure EmailJS service is properly configured

**Template not displaying correctly:**
- Verify all template variables are spelled correctly
- Check EmailJS template syntax
- Test template in EmailJS dashboard

**Emails going to spam:**
- Use a professional "from" email address
- Add SPF/DKIM records to your domain
- Avoid spam trigger words in subject/content
- Include unsubscribe option

For additional support, contact the EmailJS team or refer to their documentation at https://www.emailjs.com/docs/