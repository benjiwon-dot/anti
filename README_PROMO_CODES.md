# Promo Code Feature - Implementation Guide

## Overview
This implementation adds a complete promo code system to the Memotile checkout flow with admin analytics.

## Files Created/Modified

### New Files:
1. **src/utils/firebase.js** - Firebase configuration
2. **src/pages/AdminPromos.jsx** - Admin dashboard for promo performance
3. **README_PROMO_CODES.md** - This file

### Modified Files:
1. **src/pages/Checkout.jsx** - Added promo code UI and validation
2. **src/utils/translations.js** - Added EN + TH translations
3. **src/App.jsx** - Added admin route

## Setup Instructions

### 1. Configure Firebase

Edit `src/utils/firebase.js` and replace placeholders with your actual Firebase project credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. Create Firestore Collection

In your Firebase console, create a collection called `promoCodes` with documents following this structure:

#### Document ID: The promo code itself (UPPERCASE, e.g., "WELCOME10")

#### Fields:
```javascript
{
  code: "WELCOME10",           // string - same as document ID
  isActive: true,              // boolean
  type: "percent",             // string - "percent" or "amount"
  value: 10,                   // number - percentage (10 = 10%) or amount (100 = ฿100)
  maxRedemptions: 100,         // number (optional) - maximum uses
  redeemedCount: 0,            // number (optional) - current usage count
  expiresAt: Timestamp,        // timestamp (optional) - expiration date
}
```

### 3. Example Promo Codes

Create these test promo codes in Firestore:

#### WELCOME10 - 10% discount
```json
{
  "code": "WELCOME10",
  "isActive": true,
  "type": "percent",
  "value": 10,
  "maxRedemptions": 100,
  "redeemedCount": 0
}
```

#### SAVE50 - ฿50 off
```json
{
  "code": "SAVE50",
  "isActive": true,
  "type": "amount",
  "value": 50
}
```

## Features

### Customer Experience
1. **Collapsible Promo Section**: "Have a code?" button in checkout
2. **Real-time Validation**: Checks against Firestore instantly
3. **Error Handling**: Shows friendly error messages for invalid/expired codes
4. **Discount Display**: Shows discount amount in order summary
5. **Bilingual Support**: English and Thai translations

### Admin Features
1. **Performance Dashboard**: Access via `/admin/promos`
2. **Aggregated Stats**: Shows usage count, revenue, and discounts per code
3. **No Auth Required**: Simple URL-based access (add auth layer in production)

### Validation Rules
- Code must exist in Firestore
- Must be active (`isActive: true`)
- Must not be expired (if `expiresAt` is set)
- Must not exceed redemption limit (if `maxRedemptions` is set)
- Discount cannot exceed order subtotal

## Usage

### For Customers
1. Go to checkout page
2. Click "Have a code?"
3. Enter promo code (case-insensitive)
4. Click "Apply"
5. See discount reflected in total
6. Complete order

### For Admins
1. Navigate to `/admin/promos`
2. View aggregated statistics for all promo codes used
3. See: code name, usage count, total revenue, total discount

## Data Flow

### Checkout Process
```
User enters code → 
Validate against Firestore → 
Calculate discount → 
Apply to order summary → 
Save in order object → 
Complete checkout
```

### Order Object Structure
```javascript
{
  id: "ORD-...",
  createdAt: timestamp,
  items: [...],
  shipping: {...},
  paymentMethod: "CARD",
  subtotal: 400,           // NEW: original price
  promoCode: "WELCOME10",  // NEW: applied code
  discountAmount: 40,      // NEW: discount amount
  total: 360              // NEW: final price after discount
}
```

## Translations

All user-facing text supports EN and TH:

- `promoHaveCode`: "Have a code?" / "มีโค้ดส่วนลด?"
- `promoEnterCode`: "Enter promo code" / "กรอกรหัสส่วนลด"
- `promoApply`: "Apply" / "ใช้โค้ด"
- `promoRemove`: "Remove" / "ลบ"
- `promoApplied`: "Code applied" / "ใช้โค้ดสำเร็จ"
- `promoInvalid`: "Invalid promo code" / "โค้ดส่วนลดไม่ถูกต้อง"
- `promoExpired`: "Promo code expired" / "โค้ดส่วนลดหมดอายุ"
- `promoMaxed`: "Promo code limit reached" / "โค้ดส่วนลดถูกใช้ครบแล้ว"
- `discountLabel`: "Discount" / "ส่วนลด"

## Testing

### Test Scenario 1: Valid Percent Discount
1. Create promo "TEST10" with 10% discount
2. Add items worth ฿400 to cart
3. Apply "TEST10"
4. Verify discount shows -฿40
5. Verify total is ฿360

### Test Scenario 2: Valid Amount Discount
1. Create promo "SAVE50" with ฿50 discount
2. Add items worth ฿400 to cart
3. Apply "SAVE50"
4. Verify discount shows -฿50
5. Verify total is ฿350

### Test Scenario 3: Expired Code
1. Create promo with past `expiresAt` date
2. Try to apply
3. Verify error: "Promo code expired"

### Test Scenario 4: Max Redemptions
1. Create promo with `maxRedemptions: 5` and `redeemedCount: 5`
2. Try to apply
3. Verify error: "Promo code limit reached"

## Production Considerations

### Security
1. **Add Firestore Rules**:
```javascript
// Allow read promoCodes, deny write from client
match /promoCodes/{code} {
  allow read: if true;
  allow write: if false;  // Only admin SDK can write
}
```

2. **Server-Side Validation**: Move promo validation to Cloud Functions
3. **Update Redemption Count**: Use server-side increment to prevent race conditions

### Analytics Enhancement
1. Create `orders` collection in Firestore
2. Save orders to Firestore instead of localStorage
3. Use Firestore queries for real-time admin stats
4. Add date range filters to admin dashboard

### Auth
1. Protect `/admin/promos` route with authentication
2. Add admin role check
3. Use Firebase Auth or custom auth system

## Firestore Security Rules Example

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Promo codes: read-only for clients
    match /promoCodes/{code} {
      allow read: if true;
      allow write: if false;
    }
    
    // Orders: authenticated users only
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

## Support

For issues or questions about the promo code implementation:
1. Check Firebase console for promo code configuration
2. Verify Firebase credentials in `src/utils/firebase.js`
3. Check browser console for error messages
4. Ensure Firestore is enabled in your Firebase project

## Future Enhancements
- [ ] Automatic redemption count increment via Cloud Functions
- [ ] Promo code admin creation UI
- [ ] User-specific promo codes
- [ ] Stackable promo codes
- [ ] First-time customer codes
- [ ] Referral code system
- [ ] Email campaign integration
