# Multi-Institute Admission & Fees Management Portal

An enterprise-grade, multi-tenant portal for running admissions, fee collections, student registries, financial accounting, reminder dispatch, and certificate verification across multiple educational institutes from a single browser application.

---

## 🌟 Key Features

- **Multi-Tenant Isolation**: Complete subcollection-based isolation in Firestore (`institutes/{instituteId}/*`). No institute can view another's records.
- **Super Admin Master Control**: Provision new institutes, toggle active/suspended/trial statuses, manage subscription tiers, and test any tenant via impersonation mode.
- **Atomic Registration Numbers**: Indian Financial Year serial generation (e.g., `MAAC-2026-27-0001`) enforced via Firestore transaction.
- **Student Lifecycle & Registry**: Filterable directory, student profiles, status change history timeline, and quick WhatsApp communication.
- **Fee Management & Receipts**: Multi-mode collections (UPI, Cash, Bank Transfer, Cheque), fee balance tracking, and printable official receipts.
- **Lead Pipeline & CSV Import**: Upload CSV inquiries from marketing channels and convert leads into admissions with 1-click.
- **Financial Intelligence & P&L**: Income ledger, categorised operational expenses, and monthly profit/loss reports.
- **Fee Reminders**: Overdue grouping (>60 days, 30-60 days, <30 days), personalized WhatsApp messages, and bulk dispatch.
- **Birthday Desk**: Automated student birthday detection with celebratory greetings.
- **Public Certificate Verification**: QR-compatible public portal (`?verify=1`) to confirm genuine student credentials.
- **Per-Institute EmailJS**: Customizable email service keys per branch for receipts and alerts.

---

## 🚀 Quick Setup & Configuration

### 1. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new Firebase project.
2. Under **Build**, select **Authentication**:
   - Click **Get Started** and enable **Email/Password** sign-in provider.
3. Under **Build**, select **Firestore Database**:
   - Click **Create Database** and start in **Production mode**.
   - Copy rules from `firestore.rules` into the **Rules** tab and click **Publish**.
4. Go to **Project Settings** (gear icon) -> **General** -> scroll to **Your apps**:
   - Click the Web icon `</>` to register a web app.
   - Copy the `firebaseConfig` keys.

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Fill in your project credentials:

```ini
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-app-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"

# Super Admin email (Grants access to Super Admin Panel)
VITE_SUPER_ADMIN_EMAIL="rjrajverma92@gmail.com"
```

> **Note**: In preview mode without Firebase credentials, the portal automatically operates in **Isolated Demo Mode** with pre-seeded institutes (`MAAC Raipur`, `Arena Animation`) and sample students so you can explore immediately.

---

## 🔐 Adding Your First Institute

1. Start the app and log in with your `VITE_SUPER_ADMIN_EMAIL`.
2. In the **Super Admin Panel**, click **Add Institute**.
3. Fill in:
   - **Institute Name**: e.g. `MAAC Raipur`
   - **Prefix**: 2 to 6 uppercase letters, e.g. `MAAC` (generates `MAAC-2026-27-0001`)
   - **Admin Email**: The email used by the institute staff to log in
   - **Temporary Password**: Initial password for the branch administrator
   - **Plan & Modules**: Toggle desired features (Finance, Reminders, Leads, etc.)
4. Click **Provision Institute**. The Firebase Auth account and isolated Firestore tenant document will be created.

---

## 📧 EmailJS Setup (Per-Institute)

Each institute administrator can link their own EmailJS account in **Settings -> EmailJS Integration**:

1. Sign up at [EmailJS](https://www.emailjs.com/).
2. Create an **Email Service** (e.g. connected to Gmail). Copy the **Service ID**.
3. Create two **Email Templates**:
   - **Admission Template**: variables: `{{to_name}}`, `{{reg_number}}`, `{{total_fees}}`, `{{paid_amount}}`, `{{remaining_fees}}`.
   - **Payment Receipt Template**: variables: `{{to_name}}`, `{{payment_amount}}`, `{{payment_mode}}`, `{{remaining_fees}}`.
4. Copy your **Public Key** from Account Settings.
5. Save in **Settings -> EmailJS Integration** and test with the **Send Test Email** button.

---

## 🌐 Deployment to Firebase Hosting

```bash
# Build production bundle
npm run build

# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting
# Select: dist as public directory, configure as single-page app: Yes

# Deploy
firebase deploy
```
