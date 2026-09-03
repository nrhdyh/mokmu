# NiagaSimple COMPLETE UI

Ini versi penuh yang dah diubah terus dalam project.

## Dah termasuk
- UI baru sepenuhnya
- Logo NiagaSimple dalam `assets/logo.png`
- Gambar product dalam `assets/`
- Cart + quantity control
- Checkout Pickup / COD
- DuitNow QR / Cash
- Google Sheet submit
- WhatsApp confirmation
- Apps Script V3: Orders, Order Items, Receipt, Supplier, Settings
- Supplier profit RM2/item + outstanding tracking

## 1. Edit config.js
Tukar:
- `sellerWhatsApp`
- `qrAccountName`
- `appsScriptUrl`
- harga / nama product jika perlu

## 2. QR
Letak gambar QR sendiri sebagai:
`assets/qr.png`

## 3. Google Sheet
Google Sheet > Extensions > Apps Script.
Paste semua code dari:
`apps-script/Code.gs`

Run:
`setupNiagaSimple()`

Kemudian deploy sebagai Web App:
- Execute as: Me
- Who has access: Anyone

Copy URL `/exec` dan paste ke `config.js`.

## 4. GitHub Pages
Upload SEMUA isi folder ini ke root repository:
- index.html
- styles.css
- app.js
- config.js
- assets/

Folder `apps-script/` tak diperlukan oleh website, ia cuma backup code backend.

Pages:
- Deploy from a branch
- main
- /(root)

## Folder structure
```
index.html
styles.css
app.js
config.js
assets/
  logo.png
  karipap-sardin.png
  popia-carbonara.png
  donut-gulung-sosej.png
  qr.png   <-- tambah sendiri
apps-script/
  Code.gs
```
