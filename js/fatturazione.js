/* LocalTop – Dati di fatturazione
   Endpoint Google Apps Script:
   - deve essere lo stesso endpoint del form onboarding
*/
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyCS2yWHbGMBszYtCDz7QuNuSYTqMCjHrk1Rmqnm_-TGivhMkYYsSIsXRNCx-Dw44UT/exec";

(function () {
  const form = document.getElementById("billingForm");
  const alertBox = document.getElementById("alertBox");
  const submitBtn = document.getElementById("submitBtn");
  const submitHint = document.getElementById("submitHint");

  if (!form) return;

  function setAlert(type, msg) {
    alertBox.hidden = false;
    alertBox.className = "alert " + (type === "ok" ? "alertOk" : "alertErr");
    alertBox.textContent = msg;
  }

  function clearAlert() {
    alertBox.hidden = true;
    alertBox.textContent = "";
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitHint.textContent = isSubmitting ? "Invio in corso…" : "";
  }

  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || "";
  }

  function prefillFromQuery() {
    const email = getQueryParam("email").trim().toLowerCase();
    const plan = getQueryParam("plan").trim().toUpperCase();

    const emailEl = document.getElementById("paymentEmail");
    const planEl = document.getElementById("plan");
    const billingEmailEl = document.getElementById("billingEmail");

    if (emailEl) emailEl.value = email;
    if (planEl) planEl.value = plan || "";
    // di default proponi la stessa email del pagamento
    if (billingEmailEl && !billingEmailEl.value) billingEmailEl.value = email;
  }

  function collectData() {
    const val = (id) => (document.getElementById(id)?.value || "").trim();

    return {
      action: "billing_submit",
      paymentEmail: val("paymentEmail").toLowerCase(),
      plan: val("plan").toUpperCase(),
      invoiceName: val("invoiceName"),
      vatNumber: val("vatNumber").replace(/\s+/g, ""),
      taxCode: val("taxCode").replace(/\s+/g, "").toUpperCase(),
      invoiceAddress: val("invoiceAddress"),
      invoiceZip: val("invoiceZip").replace(/\s+/g, ""),
      invoiceCity: val("invoiceCity"),
      invoiceProvince: val("invoiceProvince").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2),
      invoiceCountry: "IT",
      sdi: val("sdi").toUpperCase(),
      pec: val("pec").toLowerCase(),
      billingEmail: val("billingEmail").toLowerCase(),
      confirmFiscal: !!document.getElementById("confirmFiscal")?.checked
    };
  }

  function validateClientSide(data) {
    const missing = [];
    const required = ["paymentEmail","plan","invoiceName","vatNumber","taxCode","invoiceAddress","invoiceZip","invoiceCity","invoiceProvince","billingEmail"];

    required.forEach((k) => {
      if (!data[k] || String(data[k]).trim() === "") missing.push(k);
    });

    if (!data.sdi && !data.pec) missing.push("sdi/pec");
    if (!data.confirmFiscal) missing.push("confirmFiscal");
    if ((data.invoiceProvince || "").length !== 2) missing.push("invoiceProvince");

    if (missing.length) {
      setAlert("err", "Compila correttamente i campi obbligatori: " + missing.join(", "));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
    return true;
  }

  async function postToGAS(data) {
  // 1) Tentativo principale: fetch con timeout e lettura risposta JSON
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.ok !== true) {
      const err = (json && json.error) ? json.error : "Errore durante l’invio.";
      throw new Error(err);
    }
    return json;
  } catch (err) {
    // Fallback CORS/rete: sendBeacon (non leggibile risposta)
    const isAbort = err && (err.name === "AbortError");
    const isFetchBlocked = err && (err.name === "TypeError"); // spesso "Failed to fetch" (CORS/rete)

    if (isAbort || isFetchBlocked) {
      const payload = JSON.stringify(data);
      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });

      if (navigator && typeof navigator.sendBeacon === "function") {
        const ok = navigator.sendBeacon(GAS_ENDPOINT, blob);
        if (ok) return { ok: true, via: "beacon" };
      }

      throw new Error("Invio bloccato dal browser (CORS/rete). Controlla che la Web App GAS sia pubblica (Chiunque) e riprova.");
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();

    const data = collectData();
    if (!validateClientSide(data)) return;

    setSubmitting(true);

    try {
      await postToGAS(data);
      setAlert("ok", "Dati di fatturazione ricevuti. Procederemo con l’emissione della fattura.");
      form.reset();
      prefillFromQuery();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = (err && err.message) ? err.message : "Errore durante l’invio.";
      setAlert("err", msg);
    } finally {
      setSubmitting(false);
    }
  });

  prefillFromQuery();
})();
