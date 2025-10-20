# Image Upload System - Setup Guide

## Overview

This image upload system provides:
- **Multi-provider storage** (Cloudinary, ImageKit, Sirv)
- **Intelligent account selection** using weighted algorithm
- **Automatic image optimization** with Sharp (compression, resizing)
- **Organization-based pricing** with usage tracking
- **Manual billing approval** for initial phase

---

## Prerequisites

1. **Create free accounts:**
   - [Cloudinary](https://cloudinary.com/users/register/free) - 25GB storage, 25GB bandwidth
   - [ImageKit](https://imagekit.io/registration) - 20GB storage, 20GB bandwidth
   - [Sirv](https://my.sirv.com/#/signup) - 500MB storage, 2GB bandwidth (optional)

2. **Get API credentials** from each provider's dashboard

---

## Installation

### 1. Packages are already installed:
```bash
# These were installed:
# - sharp (image optimization)
# - multer (file upload middleware)
# - cloudinary (Cloudinary SDK)
# - imagekit (ImageKit SDK)
```

### 2. Configure Environment Variables

Update `.env` file with your provider credentials:

```bash
# Cloudinary Account 1
CLOUDINARY_1_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_1_API_KEY=your_cloudinary_api_key
CLOUDINARY_1_API_SECRET=your_cloudinary_api_secret

# ImageKit Account 1
IMAGEKIT_1_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_1_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_1_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id

# Sirv Account 1 (optional)
SIRV_1_CLIENT_ID=your_sirv_client_id
SIRV_1_CLIENT_SECRET=your_sirv_client_secret

# Add more accounts by incrementing numbers:
# CLOUDINARY_2_CLOUD_NAME=...
# IMAGEKIT_2_PUBLIC_KEY=...
```

### 3. Seed Storage Accounts

After adding credentials, run the seed script:

```bash
cd testforge-backend
node src/utils/seedStorageAccounts.js
```

This will create storage account records in your database.

---

## Database Models

### 1. StorageAccount
Tracks provider accounts and their usage:
- Provider credentials (encrypted)
- Storage/bandwidth limits
- Current usage statistics
- Status (active/near_limit/exhausted/disabled)
- Selection priority

### 2. OrganizationBilling
Manages organization pricing and quotas:
- Plan tier (free/starter/professional/business/enterprise)
- Usage limits per plan
- Current usage tracking
- Per-user usage breakdown
- Manual approval flags

### 3. Image
Records uploaded images:
- File metadata (name, size, dimensions)
- Provider and account used
- Public URL for access
- Entity association (case/feedback/feature/etc.)
- Soft delete support

---

## Pricing Plans

| Plan | Price | Storage | Bandwidth | Uploads/Month | Max File Size |
|------|-------|---------|-----------|---------------|---------------|
| **Free** | $0 | 0 MB | 0 GB | 0 | 2 MB |
| **Starter** | $5/mo | 500 MB | 5 GB | 1,000 | 5 MB |
| **Professional** | $15/mo | 5 GB | 50 GB | 10,000 | 10 MB |
| **Business** | $49/mo | 50 GB | 500 GB | 100,000 | 25 MB |
| **Enterprise** | Custom | Custom | Custom | Unlimited | 100 MB |

### Free Tier
- No image uploads allowed
- External image links only
- Can still use avatars/logos via external URLs

---

## API Endpoints

### Image Upload

**Upload Single Image**
```http
POST /api/images/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- image: file
- entityType: 'case' | 'feedback' | 'feature' | 'organization' | 'user' | 'session'
- entityId: string
- orgId: string
```

**Upload Multiple Images**
```http
POST /api/images/upload-multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- images[]: files (max 10)
- entityType: string
- entityId: string
- orgId: string
```

**Get Entity Images**
```http
GET /api/images/:entityType/:entityId
Authorization: Bearer <token>
```

**Delete Image**
```http
DELETE /api/images/:imageId
Authorization: Bearer <token>
```

**Get Organization Usage**
```http
GET /api/images/usage/:orgId
Authorization: Bearer <token>
```

### Billing Management

**Get All Plans**
```http
GET /api/billing/plans
```

**Get Organization Billing Info**
```http
GET /api/billing/organizations/:orgId
Authorization: Bearer <token>
```

**Get Usage Statistics**
```http
GET /api/billing/organizations/:orgId/usage
Authorization: Bearer <token>
```

**Request Plan Upgrade**
```http
POST /api/billing/organizations/:orgId/request-upgrade
Authorization: Bearer <token>

Body:
{
  "plan": "starter" | "professional" | "business" | "enterprise",
  "notes": "optional message"
}
```

**Admin: Manually Approve Plan**
```http
POST /api/billing/admin/organizations/:orgId/approve-plan
Authorization: Bearer <admin-token>

Body:
{
  "plan": "starter",
  "notes": "Payment received via bank transfer"
}
```

---

## Account Selection Algorithm

The system automatically selects the best storage account using a weighted algorithm:

```javascript
Priority Score =
  (0.35 × storage_availability) +
  (0.25 × bandwidth_availability) +
  (0.25 × upload_limit_availability) +
  (0.15 × recency_score)
```

**Selection Process:**
1. Filter active accounts that can accommodate file size
2. Calculate priority scores for each account
3. Sort by score (highest first)
4. Add randomness to top 3 candidates to prevent always using same account
5. Select and record upload

---

## Image Optimization

All images are automatically optimized using Sharp before upload:

**Default Settings:**
- Max dimensions: 2048×2048px
- Quality: 85%
- Progressive JPEG enabled
- Auto-rotation based on EXIF
- Preserve metadata
- Format-specific optimization

**Compression Results:**
- Typical compression ratio: 2-5x
- JPEG: mozjpeg compression
- PNG: Level 9 compression
- WebP: Preferred for new uploads
- GIF: Converted to WebP if static

---

## Manual Billing Workflow

For the initial phase without Stripe integration:

### 1. User Requests Upgrade
User clicks "Upgrade" on pricing page, submits request

### 2. Admin Receives Notification
- View upgrade requests in admin dashboard
- Contact user for payment (email/phone)

### 3. Process Payment
- Receive payment via bank transfer/manual method
- Record payment details

### 4. Approve Plan
```bash
# Via API call or MongoDB directly
POST /api/billing/admin/organizations/{orgId}/approve-plan
{
  "plan": "professional",
  "notes": "Payment received: $15 via bank transfer on 2025-10-20"
}
```

### 5. User Gets Access
- Organization plan updated
- New limits applied immediately
- User can start uploading images

---

## Monitoring & Maintenance

### Check Account Health
```bash
# Get overall storage statistics
GET /api/billing/admin/dashboard

# Get accounts approaching limits
GET /api/billing/admin/approaching-limits?threshold=80
```

### Sync Account Usage
```javascript
// Run periodically (daily cron job)
const storageAccountService = require('./services/storageAccountService');
await storageAccountService.syncAllAccountsUsage();
```

### Reset Monthly Counters
```javascript
// Run on 1st of each month (cron job)
const StorageAccount = require('./models/StorageAccount');
const OrganizationBilling = require('./models/OrganizationBilling');

await StorageAccount.resetMonthlyCounts();
await OrganizationBilling.resetMonthlyCounts();
```

---

## Usage Examples

### Backend: Upload Image

```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('entityType', 'case');
formData.append('entityId', caseId);
formData.append('orgId', organizationId);

const response = await fetch('/api/images/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
// result.data.image.url = publicly accessible image URL
```

### Check if Org Can Upload

```javascript
const billing = await OrganizationBilling.findOne({ orgId });
const check = billing.canUpload(fileSize);

if (!check.allowed) {
  throw new Error(check.reason);
}
```

### Get Usage Statistics

```javascript
const stats = await billingService.getUsageStats(orgId);

console.log(stats);
// {
//   storage: { used: 5000000, limit: 500000000, percentage: 1 },
//   uploads: { used: 10, limit: 1000, percentage: 1 },
//   bandwidth: { used: 2000000, limit: 5000000000, percentage: 0.04 },
//   plan: 'starter',
//   status: 'active'
// }
```

---

## Testing

### 1. Initialize Test Organization
```javascript
const org = await Organization.create({ name: 'Test Org' });
const billing = await billingService.createBillingRecord(org._id, 'free');
```

### 2. Upgrade to Starter Plan
```javascript
await billingService.manuallyApprovePlan(
  org._id,
  'starter',
  adminUserId,
  'Test upgrade'
);
```

### 3. Test Upload
```bash
curl -X POST http://localhost:5000/api/images/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-image.jpg" \
  -F "entityType=case" \
  -F "entityId=673d9..." \
  -F "orgId=673d8..."
```

### 4. Verify Usage Updated
```javascript
const usage = await imageUploadService.getOrganizationUsage(org._id);
console.log(usage); // Should show uploaded file size
```

---

## Security Considerations

1. **File Type Validation:** Only images allowed (JPEG, PNG, GIF, WebP, SVG)
2. **File Size Limits:** Enforced at org level based on plan
3. **Authentication Required:** All endpoints require valid JWT
4. **Credentials Encrypted:** Store provider credentials securely
5. **Soft Delete:** Images never permanently deleted immediately
6. **Usage Tracking:** Prevent quota abuse with per-user tracking

---

## Troubleshooting

### Issue: "No available storage accounts"
**Solution:** Run seed script to add accounts from .env

### Issue: "Organization storage limit exceeded"
**Solution:** User needs to upgrade plan or delete old images

### Issue: Images not uploading
**Check:**
1. Provider credentials are correct in .env
2. Storage accounts seeded successfully
3. Organization has active billing status
4. File size within org limits

### Issue: Provider API errors
**Check:**
1. API keys are valid and not expired
2. Provider account not suspended
3. Account hasn't exceeded free tier limits

---

## Next Steps

1. **Add your provider credentials** to `.env`
2. **Run seed script** to create storage accounts
3. **Test with Postman/curl** to verify upload works
4. **Create billing records** for existing organizations
5. **Build frontend pricing page** (see FRONTEND_INTEGRATION.md)
6. **Set up cron jobs** for usage sync and monthly resets
7. **Implement Stripe** for automated payments (future)

---

## Support

For issues or questions:
1. Check logs: `console.log` statements in services
2. Verify MongoDB records: StorageAccount, OrganizationBilling, Image
3. Test provider APIs directly to isolate issues
4. Check provider dashboards for usage/quota info
