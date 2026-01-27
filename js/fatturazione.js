/* LocalTop – Dati di fatturazione
   Endpoint Google Apps Script:
   - deve essere lo stesso endpoint del form onboarding
*/
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbwn7Na8vjBSPcl4cH2G9Da6wjJjg9T3nviAvKmyozEoHtLh9wYN0v0ab1UrACjRXgzR/exec";

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

  // === Field-level validation helpers ===
  function getErrorId_(key) { return "err_" + key; }

  function clearFieldError_(elOrWrap) {
    if (!elOrWrap) return;
    elOrWrap.classList.remove("is-invalid");
    const key = elOrWrap.getAttribute && elOrWrap.getAttribute("data-errkey");
    if (key) {
      const errEl = document.getElementById(getErrorId_(key));
      if (errEl) errEl.remove();
      elOrWrap.removeAttribute("data-errkey");
    }
  }

  function setFieldError_(elOrWrap, key, message) {
    if (!elOrWrap) return;
    elOrWrap.classList.add("is-invalid");
    elOrWrap.setAttribute("data-errkey", key);

    const errId = getErrorId_(key);
    let errEl = document.getElementById(errId);
    if (!errEl) {
      errEl = document.createElement("div");
      errEl.id = errId;
      errEl.className = "field-error";
      const parent = elOrWrap.parentNode;
      if (parent) {
        if (elOrWrap.nextSibling) parent.insertBefore(errEl, elOrWrap.nextSibling);
        else parent.appendChild(errEl);
      }
    }
    errEl.textContent = message || "Campo non valido.";
  }

  function clearAllFieldErrors_() {
    form.querySelectorAll(".is-invalid").forEach((el) => clearFieldError_(el));
    form.querySelectorAll(".field-error[id^='err_']").forEach((el) => el.remove());
  }

  function scrollToFirstError_() {
    const first = form.querySelector(".is-invalid");
    if (!first) return;
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = first.matches("input, select, textarea") ? first : first.querySelector("input, select, textarea");
    if (focusable) focusable.focus();
  }

  form.addEventListener("input", (e) => {
    const t = e.target;
    if (!t) return;
    clearFieldError_(t);
  });

  form.addEventListener("change", (e) => {
    const t = e.target;
    if (!t) return;
    clearFieldError_(t);
    const cb = t.closest(".checkboxRow");
    if (cb) clearFieldError_(cb);
  });


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
    clearAllFieldErrors_();

    let firstMsg = "";

    function mark(id, msg) {
      const el = document.getElementById(id);
      setFieldError_(el, id, msg);
      if (!firstMsg) firstMsg = msg;
    }

    // Required fields
    const required = ["paymentEmail","plan","invoiceName","vatNumber","taxCode","invoiceAddress","invoiceZip","invoiceCity","invoiceProvince","billingEmail"];
    required.forEach((k) => {
      if (!data[k] || String(data[k]).trim() === "") {
        mark(k, "Campo obbligatorio.");
      }
    });

    // Province 2 letters
    if ((data.invoiceProvince || "").length !== 2) {
      mark("invoiceProvince", "Provincia non valida: 2 lettere (es. MI).");
    }

    // SDI or PEC at least one
    if (!data.sdi && !data.pec) {
      setFieldError_(document.getElementById("sdi"), "sdi", "Inserisci SDI o PEC (almeno uno).");
      setFieldError_(document.getElementById("pec"), "pec", "Inserisci SDI o PEC (almeno uno).");
      if (!firstMsg) firstMsg = "Inserisci SDI o PEC.";
    }

    // Confirm checkbox
    if (!data.confirmFiscal) {
      const wrap = form.querySelector(".checkboxRow") || document.getElementById("confirmFiscal");
      setFieldError_(wrap, "confirmFiscal", "Devi confermare che i dati fiscali sono corretti.");
      if (!firstMsg) firstMsg = "Devi confermare i dati fiscali.";
    }

    // Email format checks
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.paymentEmail && !emailRe.test(String(data.paymentEmail))) {
      mark("paymentEmail", "Email pagamento non valida.");
    }
    if (data.billingEmail && !emailRe.test(String(data.billingEmail))) {
      mark("billingEmail", "Email per fatturazione non valida.");
    }
    if (data.pec && !emailRe.test(String(data.pec))) {
      mark("pec", "PEC non valida.");
    }

    if (form.querySelector(".is-invalid")) {
      setAlert("err", firstMsg || "Compila correttamente i campi evidenziati in rosso.");
      scrollToFirstError_();
      return false;
    }
    return true;
  }
);

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
    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.ok !== true) {
      const err = (json && json.error) ? json.error : "Errore durante l’invio.";
      throw new Error(err);
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
      // Conferma dedicata (evita reset che sembra un errore)
      window.location.href = "conferma-dati.html";
      return;
    } catch (err) {
      const msg = (err && err.message) ? err.message : "Errore durante l’invio.";
      setAlert("err", msg);
    } finally {
      setSubmitting(false);
    }
  });

  prefillFromQuery();
})();
