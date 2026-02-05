# Firestore Security Rules: Admin vs. Client

This document outlines the security strategy for the Memotile application, specifically addressing how Admin access is segregated from standard customer access.

## Strategic Overview

- **Admin Logic**: The Admin Interface is built into the Expo project but uses **Client-side Logic** gated by Firebase Custom Claims (`isAdmin`). This ensures the app remains a single bundle while maintaining security.
- **Access Control**: Security rules enforce that only users with `isAdmin: true` in their token can read/write global order data.
- **Web-Only UI**: The Admin Dashboard UI uses web-standard HTML/CSS and is optimized for desktop browsers. It is automatically disabled on native iOS/Android platforms to prevent crashes and ensure a premium experience.

## Accessing the Admin Dashboard

1.  **Start the Expo Server**: Run `npx expo start --web`.
2.  **Use the Generated URL**: Access the `/admin` path using the same port provided by the dev server (e.g., `http://localhost:8085/admin`).
    > [!IMPORTANT]
    > Do not use hardcoded ports if the server picks a different one. Always check the terminal output for the correct Web URL.
3.  **Authentication**: You must be logged in with an account that has the `isAdmin` custom claim.

## Proposed Rules Snippet

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Checks if the user has the 'isAdmin' custom claim
    function isAdmin() {
      return request.auth != null && request.auth.token.isAdmin == true;
    }

    // Helper: Checks if the user is the owner of the record
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /orders/{orderId} {
      // Admins can read/write any order
      allow read, write: if isAdmin();
      
      // Customers can list/read their own orders
      // They cannot update once 'paid', except for specific fields if needed
      allow list, get: if isOwner(resource.data.uid);
      
      // Subcollection for items
      match /items/{itemId} {
        allow read, write: if isAdmin();
        allow read: if isOwner(get(/databases/$(database)/documents/orders/$(orderId)).data.uid);
      }
    }
    
    // ... rest of rules
  }
}
```

## Custom Claims for Admin
To enable admin access, you must set the `isAdmin` custom claim on the user's Firebase account. This can be done via the Admin SDK:

```javascript
admin.auth().setCustomUserClaims(uid, { isAdmin: true });
```
Once set, the user must re-authenticate (or refresh their token) for the claim to be included in their ID token.
