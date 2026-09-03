(() => {
  const config = window.STORE_CONFIG;
  const cart = new Map();

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const els = {
    heroTitle: $("#heroTitle"),
    heroText: $("#heroText"),
    productGrid: $("#productGrid"),
    searchInput: $("#searchInput"),

    cartButton: $("#cartButton"),
    cartCount: $("#cartCount"),
    cartDrawer: $("#cartDrawer"),
    drawerItems: $("#drawerItems"),
    drawerTotal: $("#drawerTotal"),
    goCheckout: $("#goCheckout"),

    cartItems: $("#cartItems"),
    clearCart: $("#clearCart"),
    subtotal: $("#subtotal"),
    grandTotal: $("#grandTotal"),

    fulfilment: $("#fulfilment"),
    locationField: $("#locationField"),
    location: $("#location"),

    paymentMethod: $("#paymentMethod"),
    qrPanel: $("#qrPanel"),
    qrPlaceholder: $("#qrPlaceholder"),
    qrImage: $("#qrImage"),
    qrAccountName: $("#qrAccountName"),

    orderForm: $("#orderForm"),
    submitButton: $("#submitButton"),

    toast: $("#toast")
  };

  // =========================================================
  // HELPERS
  // =========================================================

  const money = (n) =>
    `${config.currency}${Number(n).toFixed(2)}`;

  const escapeHtml = (v) =>
    String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // =========================================================
  // INITIALIZE
  // =========================================================

  function init() {
    if (els.heroTitle) {
      els.heroTitle.textContent = config.heroTitle;
    }

    if (els.heroText) {
      els.heroText.textContent = config.heroText;
    }

    if (els.qrAccountName) {
      els.qrAccountName.textContent = config.qrAccountName;
    }

    // Load QR image if exists
    if (config.qrImage) {
      const test = new Image();

      test.onload = () => {
        els.qrImage.src = config.qrImage;
        els.qrImage.classList.remove("hidden");
        els.qrPlaceholder.classList.add("hidden");
      };

      test.onerror = () => {
        console.warn("QR image tidak dijumpai:", config.qrImage);
      };

      test.src = config.qrImage;
    }

    renderProducts();
    renderCart();
    toggleFulfilment();
    togglePayment();
    bindEvents();
  }

  // =========================================================
  // PRODUCTS
  // =========================================================

  function renderProducts(query = "") {
    const q = query.toLowerCase().trim();

    const rows = config.products.filter((product) => {
      const text = `
        ${product.name || ""}
        ${product.variant || ""}
        ${product.description || ""}
      `.toLowerCase();

      return text.includes(q);
    });

    if (!rows.length) {
      els.productGrid.innerHTML = `
        <div class="empty-cart">
          <p>Tiada produk dijumpai.</p>
        </div>
      `;
      return;
    }

    els.productGrid.innerHTML = rows
      .map(
        (product) => `
        <article class="product-card">

          <div class="product-media">

            ${
              product.badge
                ? `
              <span class="product-badge">
                ${escapeHtml(product.badge)}
              </span>
            `
                : ""
            }

            <img
              src="${escapeHtml(product.image || "")}"
              alt="${escapeHtml(product.name)}"
              loading="lazy"
            >

          </div>

          <div class="product-body">

            <div>
              <h3>
                ${escapeHtml(product.name)}
              </h3>

              <p>
                <strong>
                  ${escapeHtml(product.variant || "")}
                </strong>

                ${
                  product.description
                    ? ` · ${escapeHtml(product.description)}`
                    : ""
                }
              </p>
            </div>

            <div class="product-meta">

              <span class="price">
                ${money(product.price)}
              </span>

              <button
                class="add-btn"
                type="button"
                data-add="${escapeHtml(product.id)}"
              >
                + Add
              </button>

            </div>

          </div>

        </article>
      `
      )
      .join("");

    $$("[data-add]").forEach((button) => {
      button.addEventListener("click", () => {
        addToCart(button.dataset.add);
      });
    });
  }

  // =========================================================
  // CART
  // =========================================================

  function addToCart(id) {
    const product = config.products.find(
      (product) => product.id === id
    );

    if (!product) return;

    const existing = cart.get(id);

    cart.set(id, {
      product,
      qty: existing ? existing.qty + 1 : 1
    });

    renderCart();

    toast(`${product.name} ditambah ke cart`);
  }

  function updateQty(id, change) {
    const row = cart.get(id);

    if (!row) return;

    row.qty += change;

    if (row.qty <= 0) {
      cart.delete(id);
    } else {
      cart.set(id, row);
    }

    renderCart();
  }

  function cartRows() {
    return [...cart.values()];
  }

  function subtotalValue() {
    return cartRows().reduce((sum, row) => {
      return (
        sum +
        Number(row.product.price) * Number(row.qty)
      );
    }, 0);
  }

  function cartMarkup() {
    if (!cart.size) {
      return `
        <div class="empty-cart">
          <span>🛒</span>
          <p>Cart masih kosong.</p>
        </div>
      `;
    }

    return cartRows()
      .map(
        ({ product, qty }) => `
        <div class="cart-row">

          <div class="cart-info">

            <strong>
              ${escapeHtml(product.name)}
              ${
                product.variant
                  ? `(${escapeHtml(product.variant)})`
                  : ""
              }
            </strong>

            <span>
              ${money(product.price)} × ${qty}
            </span>

          </div>

          <div class="qty-control">

            <button
              type="button"
              data-minus="${escapeHtml(product.id)}"
            >
              −
            </button>

            <span>
              ${qty}
            </span>

            <button
              type="button"
              data-plus="${escapeHtml(product.id)}"
            >
              +
            </button>

          </div>

        </div>
      `
      )
      .join("");
  }

  function renderCart() {
    const markup = cartMarkup();

    els.cartItems.innerHTML = markup;
    els.drawerItems.innerHTML = markup;

    [els.cartItems, els.drawerItems].forEach(
      (container) => {
        container
          .querySelectorAll("[data-minus]")
          .forEach((button) => {
            button.onclick = () =>
              updateQty(
                button.dataset.minus,
                -1
              );
          });

        container
          .querySelectorAll("[data-plus]")
          .forEach((button) => {
            button.onclick = () =>
              updateQty(
                button.dataset.plus,
                1
              );
          });
      }
    );

    const count = cartRows().reduce(
      (sum, row) => sum + row.qty,
      0
    );

    const total = subtotalValue();

    els.cartCount.textContent = count;
    els.subtotal.textContent = money(total);
    els.grandTotal.textContent = money(total);
    els.drawerTotal.textContent = money(total);
  }

  // =========================================================
  // CART DRAWER
  // =========================================================

  function openDrawer() {
    els.cartDrawer.classList.add("open");

    els.cartDrawer.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    els.cartDrawer.classList.remove("open");

    els.cartDrawer.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.style.overflow = "";
  }

  // =========================================================
  // FULFILMENT
  // =========================================================

  function toggleFulfilment() {
    const isCOD =
      els.fulfilment.value === "COD";

    els.locationField.classList.toggle(
      "hidden",
      !isCOD
    );

    els.location.required = isCOD;
  }

  // =========================================================
  // PAYMENT
  // =========================================================

  function togglePayment() {
    const isQR =
      els.paymentMethod.value ===
      "DuitNow QR";

    els.qrPanel.classList.toggle(
      "hidden",
      !isQR
    );
  }

  // =========================================================
  // ORDER ID
  // =========================================================

  function orderId() {
    const d = new Date();

    const year = String(
      d.getFullYear()
    ).slice(-2);

    const month = String(
      d.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      d.getDate()
    ).padStart(2, "0");

    const random =
      Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase();

    return `ORD-${year}${month}${day}-${random}`;
  }

  // =========================================================
  // PHONE
  // =========================================================

  function normalizePhone(phone) {
    let p = String(phone).replace(
      /\D/g,
      ""
    );

    // 0123456789 -> 60123456789
    if (p.startsWith("0")) {
      p = "6" + p;
    }

    // 123456789 -> 60123456789
    if (!p.startsWith("60")) {
      p = "60" + p;
    }

    return p;
  }

  function validPhone(phone) {
    const digits =
      String(phone).replace(
        /\D/g,
        ""
      );

    return (
      digits.length >= 9 &&
      digits.length <= 13
    );
  }

  // =========================================================
  // WHATSAPP MESSAGE
  // =========================================================

  function waMessage(order) {
    const lines = [
      `Hi, saya nak confirm order ${order.orderId}.`,
      "",
      `Nama: ${order.customerName}`,
      `Cara terima: ${order.fulfilment}${
        order.location
          ? ` - ${order.location}`
          : ""
      }`,
      `Bayaran: ${order.paymentMethod}`,
      "",
      "ITEM:"
    ];

    order.items.forEach((item) => {
      lines.push(
        `- ${item.name}${
          item.variant
            ? ` (${item.variant})`
            : ""
        } x${item.qty} = ${money(
          item.lineTotal
        )}`
      );
    });

    lines.push(
      "",
      `Total produk: ${money(
        order.subtotal
      )}`
    );

    if (order.fulfilment === "COD") {
      lines.push(
        "Caj COD: akan disahkan seller"
      );
    }

    if (order.note) {
      lines.push(
        `Nota: ${order.note}`
      );
    }

    lines.push("");

    if (
      order.paymentMethod ===
      "DuitNow QR"
    ) {
      lines.push(
        "Saya akan hantar screenshot resit di sini selepas pembayaran."
      );
    } else {
      lines.push(
        "Payment: Cash."
      );
    }

    lines.push(
      "",
      "Terima kasih."
    );

    return lines
      .filter(
        (line, index, arr) =>
          !(
            line === "" &&
            arr[index - 1] === ""
          )
      )
      .join("\n");
  }

  // =========================================================
  // GOOGLE SHEETS
  // =========================================================

  async function sendToSheet(order) {
    const url = String(
      config.appsScriptUrl || ""
    ).trim();

    if (
      !url ||
      url.includes(
        "PASTE_APPS_SCRIPT"
      )
    ) {
      throw new Error(
        "Apps Script URL belum diset dalam config.js"
      );
    }

    if (!url.endsWith("/exec")) {
      console.warn(
        "Apps Script URL sepatutnya berakhir dengan /exec"
      );
    }

    await fetch(url, {
      method: "POST",

      // Required for GitHub Pages
      // -> Google Apps Script
      mode: "no-cors",

      cache: "no-store",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify(order)
    });
  }

  // =========================================================
  // SUBMIT ORDER
  // =========================================================

  async function submitOrder(e) {
    e.preventDefault();

    // ---------------------------------------
    // CART VALIDATION
    // ---------------------------------------

    if (!cart.size) {
      toast(
        "Cart masih kosong"
      );

      return;
    }

    const fd =
      new FormData(
        els.orderForm
      );

    // Spam bot protection
    if (fd.get("website")) {
      return;
    }

    // ---------------------------------------
    // FORM DATA
    // ---------------------------------------

    const customerName =
      String(
        fd.get("customerName") || ""
      ).trim();

    const phone =
      String(
        fd.get("phone") || ""
      ).trim();

    const fulfilment =
      String(
        fd.get("fulfilment") || ""
      );

    const location =
      String(
        fd.get("location") || ""
      ).trim();

    const paymentMethod =
      String(
        fd.get("paymentMethod") || ""
      );

    const note =
      String(
        fd.get("note") || ""
      ).trim();

    // ---------------------------------------
    // VALIDATION
    // ---------------------------------------

    if (!customerName) {
      toast(
        "Sila masukkan nama"
      );

      return;
    }

    if (!validPhone(phone)) {
      toast(
        "No. WhatsApp tidak sah"
      );

      return;
    }

    if (
      fulfilment === "COD" &&
      !location
    ) {
      toast(
        "Sila isi lokasi COD"
      );

      return;
    }

    // ---------------------------------------
    // CREATE ORDER
    // ---------------------------------------

    const order = {
      orderId: orderId(),

      createdAtClient:
        new Date().toISOString(),

      storeName:
        config.storeName,

      customerName,

      phone:
        normalizePhone(phone),

      fulfilment,

      location,

      paymentMethod,

      note,

      // Currently COD fee
      // manually entered in GSheet
      codFee: 0,

      subtotal:
        Number(
          subtotalValue().toFixed(2)
        ),

      status: "NEW",

      paymentStatus:
        paymentMethod ===
        "DuitNow QR"
          ? "PENDING VERIFY"
          : "CASH",

      items:
        cartRows().map(
          ({ product, qty }) => ({
            productId:
              product.id,

            name:
              product.name,

            variant:
              product.variant || "",

            unitPrice:
              Number(
                product.price
              ),

            qty:
              Number(qty),

            lineTotal:
              Number(
                (
                  Number(product.price) *
                  Number(qty)
                ).toFixed(2)
              )
          })
        )
    };

    // ---------------------------------------
    // DISABLE BUTTON
    // ---------------------------------------

    els.submitButton.disabled = true;

    els.submitButton.innerHTML =
      "Submitting... <span>→</span>";

    try {

      // =====================================
      // 1. SEND ORDER TO GOOGLE SHEET
      // =====================================

      await sendToSheet(order);

      // =====================================
      // 2. SAVE LOCAL BACKUP
      // =====================================

      try {
        localStorage.setItem(
          `order_${order.orderId}`,
          JSON.stringify(order)
        );
      } catch (storageError) {
        console.warn(
          "Local storage unavailable:",
          storageError
        );
      }

      // =====================================
      // 3. CREATE WHATSAPP URL
      // =====================================

      const whatsappNumber =
        String(
          config.sellerWhatsApp || ""
        )
          .replace(/\D/g, "");

      if (!whatsappNumber) {
        throw new Error(
          "No. WhatsApp seller belum diset dalam config.js"
        );
      }

      const waUrl =
        `https://wa.me/${whatsappNumber}` +
        `?text=${encodeURIComponent(
          waMessage(order)
        )}`;

      // =====================================
      // 4. SAVE ORDER ID FOR REFERENCE
      // =====================================

      sessionStorage.setItem(
        "lastOrderId",
        order.orderId
      );

      // =====================================
      // 5. CLEAR CART
      // =====================================

      cart.clear();

      renderCart();

      // =====================================
      // 6. REDIRECT DIRECTLY TO WHATSAPP
      //
      // IMPORTANT:
      // Do NOT use window.open()
      // because mobile browsers may
      // block it as a popup.
      // =====================================

      window.location.href = waUrl;

    } catch (err) {

      console.error(
        "Submit error:",
        err
      );

      toast(
        err.message ||
        "Gagal submit order"
      );

    } finally {

      els.submitButton.disabled = false;

      els.submitButton.innerHTML =
        "Submit order <span>→</span>";
    }
  }

  // =========================================================
  // TOAST
  // =========================================================

  function toast(msg) {
    els.toast.textContent = msg;

    els.toast.classList.add(
      "show"
    );

    clearTimeout(
      toast.timer
    );

    toast.timer =
      setTimeout(() => {
        els.toast.classList.remove(
          "show"
        );
      }, 2200);
  }

  // =========================================================
  // EVENTS
  // =========================================================

  function bindEvents() {

    // Search
    els.searchInput.addEventListener(
      "input",
      (e) => {
        renderProducts(
          e.target.value
        );
      }
    );

    // Cart
    els.cartButton.onclick =
      openDrawer;

    $$(
      "[data-close-drawer]"
    ).forEach((element) => {
      element.onclick =
        closeDrawer;
    });

    // Checkout button
    els.goCheckout.onclick =
      () => {
        closeDrawer();

        $("#checkout")
          .scrollIntoView({
            behavior: "smooth"
          });
      };

    // Clear cart
    els.clearCart.onclick =
      () => {
        cart.clear();
        renderCart();

        toast(
          "Cart dikosongkan"
        );
      };

    // Fulfilment
    els.fulfilment.onchange =
      toggleFulfilment;

    // Payment
    els.paymentMethod.onchange =
      togglePayment;

    // Submit
    els.orderForm.addEventListener(
      "submit",
      submitOrder
    );
  }

  // =========================================================
  // START
  // =========================================================

  init();

})();
