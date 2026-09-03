/**
 * NiagaSimple Google Sheet Backend V3
 *
 * Added:
 * - Supplier tab / supplier ledger
 * - Default profit = RM2 per ordered item/pack
 * - Supplier payable = Product Subtotal - My Profit
 * - COD fee is NOT included in supplier payable
 * - Payout status: UNPAID / PARTIAL / PAID
 * - Amount Paid + Balance
 * - Supplier summary
 *
 * Assumption:
 * "RM2 setiap barang" = RM2 per quantity/pack sold.
 */

const SHEETS = {
  ORDERS: 'Orders',
  ITEMS: 'Order Items',
  RECEIPT: 'Receipt',
  LISTS: 'Lists',
  SETTINGS: 'Settings',
  SUPPLIER: 'Supplier'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('NiagaSimple')
    .addItem('Setup / Repair Sheets', 'setupNiagaSimple')
    .addItem('Refresh Receipt', 'refreshReceipt')
    .addItem('Rebuild Supplier Ledger', 'rebuildSupplierLedger')
    .addItem('Create Receipt PDF', 'createReceiptPdf')
    .addToUi();
}

function setupNiagaSimple() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  setupLists_(ss);
  setupSettings_(ss);
  setupOrders_(ss);
  setupItems_(ss);
  setupSupplier_(ss);
  setupReceipt_(ss);

  SpreadsheetApp.flush();
}

function setupLists_(ss) {
  let sh = ss.getSheetByName(SHEETS.LISTS);
  if (!sh) sh = ss.insertSheet(SHEETS.LISTS);

  sh.clear();
  sh.getRange('A1:C1').setValues([['Order Status', 'Payment Status', 'Payout Status']]);
  sh.getRange('A2:A7').setValues([
    ['NEW'], ['CONFIRMED'], ['PREPARING'],
    ['READY'], ['COMPLETED'], ['CANCELLED']
  ]);
  sh.getRange('B2:B5').setValues([
    ['PENDING VERIFY'], ['PAID'], ['CASH'], ['REFUNDED']
  ]);
  sh.getRange('C2:C4').setValues([
    ['UNPAID'], ['PARTIAL'], ['PAID']
  ]);

  styleHeader_(sh.getRange('A1:C1'));
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 3);
}

function setupSettings_(ss) {
  let sh = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sh) sh = ss.insertSheet(SHEETS.SETTINGS);

  const existingProfit = sh.getRange('B3').getValue();

  sh.clear();
  sh.getRange('A1:B1').setValues([['SETTING', 'VALUE']]);
  sh.getRange('A2:B5').setValues([
    ['Supplier Name', 'Supplier 1'],
    ['Profit per item / pack', existingProfit || 2],
    ['Currency', 'RM'],
    ['Formula', 'Supplier Payable = Product Subtotal - (Total Qty × Profit per item)']
  ]);

  styleHeader_(sh.getRange('A1:B1'));
  sh.getRange('B3').setNumberFormat('"RM"0.00');
  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(2, 420);
  sh.setFrozenRows(1);
}

function getProfitPerItem_(ss) {
  const sh = ss.getSheetByName(SHEETS.SETTINGS);
  const val = Number(sh ? sh.getRange('B3').getValue() : 2);
  return isFinite(val) ? val : 2;
}

function setupOrders_(ss) {
  let sh = ss.getSheetByName(SHEETS.ORDERS);
  if (!sh) sh = ss.insertSheet(SHEETS.ORDERS);

  const headers = [
    'Order ID', 'Order Date', 'Customer Name', 'Phone',
    'Fulfilment', 'Location', 'Payment Method', 'Payment Status',
    'Order Status', 'Subtotal', 'COD Fee', 'Grand Total', 'Note'
  ];

  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sh.getRange(1, 1, 1, headers.length));
  sh.setFrozenRows(1);

  sh.getRange('B2:B').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange('J2:L').setNumberFormat('"RM"0.00');

  const lists = ss.getSheetByName(SHEETS.LISTS);

  const paymentRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange('B2:B5'), true)
    .setAllowInvalid(false)
    .build();

  const orderRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange('A2:A7'), true)
    .setAllowInvalid(false)
    .build();

  sh.getRange('H2:H1000').setDataValidation(paymentRule);
  sh.getRange('I2:I1000').setDataValidation(orderRule);

  const rules = [];
  const statusRange = sh.getRange('I2:I1000');
  const paymentRange = sh.getRange('H2:H1000');

  rules.push(
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('NEW').setBackground('#FFF4CC').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('CONFIRMED').setBackground('#DDEBFF').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('PREPARING').setBackground('#F2E2FF').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('READY').setBackground('#DFF7E8').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('COMPLETED').setBackground('#D9F2E6').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('CANCELLED').setBackground('#FFE0E0').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('PAID').setBackground('#DFF7E8').setRanges([paymentRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('PENDING VERIFY').setBackground('#FFF4CC').setRanges([paymentRange]).build()
  );

  sh.setConditionalFormatRules(rules);

  const widths = [155,145,180,130,105,180,145,145,130,100,90,110,220];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
}

function setupItems_(ss) {
  let sh = ss.getSheetByName(SHEETS.ITEMS);
  if (!sh) sh = ss.insertSheet(SHEETS.ITEMS);

  const headers = [
    'Order ID', 'Product ID', 'Product', 'Variant',
    'Unit Price', 'Qty', 'Line Total', 'Order Date'
  ];

  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sh.getRange(1, 1, 1, headers.length));

  sh.setFrozenRows(1);
  sh.getRange('E2:G').setNumberFormat('"RM"0.00');
  sh.getRange('H2:H').setNumberFormat('yyyy-mm-dd hh:mm');
}

function setupSupplier_(ss) {
  let sh = ss.getSheetByName(SHEETS.SUPPLIER);
  if (!sh) sh = ss.insertSheet(SHEETS.SUPPLIER);

  const headers = [
    'Order ID', 'Order Date', 'Customer', 'Total Qty',
    'Product Subtotal', 'Profit / Item', 'My Profit',
    'Supplier Payable', 'Payout Status', 'Amount Paid',
    'Balance', 'Paid Date'
  ];

  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sh.getRange(1, 1, 1, headers.length));
  sh.setFrozenRows(1);

  sh.getRange('B2:B1000').setNumberFormat('yyyy-mm-dd');
  sh.getRange('E2:H1000').setNumberFormat('"RM"0.00');
  sh.getRange('J2:K1000').setNumberFormat('"RM"0.00');
  sh.getRange('L2:L1000').setNumberFormat('yyyy-mm-dd');

  const lists = ss.getSheetByName(SHEETS.LISTS);
  const payoutRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange('C2:C4'), true)
    .setAllowInvalid(false)
    .build();

  sh.getRange('I2:I1000').setDataValidation(payoutRule);

  // Summary on right
  sh.getRange('N1:O1').merge();
  sh.getRange('N1').setValue('SUPPLIER SUMMARY');
  sh.getRange('N1:O1')
    .setBackground('#151515')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sh.getRange('N2:N6').setValues([
    ['Total Units'],
    ['Product Sales'],
    ['My Profit'],
    ['Total Supplier Payable'],
    ['Outstanding Supplier']
  ]);

  sh.getRange('O2').setFormula('=SUM(D2:D1000)');
  sh.getRange('O3').setFormula('=SUM(E2:E1000)');
  sh.getRange('O4').setFormula('=SUM(G2:G1000)');
  sh.getRange('O5').setFormula('=SUM(H2:H1000)');
  sh.getRange('O6').setFormula('=SUM(K2:K1000)');
  sh.getRange('O3:O6').setNumberFormat('"RM"0.00');
  sh.getRange('N2:N6').setBackground('#F1F1ED').setFontWeight('bold');
  sh.getRange('O6').setBackground('#FFF4CC').setFontWeight('bold');

  const rules = [];
  const payoutRange = sh.getRange('I2:I1000');
  const balanceRange = sh.getRange('K2:K1000');

  rules.push(
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('UNPAID').setBackground('#FFF4CC').setRanges([payoutRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('PARTIAL').setBackground('#DDEBFF').setRanges([payoutRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('PAID').setBackground('#DFF7E8').setRanges([payoutRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#FFF4CC').setRanges([balanceRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberEqualTo(0).setBackground('#DFF7E8').setRanges([balanceRange]).build()
  );

  sh.setConditionalFormatRules(rules);

  const widths = [155,110,160,90,130,110,110,145,120,120,110,110];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.setColumnWidth(14, 190);
  sh.setColumnWidth(15, 130);
}

function setupReceipt_(ss) {
  let sh = ss.getSheetByName(SHEETS.RECEIPT);
  if (!sh) sh = ss.insertSheet(SHEETS.RECEIPT);

  sh.clear();
  sh.clearConditionalFormatRules();

  sh.getRange('A1:F1').merge();
  sh.getRange('A1').setValue('NIAGASIMPLE — RECEIPT');
  sh.getRange('A1:F1')
    .setBackground('#151515')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(16)
    .setHorizontalAlignment('center');

  sh.getRange('A3').setValue('Order ID');
  sh.getRange('D3').setValue('Customer');
  sh.getRange('A4').setValue('Date');
  sh.getRange('D4').setValue('Phone');
  sh.getRange('A5').setValue('Fulfilment');
  sh.getRange('D5').setValue('Payment');

  sh.getRange('E3:F3').merge();
  sh.getRange('E4:F4').merge();
  sh.getRange('E5:F5').merge();

  const orders = ss.getSheetByName(SHEETS.ORDERS);
  const orderIdRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(orders.getRange('A2:A1000'), true)
    .setAllowInvalid(true)
    .build();

  sh.getRange('B3:C3').merge();
  sh.getRange('B3').setDataValidation(orderIdRule);
  sh.getRange('B3').setBackground('#FFFBEA');

  sh.getRange('A7:F7').setValues([['Item', 'Variant', 'Unit Price', 'Qty', 'Line Total', '']]);
  styleHeader_(sh.getRange('A7:F7'));

  sh.getRange('A20:D20').merge().setValue('Subtotal');
  sh.getRange('A21:D21').merge().setValue('COD Fee');
  sh.getRange('A22:D22').merge().setValue('TOTAL');

  sh.getRange('E20:F20').merge();
  sh.getRange('E21:F21').merge();
  sh.getRange('E22:F22').merge();

  sh.getRange('A22:F22')
    .setBackground('#E8F4EF')
    .setFontWeight('bold')
    .setFontSize(13);

  sh.getRange('A24:F24').merge();
  sh.getRange('A24').setValue('Terima kasih atas pesanan anda.')
    .setHorizontalAlignment('center')
    .setFontColor('#666666');

  [175,110,100,70,110,30].forEach((w, i) => sh.setColumnWidth(i + 1, w));
}

function doGet() {
  return json_({
    ok: true,
    service: 'NiagaSimple Order API V3'
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = parsePayload_(e);

    if (!payload || !payload.orderId || !payload.customerName || !payload.phone) {
      return json_({ ok: false, error: 'Invalid payload' });
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return json_({ ok: false, error: 'No items' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (
      !ss.getSheetByName(SHEETS.ORDERS) ||
      !ss.getSheetByName(SHEETS.ITEMS) ||
      !ss.getSheetByName(SHEETS.SUPPLIER)
    ) {
      setupNiagaSimple();
    }

    const orders = ss.getSheetByName(SHEETS.ORDERS);
    const items = ss.getSheetByName(SHEETS.ITEMS);

    if (isDuplicateOrder_(orders, payload.orderId)) {
      return json_({
        ok: true,
        duplicate: true,
        orderId: payload.orderId
      });
    }

    const orderDate = new Date();
    const subtotal = Number(payload.subtotal || 0);
    const codFee = Number(payload.codFee || 0);
    const grandTotal = subtotal + codFee;

    const paymentStatus =
      payload.paymentStatus ||
      (payload.paymentMethod === 'DuitNow QR' ? 'PENDING VERIFY' : 'CASH');

    const orderStatus = payload.status || 'NEW';

    // Orders
    const row = orders.getLastRow() + 1;
    orders.getRange(row, 1, 1, 13).setValues([[
      safe_(payload.orderId),
      orderDate,
      safe_(payload.customerName),
      safe_(payload.phone),
      safe_(payload.fulfilment),
      safe_(payload.location),
      safe_(payload.paymentMethod),
      safe_(paymentStatus),
      safe_(orderStatus),
      subtotal,
      codFee,
      grandTotal,
      safe_(payload.note)
    ]]);

    orders.getRange(row, 2).setNumberFormat('yyyy-mm-dd hh:mm');
    orders.getRange(row, 10, 1, 3).setNumberFormat('"RM"0.00');
    applyOrderValidationToRow_(ss, orders, row);

    // Order Items
    const itemRows = payload.items.map(item => [
      safe_(payload.orderId),
      safe_(item.productId),
      safe_(item.name),
      safe_(item.variant),
      Number(item.unitPrice || 0),
      Number(item.qty || 0),
      Number(item.lineTotal || (Number(item.unitPrice || 0) * Number(item.qty || 0))),
      orderDate
    ]);

    if (itemRows.length) {
      const start = items.getLastRow() + 1;
      items.getRange(start, 1, itemRows.length, 8).setValues(itemRows);
      items.getRange(start, 5, itemRows.length, 3).setNumberFormat('"RM"0.00');
      items.getRange(start, 8, itemRows.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');
    }

    // Supplier ledger
    appendSupplierLedger_(ss, {
      orderId: payload.orderId,
      orderDate: orderDate,
      customerName: payload.customerName,
      subtotal: subtotal,
      items: payload.items
    });

    return json_({
      ok: true,
      orderId: payload.orderId,
      subtotal: subtotal,
      codFee: codFee,
      grandTotal: grandTotal
    });

  } catch (err) {
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err)
    });
  } finally {
    lock.releaseLock();
  }
}

function appendSupplierLedger_(ss, order) {
  const sh = ss.getSheetByName(SHEETS.SUPPLIER);
  const profitPerItem = getProfitPerItem_(ss);

  const totalQty = (order.items || []).reduce((sum, item) => {
    return sum + Number(item.qty || 0);
  }, 0);

  const myProfit = totalQty * profitPerItem;
  const supplierPayable = Math.max(0, Number(order.subtotal || 0) - myProfit);

  const row = sh.getLastRow() + 1;

  sh.getRange(row, 1, 1, 12).setValues([[
    safe_(order.orderId),
    order.orderDate,
    safe_(order.customerName),
    totalQty,
    Number(order.subtotal || 0),
    profitPerItem,
    myProfit,
    supplierPayable,
    'UNPAID',
    0,
    supplierPayable,
    ''
  ]]);

  sh.getRange(row, 2).setNumberFormat('yyyy-mm-dd');
  sh.getRange(row, 5, 1, 4).setNumberFormat('"RM"0.00');
  sh.getRange(row, 10, 1, 2).setNumberFormat('"RM"0.00');
  applySupplierValidationToRow_(ss, sh, row);
}

function rebuildSupplierLedger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const orders = ss.getSheetByName(SHEETS.ORDERS);
  const items = ss.getSheetByName(SHEETS.ITEMS);
  const supplier = ss.getSheetByName(SHEETS.SUPPLIER);

  if (!orders || !items || !supplier) {
    SpreadsheetApp.getUi().alert('Run Setup / Repair Sheets dahulu.');
    return;
  }

  // Keep payout information already entered, by Order ID
  const existingPayouts = {};
  if (supplier.getLastRow() >= 2) {
    const old = supplier.getRange(2, 1, supplier.getLastRow() - 1, 12).getValues();
    old.forEach(r => {
      if (r[0]) {
        existingPayouts[String(r[0]).trim()] = {
          status: r[8] || 'UNPAID',
          amountPaid: Number(r[9] || 0),
          paidDate: r[11] || ''
        };
      }
    });
  }

  if (supplier.getLastRow() > 1) {
    supplier.getRange(2, 1, supplier.getLastRow() - 1, 12).clearContent();
  }

  const orderRows = orders.getDataRange().getValues().slice(1);
  const itemRows = items.getDataRange().getValues().slice(1);
  const profitPerItem = getProfitPerItem_(ss);

  const itemQtyByOrder = {};
  itemRows.forEach(r => {
    const id = String(r[0] || '').trim();
    if (!id) return;
    itemQtyByOrder[id] = (itemQtyByOrder[id] || 0) + Number(r[5] || 0);
  });

  const output = [];

  orderRows.forEach(r => {
    const id = String(r[0] || '').trim();
    if (!id) return;

    const totalQty = itemQtyByOrder[id] || 0;
    const subtotal = Number(r[9] || 0);
    const myProfit = totalQty * profitPerItem;
    const supplierPayable = Math.max(0, subtotal - myProfit);

    const old = existingPayouts[id] || {
      status: 'UNPAID',
      amountPaid: 0,
      paidDate: ''
    };

    const amountPaid = Number(old.amountPaid || 0);
    const balance = Math.max(0, supplierPayable - amountPaid);

    let status = old.status || 'UNPAID';
    if (balance <= 0 && supplierPayable > 0) status = 'PAID';
    else if (amountPaid > 0 && balance > 0) status = 'PARTIAL';
    else status = 'UNPAID';

    output.push([
      id,
      r[1],
      r[2],
      totalQty,
      subtotal,
      profitPerItem,
      myProfit,
      supplierPayable,
      status,
      amountPaid,
      balance,
      old.paidDate
    ]);
  });

  if (output.length) {
    supplier.getRange(2, 1, output.length, 12).setValues(output);
    supplier.getRange(2, 2, output.length, 1).setNumberFormat('yyyy-mm-dd');
    supplier.getRange(2, 5, output.length, 4).setNumberFormat('"RM"0.00');
    supplier.getRange(2, 10, output.length, 2).setNumberFormat('"RM"0.00');

    for (let i = 0; i < output.length; i++) {
      applySupplierValidationToRow_(ss, supplier, i + 2);
    }
  }

  SpreadsheetApp.getUi().alert('Supplier ledger siap dikira semula.');
}

function onEdit(e) {
  if (!e || !e.range) return;

  const sh = e.range.getSheet();
  const sheetName = sh.getName();

  if (sheetName === SHEETS.RECEIPT && e.range.getA1Notation() === 'B3') {
    refreshReceipt();
    return;
  }

  // Supplier payout logic
  if (sheetName === SHEETS.SUPPLIER && e.range.getRow() >= 2) {
    const row = e.range.getRow();
    const col = e.range.getColumn();

    // Amount Paid changed
    if (col === 10) {
      const payable = Number(sh.getRange(row, 8).getValue() || 0);
      const paid = Number(sh.getRange(row, 10).getValue() || 0);
      const balance = Math.max(0, payable - paid);

      sh.getRange(row, 11).setValue(balance).setNumberFormat('"RM"0.00');

      if (payable > 0 && balance <= 0) {
        sh.getRange(row, 9).setValue('PAID');
        if (!sh.getRange(row, 12).getValue()) {
          sh.getRange(row, 12).setValue(new Date()).setNumberFormat('yyyy-mm-dd');
        }
      } else if (paid > 0) {
        sh.getRange(row, 9).setValue('PARTIAL');
        sh.getRange(row, 12).clearContent();
      } else {
        sh.getRange(row, 9).setValue('UNPAID');
        sh.getRange(row, 12).clearContent();
      }
    }

    // Status manually changed to PAID
    if (col === 9) {
      const status = String(sh.getRange(row, 9).getValue() || '');
      const payable = Number(sh.getRange(row, 8).getValue() || 0);

      if (status === 'PAID') {
        sh.getRange(row, 10).setValue(payable).setNumberFormat('"RM"0.00');
        sh.getRange(row, 11).setValue(0).setNumberFormat('"RM"0.00');
        if (!sh.getRange(row, 12).getValue()) {
          sh.getRange(row, 12).setValue(new Date()).setNumberFormat('yyyy-mm-dd');
        }
      }
    }
  }
}

function refreshReceipt() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const receipt = ss.getSheetByName(SHEETS.RECEIPT);
  const orders = ss.getSheetByName(SHEETS.ORDERS);
  const items = ss.getSheetByName(SHEETS.ITEMS);

  if (!receipt || !orders || !items) return;

  const orderId = String(receipt.getRange('B3').getValue() || '').trim();

  receipt.getRange('B4:C5').clearContent();
  receipt.getRange('E3:F5').clearContent();
  receipt.getRange('A8:F19').clearContent();
  receipt.getRange('E20:F22').clearContent();

  if (!orderId) return;

  const orderData = orders.getDataRange().getValues();
  const idx = orderData.findIndex((r, i) => i > 0 && String(r[0]).trim() === orderId);

  if (idx === -1) return;

  const o = orderData[idx];

  receipt.getRange('B4:C4').merge().setValue(o[1]).setNumberFormat('yyyy-mm-dd hh:mm');
  receipt.getRange('E3:F3').setValue(o[2]);
  receipt.getRange('E4:F4').setValue(o[3]);
  receipt.getRange('B5:C5').merge().setValue(
    o[4] === 'COD' && o[5] ? `${o[4]} - ${o[5]}` : o[4]
  );
  receipt.getRange('E5:F5').setValue(`${o[6]} / ${o[7]}`);

  const itemData = items.getDataRange().getValues()
    .filter((r, i) => i > 0 && String(r[0]).trim() === orderId);

  const rows = itemData.slice(0, 12).map(r => [
    r[2], r[3], Number(r[4] || 0),
    Number(r[5] || 0), Number(r[6] || 0), ''
  ]);

  if (rows.length) {
    receipt.getRange(8, 1, rows.length, 6).setValues(rows);
    receipt.getRange(8, 3, rows.length, 1).setNumberFormat('"RM"0.00');
    receipt.getRange(8, 5, rows.length, 1).setNumberFormat('"RM"0.00');
  }

  receipt.getRange('E20').setValue(Number(o[9] || 0)).setNumberFormat('"RM"0.00');
  receipt.getRange('E21').setValue(Number(o[10] || 0)).setNumberFormat('"RM"0.00');
  receipt.getRange('E22').setValue(Number(o[11] || 0)).setNumberFormat('"RM"0.00');
}

function createReceiptPdf() {
  refreshReceipt();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const receipt = ss.getSheetByName(SHEETS.RECEIPT);
  const orderId = String(receipt.getRange('B3').getValue() || '').trim();

  if (!orderId) {
    SpreadsheetApp.getUi().alert('Pilih Order ID di Receipt!B3 dahulu.');
    return;
  }

  const url = ss.getUrl().replace(/edit.*$/, '') +
    'export?format=pdf' +
    '&gid=' + receipt.getSheetId() +
    '&size=A5' +
    '&portrait=true' +
    '&fitw=true' +
    '&sheetnames=false' +
    '&printtitle=false' +
    '&pagenumbers=false' +
    '&gridlines=false' +
    '&fzr=false' +
    '&range=A1:F24';

  const token = ScriptApp.getOAuthToken();

  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });

  const filename = `Receipt_${orderId}.pdf`;
  const file = DriveApp.createFile(response.getBlob().setName(filename));

  SpreadsheetApp.getUi().alert('Receipt PDF siap:\n' + file.getUrl());
}

function applyOrderValidationToRow_(ss, sh, row) {
  const lists = ss.getSheetByName(SHEETS.LISTS);

  const paymentRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange('B2:B5'), true)
    .setAllowInvalid(false)
    .build();

  const orderRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange('A2:A7'), true)
    .setAllowInvalid(false)
    .build();

  sh.getRange(row, 8).setDataValidation(paymentRule);
  sh.getRange(row, 9).setDataValidation(orderRule);
}

function applySupplierValidationToRow_(ss, sh, row) {
  const lists = ss.getSheetByName(SHEETS.LISTS);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange('C2:C4'), true)
    .setAllowInvalid(false)
    .build();

  sh.getRange(row, 9).setDataValidation(rule);
}

function isDuplicateOrder_(sh, orderId) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return false;

  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  return values.some(v => String(v).trim() === String(orderId).trim());
}

function parsePayload_(e) {
  if (!e) return null;

  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (_) {}
  }

  if (e.parameter && e.parameter.payload) {
    try {
      return JSON.parse(e.parameter.payload);
    } catch (_) {}
  }

  return null;
}

function safe_(value) {
  const str = String(value == null ? '' : value).trim();
  if (/^[=+\-@]/.test(str)) return "'" + str;
  return str;
}

function styleHeader_(range) {
  range
    .setBackground('#1F6B52')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
