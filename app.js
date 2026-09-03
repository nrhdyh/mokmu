(() => {

  // =========================================================
  // CONFIG & CART
  // =========================================================

  const config = window.STORE_CONFIG;
  const cart = new Map();

  const $ = (selector) =>
    document.querySelector(selector);

  const $$ = (selector) =>
    [...document.querySelectorAll(selector)];


  // =========================================================
  // ELEMENTS
  // =========================================================

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

  const money = (amount) => {
    return `${config.currency}${Number(amount).toFixed(2)}`;
  };


  const escapeHtml = (value) => {

    return String(value)

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;")

      .replace(/'/g, "&#039;");
  };


  // =========================================================
  // INITIALIZE
  // =========================================================

  function init() {

    if (els.heroTitle) {
      els.heroTitle.textContent =
        config.heroTitle || "";
    }


    if (els.heroText) {
      els.heroText.textContent =
        config.heroText || "";
    }


    if (els.qrAccountName) {
      els.qrAccountName.textContent =
        config.qrAccountName || "";
    }


    // =====================================
    // QR IMAGE
    // =====================================

    if (
      config.qrImage &&
      els.qrImage &&
      els.qrPlaceholder
    ) {

      const qrTest = new Image();


      qrTest.onload = () => {

        els.qrImage.src =
          config.qrImage;

        els.qrImage.classList.remove(
          "hidden"
        );

        els.qrPlaceholder.classList.add(
          "hidden"
        );
      };


      qrTest.onerror = () => {

        console.warn(
          "QR image tidak dijumpai:",
          config.qrImage
        );
      };


      qrTest.src =
        config.qrImage;
    }


    renderProducts();

    renderCart();

    toggleFulfilment();

    togglePayment();

    bindEvents();
  }


  // =========================================================
  // PRODUCT DISPLAY
  // =========================================================

  function renderProducts(query = "") {

    const q =
      String(query)
        .toLowerCase()
        .trim();


    const products =
      config.products.filter(
        (product) => {

          const searchableText = `

            ${product.name || ""}

            ${product.variant || ""}

            ${product.description || ""}

          `
            .toLowerCase();


          return searchableText.includes(q);
        }
      );


    // =====================================
    // NO PRODUCT
    // =====================================

    if (!products.length) {

      els.productGrid.innerHTML = `

        <div class="empty-cart">

          <p>
            Tiada produk dijumpai.
          </p>

        </div>

      `;

      return;
    }


    // =====================================
    // PRODUCT CARDS
    // =====================================

    els.productGrid.innerHTML =
      products

        .map((product) => {

          const cartItem =
            cart.get(product.id);


          const qty =
            cartItem
              ? cartItem.qty
              : 0;


          return `

            <article class="product-card">


              <div class="product-media">


                ${
                  product.badge

                    ? `

                      <span class="product-badge">

                        ${escapeHtml(
                          product.badge
                        )}

                      </span>

                    `

                    : ""
                }


                <img

                  src="${escapeHtml(
                    product.image || ""
                  )}"

                  alt="${escapeHtml(
                    product.name
                  )}"

                  loading="lazy"

                >


              </div>


              <div class="product-body">


                <div>


                  <h3>

                    ${escapeHtml(
                      product.name
                    )}

                  </h3>


                  <p>

                    <strong>

                      ${escapeHtml(
                        product.variant || ""
                      )}

                    </strong>


                    ${
                      product.description

                        ? ` · ${escapeHtml(
                            product.description
                          )}`

                        : ""
                    }


                  </p>


                </div>


                <div class="product-meta">


                  <span class="price">

                    ${money(
                      product.price
                    )}

                  </span>


                  ${
                    qty === 0

                      ? `

                        <button

                          class="add-btn"

                          type="button"

                          data-add="${escapeHtml(
                            product.id
                          )}"

                        >

                          + Add

                        </button>

                      `

                      : `

                        <div class="product-qty-control">


                          <button

                            type="button"

                            class="product-qty-btn"

                            data-product-minus="${escapeHtml(
                              product.id
                            )}"

                          >

                            −

                          </button>


                          <span class="product-qty-number">

                            ${qty}

                          </span>


                          <button

                            type="button"

                            class="product-qty-btn"

                            data-product-plus="${escapeHtml(
                              product.id
                            )}"

                          >

                            +

                          </button>


                        </div>

                      `
                  }


                </div>


              </div>


            </article>

          `;
        })

        .join("");


    // =====================================
    // FIRST ADD BUTTON
    // =====================================

    $$("[data-add]")

      .forEach((button) => {

        button.addEventListener(
          "click",

          () => {

            addToCart(
              button.dataset.add
            );
          }
        );
      });


    // =====================================
    // PRODUCT MINUS
    // =====================================

    $$("[data-product-minus]")

      .forEach((button) => {

        button.addEventListener(
          "click",

          () => {

            updateQty(
              button.dataset.productMinus,
              -1
            );
          }
        );
      });


    // =====================================
    // PRODUCT PLUS
    // =====================================

    $$("[data-product-plus]")

      .forEach((button) => {

        button.addEventListener(
          "click",

          () => {

            updateQty(
              button.dataset.productPlus,
              1
            );
          }
        );
      });
  }


  // =========================================================
  // ADD TO CART
  // =========================================================

  function addToCart(productId) {

    const product =
      config.products.find(
        (product) =>
          product.id === productId
      );


    if (!product) {
      return;
    }


    const existing =
      cart.get(productId);


    cart.set(
      productId,

      {

        product,

        qty:
          existing
            ? existing.qty + 1
            : 1
      }
    );


    // Update cart
    renderCart();


    // Update product quantity button
    renderProducts(
      els.searchInput
        ? els.searchInput.value
        : ""
    );


    toast(
      `${product.name} ditambah`
    );
  }


  // =========================================================
  // UPDATE QUANTITY
  // =========================================================

  function updateQty(productId, change) {

    const row =
      cart.get(productId);


    if (!row) {
      return;
    }


    row.qty += change;


    // =====================================
    // REMOVE IF 0
    // =====================================

    if (row.qty <= 0) {

      cart.delete(
        productId
      );

    } else {

      cart.set(
        productId,
        row
      );
    }


    // Update cart
    renderCart();


    // Update product card
    renderProducts(
      els.searchInput
        ? els.searchInput.value
        : ""
    );
  }


  // =========================================================
  // CART ARRAY
  // =========================================================

  function cartRows() {

    return [
      ...cart.values()
    ];
  }


  // =========================================================
  // SUBTOTAL
  // =========================================================

  function subtotalValue() {

    return cartRows()

      .reduce(

        (total, row) => {

          return (

            total +

            Number(
              row.product.price
            )

            *

            Number(
              row.qty
            )
          );
        },

        0
      );
  }


  // =========================================================
  // CART HTML
  // =========================================================

  function cartMarkup() {

    if (!cart.size) {

      return `

        <div class="empty-cart">

          <span>
            🛒
          </span>

          <p>
            Cart masih kosong.
          </p>

        </div>

      `;
    }


    return cartRows()

      .map(

        ({
          product,
          qty
        }) => {

          return `

            <div class="cart-row">


              <div class="cart-info">


                <strong>

                  ${escapeHtml(
                    product.name
                  )}

                  ${
                    product.variant

                      ? `(${escapeHtml(
                          product.variant
                        )})`

                      : ""
                  }

                </strong>


                <span>

                  ${money(
                    product.price
                  )}

                  ×

                  ${qty}

                </span>


              </div>


              <div class="qty-control">


                <button

                  type="button"

                  data-minus="${escapeHtml(
                    product.id
                  )}"

                >

                  −

                </button>


                <span>

                  ${qty}

                </span>


                <button

                  type="button"

                  data-plus="${escapeHtml(
                    product.id
                  )}"

                >

                  +

                </button>


              </div>


            </div>

          `;
        }
      )

      .join("");
  }


  // =========================================================
  // RENDER CART
  // =========================================================

  function renderCart() {

    const markup =
      cartMarkup();


    if (els.cartItems) {
      els.cartItems.innerHTML =
        markup;
    }


    if (els.drawerItems) {
      els.drawerItems.innerHTML =
        markup;
    }


    // =====================================
    // BIND CART BUTTONS
    // =====================================

    [
      els.cartItems,
      els.drawerItems
    ]

      .filter(Boolean)

      .forEach((container) => {


        container

          .querySelectorAll(
            "[data-minus]"
          )

          .forEach((button) => {

            button.onclick = () => {

              updateQty(

                button.dataset.minus,

                -1
              );
            };
          });


        container

          .querySelectorAll(
            "[data-plus]"
          )

          .forEach((button) => {

            button.onclick = () => {

              updateQty(

                button.dataset.plus,

                1
              );
            };
          });
      });


    // =====================================
    // TOTAL QUANTITY
    // =====================================

    const totalQty =
      cartRows()

        .reduce(

          (total, row) =>
            total +
            Number(row.qty),

          0
        );


    const total =
      subtotalValue();


    if (els.cartCount) {
      els.cartCount.textContent =
        totalQty;
    }


    if (els.subtotal) {
      els.subtotal.textContent =
        money(total);
    }


    if (els.grandTotal) {
      els.grandTotal.textContent =
        money(total);
    }


    if (els.drawerTotal) {
      els.drawerTotal.textContent =
        money(total);
    }
  }


  // =========================================================
  // CART DRAWER
  // =========================================================

  function openDrawer() {

    if (!els.cartDrawer) {
      return;
    }


    els.cartDrawer.classList.add(
      "open"
    );


    els.cartDrawer.setAttribute(
      "aria-hidden",
      "false"
    );


    document.body.style.overflow =
      "hidden";
  }


  function closeDrawer() {

    if (!els.cartDrawer) {
      return;
    }


    els.cartDrawer.classList.remove(
      "open"
    );


    els.cartDrawer.setAttribute(
      "aria-hidden",
      "true"
    );


    document.body.style.overflow =
      "";
  }


  // =========================================================
  // PICKUP / COD
  // =========================================================

  function toggleFulfilment() {

    if (
      !els.fulfilment ||
      !els.locationField ||
      !els.location
    ) {
      return;
    }


    const isCOD =
      els.fulfilment.value ===
      "COD";


    els.locationField.classList.toggle(
      "hidden",
      !isCOD
    );


    els.location.required =
      isCOD;
  }


  // =========================================================
  // PAYMENT
  // =========================================================

  function togglePayment() {

    if (
      !els.paymentMethod ||
      !els.qrPanel
    ) {
      return;
    }


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

  function createOrderId() {

    const date =
      new Date();


    const year =
      String(
        date.getFullYear()
      ).slice(-2);


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );


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

    let number =
      String(phone)

        .replace(
          /\D/g,
          ""
        );


    // Example:
    // 0123456789
    // =>
    // 60123456789

    if (
      number.startsWith("0")
    ) {

      number =
        "6" + number;
    }


    if (
      !number.startsWith("60")
    ) {

      number =
        "60" + number;
    }


    return number;
  }


  function validPhone(phone) {

    const digits =
      String(phone)

        .replace(
          /\D/g,
          ""
        );


    return (

      digits.length >= 9

      &&

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


    // =====================================
    // ITEMS
    // =====================================

    order.items

      .forEach((item) => {

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


    // =====================================
    // TOTAL
    // =====================================

    lines.push(
      "",
      `Total produk: ${money(
        order.subtotal
      )}`
    );


    // =====================================
    // COD
    // =====================================

    if (
      order.fulfilment ===
      "COD"
    ) {

      lines.push(
        "Caj COD: akan disahkan seller"
      );
    }


    // =====================================
    // NOTE
    // =====================================

    if (order.note) {

      lines.push(
        `Nota: ${order.note}`
      );
    }


    lines.push("");


    // =====================================
    // PAYMENT MESSAGE
    // =====================================

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

        (
          line,
          index,
          array
        ) => {

          return !(
            line === ""

            &&

            array[
              index - 1
            ] === ""
          );
        }
      )

      .join("\n");
  }


  // =========================================================
  // SEND TO GOOGLE SHEET
  // =========================================================

  async function sendToSheet(order) {

    const url =
      String(
        config.appsScriptUrl ||
        ""
      )

        .trim();


    if (
      !url

      ||

      url.includes(
        "PASTE_APPS_SCRIPT"
      )
    ) {

      throw new Error(
        "Apps Script URL belum diset dalam config.js"
      );
    }


    if (
      !url.endsWith("/exec")
    ) {

      console.warn(
        "Apps Script URL sepatutnya berakhir dengan /exec"
      );
    }


    await fetch(

      url,

      {

        method:
          "POST",


        // GitHub Pages
        // ->
        // Apps Script
        mode:
          "no-cors",


        cache:
          "no-store",


        headers: {

          "Content-Type":
            "text/plain;charset=utf-8"
        },


        body:
          JSON.stringify(
            order
          )
      }
    );
  }


  // =========================================================
  // SUBMIT ORDER
  // =========================================================

  async function submitOrder(event) {

    event.preventDefault();


    // =====================================
    // EMPTY CART
    // =====================================

    if (!cart.size) {

      toast(
        "Cart masih kosong"
      );

      return;
    }


    const formData =
      new FormData(
        els.orderForm
      );


    // =====================================
    // HONEYPOT
    // =====================================

    if (
      formData.get(
        "website"
      )
    ) {

      return;
    }


    // =====================================
    // FORM VALUES
    // =====================================

    const customerName =
      String(
        formData.get(
          "customerName"
        ) || ""
      ).trim();


    const phone =
      String(
        formData.get(
          "phone"
        ) || ""
      ).trim();


    const fulfilment =
      String(
        formData.get(
          "fulfilment"
        ) || ""
      );


    const location =
      String(
        formData.get(
          "location"
        ) || ""
      ).trim();


    const paymentMethod =
      String(
        formData.get(
          "paymentMethod"
        ) || ""
      );


    const note =
      String(
        formData.get(
          "note"
        ) || ""
      ).trim();


    // =====================================
    // VALIDATE NAME
    // =====================================

    if (!customerName) {

      toast(
        "Sila masukkan nama"
      );

      return;
    }


    // =====================================
    // VALIDATE PHONE
    // =====================================

    if (
      !validPhone(
        phone
      )
    ) {

      toast(
        "No. WhatsApp tidak sah"
      );

      return;
    }


    // =====================================
    // VALIDATE COD
    // =====================================

    if (
      fulfilment ===
      "COD"

      &&

      !location
    ) {

      toast(
        "Sila isi lokasi COD"
      );

      return;
    }


    // =====================================================
    // CREATE ORDER OBJECT
    // =====================================================

    const order = {

      orderId:
        createOrderId(),


      createdAtClient:
        new Date()
          .toISOString(),


      storeName:
        config.storeName,


      customerName:


        customerName,


      phone:
        normalizePhone(
          phone
        ),


      fulfilment:


        fulfilment,


      location:


        location,


      paymentMethod:


        paymentMethod,


      note:


        note,


      // =====================================
      // COD currently manual
      // Apps Script expects this value
      // =====================================

      codFee:
        0,


      subtotal:
        Number(
          subtotalValue()
            .toFixed(2)
        ),


      status:
        "NEW",


      paymentStatus:

        paymentMethod ===
        "DuitNow QR"

          ? "PENDING VERIFY"

          : "CASH",


      // =====================================
      // ITEMS
      // =====================================

      items:

        cartRows()

          .map(
            ({
              product,
              qty
            }) => {

              return {

                productId:
                  product.id,


                name:
                  product.name,


                variant:
                  product.variant ||
                  "",


                unitPrice:
                  Number(
                    product.price
                  ),


                qty:
                  Number(
                    qty
                  ),


                lineTotal:
                  Number(

                    (
                      Number(
                        product.price
                      )

                      *

                      Number(
                        qty
                      )
                    )

                      .toFixed(2)
                  )
              };
            }
          )
    };


    // =====================================================
    // SUBMIT BUTTON
    // =====================================================

    els.submitButton.disabled =
      true;


    els.submitButton.innerHTML =
      "Submitting... <span>→</span>";


    try {


      // ===================================================
      // 1. SEND TO GOOGLE SHEET
      // ===================================================

      await sendToSheet(
        order
      );


      // ===================================================
      // 2. SAVE BACKUP
      // ===================================================

      try {

        localStorage.setItem(

          `order_${order.orderId}`,

          JSON.stringify(
            order
          )
        );

      } catch (
        storageError
      ) {

        console.warn(
          "Local storage error:",
          storageError
        );
      }


      // ===================================================
      // 3. WHATSAPP NUMBER
      // ===================================================

      const whatsappNumber =

        String(
          config.sellerWhatsApp ||
          ""
        )

          .replace(
            /\D/g,
            ""
          );


      if (
        !whatsappNumber
      ) {

        throw new Error(
          "No. WhatsApp seller belum diset dalam config.js"
        );
      }


      // ===================================================
      // 4. WHATSAPP URL
      // ===================================================

      const whatsappUrl =

        `https://wa.me/${whatsappNumber}`

        +

        `?text=${encodeURIComponent(
          waMessage(
            order
          )
        )}`;


      // ===================================================
      // 5. SAVE LAST ORDER
      // ===================================================

      try {

        sessionStorage.setItem(

          "lastOrderId",

          order.orderId
        );

      } catch (
        storageError
      ) {

        console.warn(
          storageError
        );
      }


      // ===================================================
      // 6. CLEAR CART
      // ===================================================

      cart.clear();


      renderCart();


      renderProducts(
        els.searchInput
          ? els.searchInput.value
          : ""
      );


      // ===================================================
      // 7. REDIRECT TO WHATSAPP
      //
      // IMPORTANT:
      // Same tab redirect is more reliable
      // on mobile than window.open().
      // ===================================================

      window.location.href =
        whatsappUrl;


    } catch (error) {


      console.error(
        "Submit error:",
        error
      );


      toast(

        error.message

        ||

        "Gagal submit order"
      );


    } finally {


      els.submitButton.disabled =
        false;


      els.submitButton.innerHTML =
        "Submit order <span>→</span>";
    }
  }


  // =========================================================
  // TOAST
  // =========================================================

  function toast(message) {

    if (!els.toast) {
      return;
    }


    els.toast.textContent =
      message;


    els.toast.classList.add(
      "show"
    );


    clearTimeout(
      toast.timer
    );


    toast.timer =
      setTimeout(

        () => {

          els.toast.classList.remove(
            "show"
          );

        },

        2200
      );
  }


  // =========================================================
  // EVENTS
  // =========================================================

  function bindEvents() {


    // =====================================
    // SEARCH
    // =====================================

    if (els.searchInput) {

      els.searchInput.addEventListener(

        "input",

        (event) => {

          renderProducts(
            event.target.value
          );
        }
      );
    }


    // =====================================
    // OPEN CART
    // =====================================

    if (els.cartButton) {

      els.cartButton.onclick =
        openDrawer;
    }


    // =====================================
    // CLOSE CART
    // =====================================

    $$(
      "[data-close-drawer]"
    )

      .forEach(
        (button) => {

          button.onclick =
            closeDrawer;
        }
      );


    // =====================================
    // GO CHECKOUT
    // =====================================

    if (els.goCheckout) {

      els.goCheckout.onclick =
        () => {

          closeDrawer();


          const checkout =
            $("#checkout");


          if (checkout) {

            checkout.scrollIntoView({

              behavior:
                "smooth"
            });
          }
        };
    }


    // =====================================
    // CLEAR CART
    // =====================================

    if (els.clearCart) {

      els.clearCart.onclick =
        () => {

          cart.clear();


          renderCart();


          renderProducts(
            els.searchInput
              ? els.searchInput.value
              : ""
          );


          toast(
            "Cart dikosongkan"
          );
        };
    }


    // =====================================
    // FULFILMENT
    // =====================================

    if (els.fulfilment) {

      els.fulfilment.onchange =
        toggleFulfilment;
    }


    // =====================================
    // PAYMENT
    // =====================================

    if (els.paymentMethod) {

      els.paymentMethod.onchange =
        togglePayment;
    }


    // =====================================
    // SUBMIT
    // =====================================

    if (els.orderForm) {

      els.orderForm.addEventListener(

        "submit",

        submitOrder
      );
    }
  }


  // =========================================================
  // START APP
  // =========================================================

  init();

})();
