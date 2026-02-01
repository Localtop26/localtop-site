/**
 * LocalTop – Onboarding to Google Sheets (Google Apps Script Web App)
 *
 * NOTE CORS:
 * - Il frontend invia JSON come text/plain per evitare preflight OPTIONS.
 * - Pubblica la Web App con accesso "Chiunque" (Anyone).
 */

// 1) INCOLLA QUI lo Spreadsheet ID (lo trovi nell'URL del foglio)
const SPREADSHEET_ID = "INCOLLA_QUI_SPREADSHEET_ID";

// 2) (Opzionale) Token semplice per protezione endpoint (se vuoi abilitarlo).
//    Se lasci vuoto, il token NON è richiesto.
const SHARED_TOKEN = "";

// Nome del tab
const SHEET_NAME = "Onboarding";

// Tab separato per dati di fatturazione
const BILLING_SHEET_NAME = "Fatturazione";

// Tab per stato cliente / pagamenti (webhook Stripe e riepilogo)
const CLIENTS_SHEET_NAME = "Clienti";

// Colonne previste per l'onboarding (foglio "Onboarding").
// Nota: nuove colonne vengono aggiunte in coda se mancanti, senza rompere fogli già esistenti.
const ONBOARDING_COLUMNS = [
  "timestamp",
  "paymentEmail",
  "plan",
  "businessName",
  "contactName",
  "phone",
  "city",
  "province",
  "publicEmail",
  "businessDescription",
  "strength1",
  "strength2",
  "strength3",
  "priority",
  "stylePreferences",
  "roughIdeas",
  "businessType",
  "address",
  "openingHours",
  "closingDays",
  "serviceArea",
  "googleProfile",
  "googleLink",
  "services",
  "materials",
  "notes",
  "privacyAccepted",
  "privacyAcceptedAt",
  "privacyPolicyVersion",
  "pageUrl",
  "userAgent"
];

// Colonne previste per la fatturazione (foglio "Fatturazione").
const BILLING_COLUMNS = [
  "timestamp",
  "paymentEmail",
  "plan",
  "invoiceName",
  "vatNumber",
  "taxCode",
  "invoiceAddress",
  "invoiceCity",
  "invoiceZip",
  "invoiceProvince",
  "invoiceCountry",
  "sdi",
  "pec",
  "billingEmail",
  "confirmFiscal"
];

// Colonne previste per il tab "Clienti" (OPERATIVO).
// Questo tab viene aggiornato SOLO da:
// - onboarding (dati cliente)
// - webhook Stripe (paymentStatus, dataRinnovo)
// La fatturazione NON aggiorna questo tab.
const CLIENTS_COLUMNS = [
  "paymentEmail",
  "businessName",
  "plan",
  "contactName",
  "phone",
  "city",
  "province",
  "publicEmail",
  "lastOnboardingAt",
  "paymentStatus",
  "dataRinnovo"
];

function doGet(e) {
  // Ping per testare che l'endpoint risponda
  return jsonResponse({ ok: true, message: "LocalTop onboarding endpoint attivo." });
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    if (!raw) return jsonResponse({ ok: false, error: "Body vuoto." });

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return jsonResponse({ ok: false, error: "JSON non valido." });
    }

    // Protezione semplice (opzionale)
    if (SHARED_TOKEN && String(data.token || "") !== String(SHARED_TOKEN)) {
      return jsonResponse({ ok: false, error: "Token non valido." });
    }

    // Routing azioni
    const action = String(data.action || "").trim();
    if (action === "stripe_update") {
      return handleStripeUpdate_(data);
    }
    if (action === "billing_submit") {
      return handleBillingSubmit_(data);
    }

    // Validazione server-side (campi obbligatori)
    const required = [
      "paymentEmail",
      "plan",
      "businessName",
      "contactName",
      "phone",
      "city",
      "province",
      "businessType",
      "googleProfile",
      "services",
      "materials",
      "businessDescription",
      "strength1",
      "strength2",
      "strength3"
    ];

    const missing = required.filter(function (k) {
      return !data[k] || String(data[k]).trim() === "";
    });

    // Obblighi condizionali
    if (data.businessType === "SEDE") {
      if (!data.address || !String(data.address).trim()) missing.push("address");
      if (!data.openingHours || !String(data.openingHours).trim()) missing.push("openingHours");
    }
    if (data.businessType === "DOMICILIO") {
      if (!data.serviceArea || !String(data.serviceArea).trim()) missing.push("serviceArea");
    }

    
    // Obblighi condizionali per piano
    if (data.plan === "PLUS" || data.plan === "PREMIUM") {
      if (!data.priority || !String(data.priority).trim()) missing.push("priority");
    }

    // Provincia: 2 lettere
    const prov = String(data.province || "").trim().toUpperCase();
    if (prov.length !== 2) missing.push("province");

    if (missing.length) {
      return jsonResponse({ ok: false, error: "Campi mancanti/non validi: " + missing.join(", ") });
    }

    // Scrittura su Sheet
    const email = String(data.paymentEmail || "").trim().toLowerCase();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getOrCreateSheet_(ss, SHEET_NAME);

    const header = ensureColumns_(sheet, ONBOARDING_COLUMNS);
    const timestamp = new Date();

    const dataMap = {
      timestamp: timestamp,
      paymentEmail: email,
      plan: safe_(data.plan),
      businessName: safe_(data.businessName),
      contactName: safe_(data.contactName),
      phone: safe_(data.phone),
      city: safe_(data.city),
      province: prov,
      publicEmail: safe_(data.publicEmail),
      businessDescription: safe_(data.businessDescription),
      strength1: safe_(data.strength1),
      strength2: safe_(data.strength2),
      strength3: safe_(data.strength3),
      priority: safe_(data.priority),
      stylePreferences: safe_(data.stylePreferences),
      roughIdeas: safe_(data.roughIdeas),
      businessType: safe_(data.businessType),
      address: safe_(data.address),
      openingHours: safe_(data.openingHours),
      closingDays: safe_(data.closingDays),
      serviceArea: safe_(data.serviceArea),
      googleProfile: safe_(data.googleProfile),
      googleLink: safe_(data.googleLink),
      services: safe_(data.services),
      materials: safe_(data.materials),
      notes: safe_(data.notes),
      privacyAccepted: data.privacyAccepted ? "YES" : "NO",
      privacyAcceptedAt: safe_(data.privacyAcceptedAt),
      privacyPolicyVersion: safe_(data.privacyPolicyVersion),
      pageUrl: safe_(data.pageUrl),
      userAgent: safe_(data.userAgent)
    };

    sheet.appendRow(buildRowFromHeader_(header, dataMap));

    // Aggiorna/crea scheda operativa cliente (tab "Clienti") usando paymentEmail come chiave.
    // Nota: NON tocca mai paymentStatus e dataRinnovo (campi gestiti solo da Stripe).
    upsertClient_(ss, {
      paymentEmail: email,
      businessName: safe_(data.businessName),
      plan: safe_(data.plan),
      contactName: safe_(data.contactName),
      phone: safe_(data.phone),
      city: safe_(data.city),
      province: prov,
      publicEmail: safe_(data.publicEmail),
      lastOnboardingAt: timestamp
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Errore server: " + err });
  }
}

function jsonResponse(obj) {
  // ContentService riduce i problemi CORS nelle web app pubblicate.
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function ensureColumns_(sheet, expectedHeader) {
  const existing = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    : [];

  const existingTrimmed = (existing || []).map(function (v) {
    return String(v || "").trim();
  });

  // Se il foglio è vuoto, crea direttamente l'header completo.
  const hasAnyHeader = existingTrimmed.some(function (v) { return v !== ""; });
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, expectedHeader.length).setValues([expectedHeader]);
    sheet.getRange(1, 1, 1, expectedHeader.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return expectedHeader.slice();
  }

  // Aggiunge in coda eventuali colonne mancanti.
  const headerSet = {};
  existingTrimmed.forEach(function (h) { if (h) headerSet[h] = true; });

  const missing = expectedHeader.filter(function (h) { return !headerSet[h]; });
  if (missing.length) {
    const startCol = existingTrimmed.length + 1;
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    sheet.getRange(1, startCol, 1, missing.length).setFontWeight("bold");
  }

  const finalLastCol = sheet.getLastColumn();
  const finalHeader = sheet.getRange(1, 1, 1, finalLastCol).getValues()[0]
    .map(function (v) { return String(v || "").trim(); });
  sheet.setFrozenRows(1);
  return finalHeader;
}

function buildRowFromHeader_(header, dataMap) {
  return header.map(function (key) {
    if (key === "") return "";
    return key === "timestamp" ? dataMap.timestamp : safe_(dataMap[key]);
  });
}

function safe_(v) {
  return (v === null || v === undefined) ? "" : String(v);
}


/* ===========================
   FATTURAZIONE (passo 2)
   =========================== */

function handleBillingSubmit_(data) {
  const email = String(data.paymentEmail || "").trim().toLowerCase();
  if (!email) return jsonResponse({ ok: false, error: "paymentEmail mancante." });

  // Validazione server-side (fatturazione)
  const required = [
    "paymentEmail",
    "plan",
    "invoiceName",
    "vatNumber",
    "taxCode",
    "invoiceAddress",
    "invoiceCity",
    "invoiceZip",
    "invoiceProvince",
    "billingEmail"
  ];

  const missing = required.filter(function (k) {
    return !data[k] || String(data[k]).trim() === "";
  });

  const sdi = String(data.sdi || "").trim();
  const pec = String(data.pec || "").trim();
  if (!sdi && !pec) missing.push("sdi/pec");

  const confirmFiscal = !!data.confirmFiscal;
  if (!confirmFiscal) missing.push("confirmFiscal");

  // Provincia: 2 lettere
  const prov = String(data.invoiceProvince || "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  if (prov.length !== 2) missing.push("invoiceProvince");

  if (missing.length) {
    return jsonResponse({ ok: false, error: "Campi mancanti/non validi: " + missing.join(", ") });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet_(ss, BILLING_SHEET_NAME);

  const header = ensureColumns_(sheet, BILLING_COLUMNS);

  const timestamp = new Date();

  const dataMap = {
    timestamp: timestamp,
    paymentEmail: email,
    plan: safe_(data.plan),
    invoiceName: safe_(data.invoiceName),
    vatNumber: safe_(data.vatNumber),
    taxCode: safe_(data.taxCode),
    invoiceAddress: safe_(data.invoiceAddress),
    invoiceCity: safe_(data.invoiceCity),
    invoiceZip: safe_(String(data.invoiceZip || "").trim()),
    invoiceProvince: prov,
    invoiceCountry: safe_(data.invoiceCountry || "IT"),
    sdi: safe_(sdi),
    pec: safe_(pec),
    billingEmail: safe_(String(data.billingEmail || "").trim().toLowerCase()),
    confirmFiscal: confirmFiscal ? "YES" : "NO"
  };

  upsertByColumnValue_(sheet, header, "paymentEmail", email, buildRowFromHeader_(header, dataMap));


  return jsonResponse({ ok: true });
}


/* ===========================
   STRIPE WEBHOOK (Worker -> GAS)
   =========================== */

function handleStripeUpdate_(data) {
  const email = String(data.paymentEmail || "").trim().toLowerCase();
  if (!email) return jsonResponse({ ok: false, error: "paymentEmail mancante." });

  const paymentStatus = (data.paymentStatus === null || data.paymentStatus === undefined)
    ? undefined
    : String(data.paymentStatus);

  const dataRinnovo = (data.dataRinnovo === null || data.dataRinnovo === undefined)
    ? undefined
    : String(data.dataRinnovo);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Aggiorna SOLO lo stato pagamenti (mai i dati anagrafici)
  upsertClient_(ss, {
    paymentEmail: email,
    paymentStatus: paymentStatus,
    dataRinnovo: dataRinnovo
  });

  return jsonResponse({ ok: true });
}



/* ===========================
   CLIENTI (Upsert Merge)
   =========================== */

function upsertClient_(ss, updates) {
  const email = String((updates && updates.paymentEmail) || "").trim().toLowerCase();
  if (!email) return;

  const sheet = getOrCreateSheet_(ss, CLIENTS_SHEET_NAME);
  const header = ensureColumns_(sheet, CLIENTS_COLUMNS);

  upsertMergeByColumnValue_(sheet, header, "paymentEmail", email, updates);
}

function upsertMergeByColumnValue_(sheet, header, keyName, keyValue, updates) {
  const keyColIndex = header.indexOf(keyName);
  if (keyColIndex === -1) {
    // Fallback: se manca la colonna chiave, appende una riga minima.
    const row = buildRowFromHeader_(header, Object.assign({}, updates, { paymentEmail: keyValue }));
    sheet.appendRow(row);
    return;
  }

  const lastRow = sheet.getLastRow();
  const keyCol = keyColIndex + 1;
  const keyNorm = String(keyValue || "").trim().toLowerCase();

  let targetRow = -1;
  if (lastRow >= 2) {
    const values = sheet.getRange(2, keyCol, lastRow - 1, 1).getValues().map(function (r) {
      return String(r[0] || "").trim().toLowerCase();
    });
    const idx = values.indexOf(keyNorm);
    if (idx !== -1) targetRow = 2 + idx;
  }

  if (targetRow === -1) {
    // Nuovo cliente
    const baseMap = Object.assign({}, updates, { paymentEmail: keyNorm });
    const row = buildRowFromHeader_(header, baseMap);
    sheet.appendRow(row);
    return;
  }

  // Merge su riga esistente: aggiorna solo le chiavi presenti in `updates`
  const existing = sheet.getRange(targetRow, 1, 1, header.length).getValues()[0];
  const merged = existing.slice();

  for (let i = 0; i < header.length; i++) {
    const k = header[i];
    if (!k) continue;
    if (!Object.prototype.hasOwnProperty.call(updates, k)) continue;
    const v = updates[k];
    if (v === undefined) continue;
    merged[i] = (k === keyName) ? keyNorm : safe_(v);
  }

  sheet.getRange(targetRow, 1, 1, merged.length).setValues([merged]);
}

function upsertByColumnValue_(sheet, header, keyName, keyValue, row) {
  const keyColIndex = header.indexOf(keyName);
  if (keyColIndex === -1) {
    // Fallback: se manca la colonna chiave, appende.
    sheet.appendRow(row);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sheet.appendRow(row);
    return;
  }

  const col = keyColIndex + 1;
  const values = sheet.getRange(2, col, lastRow - 1, 1).getValues().map(function (r) {
    return String(r[0] || "").trim().toLowerCase();
  });

  const idx = values.indexOf(String(keyValue || "").trim().toLowerCase());
  if (idx === -1) {
    sheet.appendRow(row);
  } else {
    const targetRow = 2 + idx;
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  }
}