# Kitchen Pal Email Verification and Database Integration Fixes

## Specification ID
KP-014-Email-Verification-Database-Integration-Fixes

## Overview
Fix two critical issues affecting user authentication and data persistence:
1. Users can sign up and immediately access the application without email verification
2. User data (inventory, shopping lists, etc.) isn't being saved to the database - only localStorage is being used

The backend infrastructure for both email verification and database integration already exists but isn't properly implemented/connected on the frontend.

## Current State Analysis

### Authentication Issue
- **Backend**: Email verification system exists in `server/controllers/authController.js`
  - Verification tokens are generated during registration
  - `/api/auth/verify-email` endpoint exists
  - Users are auto-verified in development mode (`process.env.NODE_ENV === 'development'`)
  - Login checks `is_verified` status
- **Frontend**: Using localStorage-based authentication (`AuthProvider` in `App.tsx`)
- **Problem**: Frontend doesn't use the API authentication system

### Database Integration Issue  
- **Backend**: Full API system exists with Prisma/PostgreSQL
  - Complete CRUD operations for inventory, shopping lists, recipes, stores
  - Database schema ready with all tables
  - API controllers implemented
- **Frontend**: API providers exist (`*ProviderAPI.tsx`) but aren't being used
  - `App.tsx` uses localStorage providers
  - `AppAPI.tsx` exists but isn't the main entry point
- **Problem**: Frontend uses localStorage instead of API providers

## Root Cause
The application is using `App.tsx` (localStorage-based) instead of `AppAPI.tsx` (API-based) as the main application entry point.

## Issues Breakdown

### Issue 1: Missing Email Verification Flow
**Current Behavior:**
- User signs up with email/password
- User is immediately logged in and can access the application
- No email verification required

**Expected Behavior:**
- User signs up with email/password
- User receives verification email
- User must click verification link before being able to log in
- Unverified users cannot access protected routes

### Issue 2: Data Not Persisting to Database
**Current Behavior:**
- All data (inventory, shopping lists, recipes) stored in localStorage
- Data not visible in pgAdmin database
- Data lost when localStorage is cleared

**Expected Behavior:**
- All data operations use API endpoints
- Data persisted to PostgreSQL database
- Data visible and queryable in pgAdmin
- Data synchronized across devices/sessions

## Implementation Plan

### Phase 1: Switch to API-Based Application

1. **Update Main Entry Point**
   - Modify `index.tsx` to use `AppAPI.tsx` instead of `App.tsx`
   - Ensure all API providers are properly configured
   - Test basic authentication flow

2. **Email Service Integration**
   - Implement email service in backend (Nodemailer or similar)
   - Configure SMTP settings for email sending
   - Create email templates for verification
   - Update registration flow to send verification emails

3. **Frontend Verification Flow**
   - Add email verification page/component
   - Handle verification link processing
   - Update login flow to check verification status
   - Add resend verification email functionality

### Phase 2: Email Verification Implementation

1. **Backend Email Service**
   ```
   server/services/
   ├── emailService.js          # Email sending service
   ├── templates/
   │   ├── verification.html    # Email verification template
   │   └── welcome.html         # Welcome email template
   ```

2. **Email Configuration**
   - Add email environment variables
   - Configure SMTP provider (Gmail, SendGrid, etc.)
   - Set up email templates with proper styling

3. **Verification Flow Updates**
   - Modify registration to send verification email
   - Update development mode to optionally require verification
   - Add verification status to user responses

### Phase 3: Frontend Integration Updates

1. **Verification Components**
   - `VerificationPendingPage.tsx` - Show after signup
   - `EmailVerificationPage.tsx` - Handle verification links
   - Update routing to include verification pages

2. **Authentication Flow**
   - Update signup to show verification required message
   - Prevent login of unverified users
   - Add resend verification functionality

3. **User Experience**
   - Clear messaging about verification requirements
   - Email verification status in user profile
   - Option to change email (triggers re-verification)

## Technical Requirements

### Environment Variables (Backend)
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Kitchen Pal <noreply@kitchenpal.com>"

# Application URLs
FRONTEND_URL=http://localhost:5173
VERIFICATION_URL_BASE=${FRONTEND_URL}/verify-email
```

### New Backend Files

1. **Email Service** (`server/services/emailService.js`)
   - Nodemailer configuration
   - Template rendering
   - Email sending functions
   - Error handling and retry logic

2. **Email Templates** (`server/templates/`)
   - HTML email templates
   - Responsive design
   - Branded styling

### Frontend Updates

1. **Main Entry Point** (`index.tsx`)
   ```jsx
   import AppAPI from './AppAPI';
   // Change from App to AppAPI
   ```

2. **New Components**
   - Email verification pages
   - Verification status indicators
   - Resend verification controls

3. **Route Updates**
   - Add verification routes
   - Protect routes for unverified users
   - Handle verification link processing

## Verification Flow Diagram

```
User Registration → Generate Token → Send Email → User Clicks Link → Verify Token → Enable Login
       ↓                ↓              ↓             ↓              ↓           ↓
   Create User     Store Token    Email Service   Frontend Route  Update DB   Full Access
```

## Database Changes Required

### Email Tracking Table (Optional Enhancement)
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL, -- 'verification', 'password_reset', etc.
  recipient_email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
  error_message TEXT
);
```

## Testing Strategy

### Manual Testing
1. **Registration Flow**
   - Sign up with valid email
   - Check email received
   - Verify email verification link works
   - Confirm login requires verification

2. **Database Integration**
   - Add inventory items
   - Check pgAdmin for data
   - Verify data persists across sessions
   - Test all CRUD operations

3. **Error Scenarios**
   - Invalid verification tokens
   - Expired verification tokens
   - Email service failures
   - Database connection issues

### Automated Tests
- API endpoint tests for verification
- Email service unit tests
- Frontend component tests
- Integration tests for full flow

## Implementation Priority

### High Priority (Must Fix)
1. Switch to `AppAPI.tsx` to enable database integration
2. Implement basic email verification service
3. Update frontend authentication flow

### Medium Priority (Should Fix)
1. Email template styling
2. Comprehensive error handling
3. Email delivery tracking

### Low Priority (Nice to Have)
1. Email analytics
2. Advanced email templates
3. Multiple email providers

## Success Criteria

### Email Verification
- [ ] Users cannot access application without email verification
- [ ] Verification emails are sent successfully
- [ ] Verification links work correctly
- [ ] Clear user messaging throughout process
- [ ] Resend verification functionality works

### Database Integration
- [ ] All user data saves to PostgreSQL database
- [ ] Data visible in pgAdmin interface
- [ ] No data stored in localStorage
- [ ] All CRUD operations work through API
- [ ] Data persists across browser sessions

## Risk Mitigation

### Data Migration
- Current localStorage data should be preserved
- Migration script to move existing data to database
- Graceful fallback during transition

### Email Delivery
- Backup email service provider
- Queue system for email retry
- Clear error messages for email failures

### User Experience
- Clear progress indicators
- Helpful error messages
- Option to change email if verification fails

## Dependencies

### Backend Dependencies
```json
{
  "nodemailer": "^6.9.7",
  "handlebars": "^4.7.8"
}
```

### Configuration Requirements
- SMTP server access
- Email templates
- Environment variable setup
- Frontend URL configuration

## Related Files

### Backend
- `server/controllers/authController.js` - Update registration to send emails
- `server/services/emailService.js` - New email service
- `server/templates/` - New email templates directory
- `server/config/email.js` - New email configuration

### Frontend
- `index.tsx` - Switch to AppAPI
- `src/pages/auth/VerificationPendingPage.tsx` - New component
- `src/pages/auth/EmailVerificationPage.tsx` - New component
- `src/providers/AuthProviderAPI.tsx` - Update verification handling

### Configuration
- `.env` - Add email environment variables
- `docker-compose.yml` - Ensure mail service if needed