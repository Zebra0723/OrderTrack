# OrderTrack

A Mac app for managing orders for two businesses: **ClearSense** (custom PS5 controller housings) and **Hackulator** (calculators hacked to play games).

## Install on your Mac

1. Open the repository's **Releases** page and download the DMG from the `latest` release:
   - `OrderTrack-1.0.0-arm64.dmg` for Apple Silicon Macs (M1 and later)
   - `OrderTrack-1.0.0-x64.dmg` for Intel Macs
2. Open the DMG and drag **OrderTrack** into **Applications**.
3. The app is not notarised by Apple, so the first time you open it macOS will block it. Run this once in Terminal, then open it normally:

   ```bash
   xattr -cr /Applications/OrderTrack.app
   ```

   Or go to System Settings, Privacy and Security, and click **Open Anyway**.

Every push to `main` or a `claude/*` branch rebuilds the DMGs with GitHub Actions (`.github/workflows/build-mac.yml`).

## Features

- Switch between ClearSense and Hackulator orders, with open-order counts and status filters.
- New order forms with validation: serial numbers must be exactly 10 characters and start with `CS` or `HC`. Order IDs and serial numbers must be unique.
- ClearSense: the colour list depends on the BDM model, the delivery options depend on the colour, and the price fills in automatically.
- Hackulator: base price covers the included games, and each extra game line adds the extra game price.
- Find Order searches by serial number or order ID (Cmd+F). Cmd+N starts a new order.
- Order view: full details and status changes (pending, confirmed, in progress, shipped, delivered), with an optional update email to the customer for each change.
- Customers: every customer with all their orders across both businesses.
- Settings: all prices, colours, express availability, colour-to-model mapping, models, options, delivery wording, Hackulator games and pricing, email account, passcode, backup export and import. Everything saves automatically.
- Customers can be recorded with an email, a phone number, or both. Orders sharing an email or phone are grouped as one customer.
- Discounts: saved one-click discounts (set in Settings) or a custom percent or amount per order, changeable later from the order page. Shown in the order summary and in customer emails.
- Payment: pay upfront (with a paid toggle) or finance, choosing weekly or monthly, the number of payments and the first payment date. The order page shows the instalment schedule with paid ticks and overdue payments highlighted.
- Extra notes on each order, private to you and never sent to customers.
- Cancel an order (kept on record, left out of open orders and totals, can be reopened) or delete it permanently.
- Passcode lock on launch.

## Data and email

- Data is stored on the Mac at `~/Library/Application Support/OrderTrack/ordertrack-data.json`. The previous version is kept in `ordertrack-data.backup.json`. Use Settings, Data, Export backup for off-machine copies.
- Emails are sent over SMTP from inside the app. Set this up in Settings, Email (for Gmail: `smtp.gmail.com`, port 587, and an app password). The SMTP password is encrypted with the macOS keychain. Until email is set up, update emails open pre-filled in your mail app.

## Development

```bash
npm install
npm start
```

Fonts (Fraunces and Instrument Sans, from Google Fonts) are bundled through the Fontsource packages so the app works offline.
