window.STORE_CONFIG = {
  // ===============================
  // EDIT MAKLUMAT BISNES DI SINI
  // ===============================
  storeName: "NiagaSimple Demo",
  tagline: "Order mudah, urus pun mudah.",
  heroTitle: "Frozen food sedap, order pun senang.",
  heroText: "Pilih menu, tambah ke cart dan terus submit. Order masuk Google Sheet dan confirmation terus ke WhatsApp.",

  // Format Malaysia: 60123456789
  sellerWhatsApp: "60125057046",

  // Nama pemilik akaun QR
  qrAccountName: "NAMA AKAUN SELLER",

  // Letakkan gambar QR sebagai assets/qr.png
  qrImage: "assets/qr.png",

  // Paste Google Apps Script Web App /exec URL
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbwOGdfcY7728Xsc-En9u8iQGyDjzUSa4DZY0somzNr_ZBIXGAl5A2RBekPKv7fAj1VJ9A/exec",

  currency: "RM",

  // ===============================
  // PRODUCT LIST
  // ===============================
  products: [
    {
      id: "P001",
      name: "Karipap Sardin",
      variant: "10 biji",
      price: 6.00,
      description: "Homemade, frozen dan ready to fry.",
      image: "assets/karipap-sardin.png",
      badge: "Hot item"
    },
    {
      id: "P002",
      name: "Karipap Sardin",
      variant: "18 biji",
      price: 10.00,
      description: "Value pack untuk customer yang nak lebih banyak.",
      image: "assets/karipap-sardin.png",
      badge: "Value pack"
    },
    {
      id: "P003",
      name: "Popia Carbonara",
      variant: "10 biji",
      price: 10.00,
      description: "Rangup di luar dengan creamy filling di dalam.",
      image: "assets/popia-carbonara.png",
      badge: "Best seller"
    },
    {
      id: "P004",
      name: "Donut Gulung Sosej",
      variant: "10 biji",
      price: 5.00,
      description: "Mini size, lembut dan sesuai untuk seisi keluarga.",
      image: "assets/donut-gulung-sosej.png",
      badge: "Family favourite"
    }
  ]
};
