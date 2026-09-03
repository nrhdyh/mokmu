(() => {
  const config = window.STORE_CONFIG;
  const quantities = new Map();

  let loadedOrder = null;
  let verifiedPhone = "";
  let callbackCounter = 0;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const els = {
    lookupForm: $("#lookupForm"),
    lookupOrderId: $("#lookupOrderId"),
    lookupPhone: $("#lookupPhone"),
    lookupButton: $("#lookupButton"),
    lookupMessage: $("#lookupMessage"),
    editorSection: $("#editorSection"),
    editOrderId: $("#editOrderId"),
    statusBadge: $("#statusBadge"),
    editCustomer: $("#editCustomer"),
    editDate: $("#editDate"),
    editFulfilment: $("#editFulfilment"),
    editPayment: $("#editPayment"),
    lockedMessage: $("#lockedMessage"),
    editProductGrid: $("#editProductGrid"),
    editSummaryItems: $("#editSummaryItems"),
    editSubtotal: $("#editSubtotal"),
    existingCodFee: $("#existingCodFee"),
    editGrandTotal: $("#editGrandTotal"),
    updateOrderButton: $("#updateOrderButton"),
    toast: $("#toast")
  };

  const money = (amount) =>
    `${config.currency}${Number(amount || 0).toFixed(2)}`;

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function normalizePhone(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (number.startsWith("0")) number = "6" + number;
    if (!number.startsWith("60")) number = "60" + number;

    return number;
  }

  function apiUrl() {
    const url = String(config.appsScriptUrl || "").trim();

    if (!url || url.includes("PASTE_APPS_SCRIPT")) {
      throw new Error("Apps Script URL belum diset dalam config.js");
    }

    return url;
  }

  /**
   * JSONP is used for reading because it is more reliable across
   * GitHub Pages -> Google Apps Script than browser CORS fetch.
   */
  function jsonpGet(params) {
    return new Promise((resolve, reject) => {
      const callbackName =
        `__niagaSimpleCallback_${Date.now()}_${++callbackCounter}`;

      const script = document.createElement("script");

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Request terlalu lama. Cuba lagi."));
      }, 15000);

      function cleanup() {
        clearTimeout(timeout);

        try {
          delete window[callbackName];
        } catch (_) {
          window[callbackName] = undefined;
        }

        script.remove();
      }

      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };

      const url = new URL(apiUrl());

      Object.entries({
        ...params,
        callback: callbackName,
        _: Date.now()
      }).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });

      script.onerror = () => {
        cleanup();
        reject(new Error("Tak dapat connect ke sistem order."));
      };

      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  async function getOrder(orderId, phone) {
    return jsonpGet({
      action: "getOrder",
      orderId,
      phone: normalizePhone(phone)
    });
  }

  function populateQuantities(order) {
    quantities.clear();

    config.products.forEach((product) => {
      quantities.set(product.id, 0);
    });

    (order.items || []).forEach((item) => {
      let product = config.products.find(
        (p) => String(p.id) === String(item.productId)
      );

      // Fallback for old data where Product ID may be missing/different.
      if (!product) {
        product = config.products.find(
          (p) =>
            String(p.name).trim().toLowerCase() ===
              String(item.name).trim().toLowerCase() &&
            String(p.variant || "").trim().toLowerCase() ===
              String(item.variant || "").trim().toLowerCase()
        );
      }

      if (product) {
        quantities.set(product.id, Number(item.qty || 0));
      }
    });
  }

  function getQty(productId) {
    return Number(quantities.get(productId) || 0);
  }

  function currentItems() {
    return config.products
      .map((product) => {
        const qty = getQty(product.id);

        if (qty <= 0) return null;

        return {
          productId: product.id,
          name: product.name,
          variant: product.variant || "",
          unitPrice: Number(product.price),
          qty,
          lineTotal: Number((Number(product.price) * qty).toFixed(2))
        };
      })
      .filter(Boolean);
  }

  function currentSubtotal() {
    return currentItems().reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0
    );
  }

  function renderEditor() {
    if (!loadedOrder) return;

    const editable = Boolean(loadedOrder.editable);

    els.editProductGrid.innerHTML = config.products.map((product) => {
      const qty = getQty(product.id);

      return `
        <article class="product-card edit-product-card ${editable ? "" : "is-locked"}">
          <div class="product-media">
            ${product.badge
              ? `<span class="product-badge">${escapeHtml(product.badge)}</span>`
              : ""}
            <img
              src="${escapeHtml(product.image || "")}"
              alt="${escapeHtml(product.name)}"
              loading="lazy"
            >
          </div>

          <div class="product-body">
            <div>
              <h3>${escapeHtml(product.name)}</h3>
              <p>
                <strong>${escapeHtml(product.variant || "")}</strong>
                ${product.description ? ` · ${escapeHtml(product.description)}` : ""}
              </p>
            </div>

            <div class="product-meta">
              <span class="price">${money(product.price)}</span>

              <div class="product-qty-control">
                <button
                  type="button"
                  class="product-qty-btn"
                  data-edit-minus="${escapeHtml(product.id)}"
                  ${editable ? "" : "disabled"}
                >−</button>

                <span class="product-qty-number">${qty}</span>

                <button
                  type="button"
                  class="product-qty-btn"
                  data-edit-plus="${escapeHtml(product.id)}"
                  ${editable ? "" : "disabled"}
                >+</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    $$("[data-edit-minus]").forEach((button) => {
      button.onclick = () => changeQty(button.dataset.editMinus, -1);
    });

    $$("[data-edit-plus]").forEach((button) => {
      button.onclick = () => changeQty(button.dataset.editPlus, 1);
    });

    renderSummary();
  }

  function changeQty(productId, change) {
    if (!loadedOrder || !loadedOrder.editable) return;

    const next = Math.max(0, getQty(productId) + change);
    quantities.set(productId, next);

    renderEditor();
  }

  function renderSummary() {
    const items = currentItems();

    if (!items.length) {
      els.editSummaryItems.innerHTML =
        `<div class="empty-cart"><p>Tiada item dipilih.</p></div>`;
    } else {
      els.editSummaryItems.innerHTML = items.map((item) => `
        <div class="edit-summary-row">
          <div>
            <strong>
              ${escapeHtml(item.name)}
              ${item.variant ? `(${escapeHtml(item.variant)})` : ""}
            </strong>
            <span>${money(item.unitPrice)} × ${item.qty}</span>
          </div>
          <strong>${money(item.lineTotal)}</strong>
        </div>
      `).join("");
    }

    const subtotal = currentSubtotal();
    const codFee = Number(loadedOrder ? loadedOrder.codFee : 0);

    els.editSubtotal.textContent = money(subtotal);
    els.existingCodFee.textContent = money(codFee);
    els.editGrandTotal.textContent = money(subtotal + codFee);

    if (els.updateOrderButton) {
      els.updateOrderButton.disabled =
        !loadedOrder ||
        !loadedOrder.editable ||
        items.length === 0;
    }
  }

  function showLookupMessage(message, type = "error") {
    els.lookupMessage.textContent = message;
    els.lookupMessage.className = `manage-message ${type}`;
  }

  function hideLookupMessage() {
    els.lookupMessage.classList.add("hidden");
  }

  function displayOrder(order) {
    loadedOrder = order;
    populateQuantities(order);

    els.editorSection.classList.remove("hidden");

    els.editOrderId.textContent = order.orderId;
    els.statusBadge.textContent = order.orderStatus || "NEW";
    els.statusBadge.dataset.status = order.orderStatus || "NEW";
    els.editCustomer.textContent = order.customerName || "-";
    els.editDate.textContent = order.orderDateDisplay || "-";
    els.editFulfilment.textContent =
      order.fulfilment === "COD" && order.location
        ? `${order.fulfilment} - ${order.location}`
        : order.fulfilment || "-";
    els.editPayment.textContent =
      `${order.paymentMethod || "-"} / ${order.paymentStatus || "-"}`;

    if (!order.editable) {
      els.lockedMessage.textContent =
        order.editReason ||
        "Order ini sudah tidak boleh diedit.";
      els.lockedMessage.classList.remove("hidden");
    } else {
      els.lockedMessage.classList.add("hidden");
    }

    renderEditor();

    setTimeout(() => {
      els.editorSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 100);
  }

  async function lookupOrder(event) {
    event.preventDefault();

    hideLookupMessage();
    els.editorSection.classList.add("hidden");

    const orderId =
      String(els.lookupOrderId.value || "").trim().toUpperCase();
    const phone =
      String(els.lookupPhone.value || "").trim();

    if (!orderId || !phone) {
      showLookupMessage("Masukkan Order ID dan nombor WhatsApp.");
      return;
    }

    els.lookupButton.disabled = true;
    els.lookupButton.textContent = "Mencari...";

    try {
      const result = await getOrder(orderId, phone);

      if (!result || !result.ok) {
        throw new Error(
          (result && result.error) ||
          "Order tidak dijumpai."
        );
      }

      verifiedPhone = normalizePhone(phone);
      displayOrder(result.order);

    } catch (error) {
      console.error(error);
      showLookupMessage(error.message || "Tak dapat cari order.");

    } finally {
      els.lookupButton.disabled = false;
      els.lookupButton.textContent = "Cari Order";
    }
  }

  async function sendUpdate(payload) {
    await fetch(apiUrl(), {
      method: "POST",
      mode: "no-cors",
      cache: "no-store",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
  }

  function updateWhatsAppMessage(order, items, subtotal) {
    const lines = [
      `Hi, saya telah UPDATE order ${order.orderId}.`,
      "",
      `Nama: ${order.customerName}`,
      `Status semasa: ${order.orderStatus}`,
      "",
      "ITEM TERBARU:"
    ];

    items.forEach((item) => {
      lines.push(
        `- ${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.qty} = ${money(item.lineTotal)}`
      );
    });

    lines.push(
      "",
      `Subtotal baru: ${money(subtotal)}`
    );

    if (Number(order.codFee || 0) > 0) {
      lines.push(`COD: ${money(order.codFee)}`);
      lines.push(
        `Jumlah baru: ${money(subtotal + Number(order.codFee || 0))}`
      );
    }

    lines.push(
      "",
      "Mohon semak perubahan order saya. Terima kasih."
    );

    return lines.join("\n");
  }

  async function verifyUpdated(expectedUpdateCount, expectedSubtotal) {
    // Apps Script POST is no-cors, so verify by reading the order again.
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 700 + attempt * 500)
      );

      const result = await getOrder(
        loadedOrder.orderId,
        verifiedPhone
      );

      if (
        result &&
        result.ok &&
        result.order &&
        Number(result.order.updateCount || 0) > Number(expectedUpdateCount || 0) &&
        Math.abs(
          Number(result.order.subtotal || 0) -
          Number(expectedSubtotal || 0)
        ) < 0.01
      ) {
        return result.order;
      }
    }

    throw new Error(
      "Update belum dapat disahkan. Sila cuba lagi atau WhatsApp seller."
    );
  }

  async function updateOrder() {
    if (!loadedOrder || !loadedOrder.editable) {
      toast("Order ini tidak boleh diedit.");
      return;
    }

    const items = currentItems();

    if (!items.length) {
      toast("Order mesti mempunyai sekurang-kurangnya 1 item.");
      return;
    }

    const subtotal = Number(currentSubtotal().toFixed(2));

    const payload = {
      action: "updateOrder",
      orderId: loadedOrder.orderId,
      phone: verifiedPhone,
      subtotal,
      items
    };

    const previousUpdateCount =
      Number(loadedOrder.updateCount || 0);

    els.updateOrderButton.disabled = true;
    els.updateOrderButton.textContent = "Updating...";

    try {
      await sendUpdate(payload);

      const latest = await verifyUpdated(
        previousUpdateCount,
        subtotal
      );

      loadedOrder = latest;
      populateQuantities(latest);
      renderEditor();

      toast("Order berjaya dikemas kini");

      const whatsappNumber =
        String(config.sellerWhatsApp || "").replace(/\D/g, "");

      if (whatsappNumber) {
        const message =
          updateWhatsAppMessage(latest, currentItems(), subtotal);

        window.location.href =
          `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      }

    } catch (error) {
      console.error(error);
      toast(error.message || "Gagal update order.");

    } finally {
      els.updateOrderButton.disabled = !loadedOrder.editable;
      els.updateOrderButton.textContent = "Update Order";
    }
  }

  function toast(message) {
    if (!els.toast) return;

    els.toast.textContent = message;
    els.toast.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2600);
  }

  els.lookupForm.addEventListener("submit", lookupOrder);
  els.updateOrderButton.addEventListener("click", updateOrder);
})();
