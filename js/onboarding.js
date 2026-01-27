/* LocalTop – Onboarding
   Endpoint Google Apps Script:
   - Incolla qui l'URL della Web App (termina con /exec)
*/
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbwn7Na8vjBSPcl4cH2G9Da6wjJjg9T3nviAvKmyozEoHtLh9wYN0v0ab1UrACjRXgzR/exec";

// Versione informativa privacy (usata per registrare l'accettazione nel foglio)
const PRIVACY_POLICY_VERSION = "2026-01-19";

(function () {
  const form = document.getElementById("onboardingForm");
  if (!form) return;

  const alertBox = document.getElementById("onbAlert");
  const submitBtn = document.getElementById("submitBtn");
  const submitBtnDefaultText = submitBtn ? submitBtn.textContent : "";

  const typeSede = document.getElementById("typeSede");
  const typeDomicilio = document.getElementById("typeDomicilio");

  const address = document.getElementById("address");
  const openingHours = document.getElementById("openingHours");
  const serviceArea = document.getElementById("serviceArea");

  const googleYesBox = document.getElementById("googleYesBox");
  const googleNoBox = document.getElementById("googleNoBox");
  const googleLinkWrap = document.getElementById("googleLinkWrap");

  const paymentEmail = document.getElementById("paymentEmail");
  const plan = document.getElementById("plan");
  const province = document.getElementById("province");
  const planBaseBox = document.getElementById("planBaseBox");
  const planPlusBox = document.getElementById("planPlusBox");
  const planPremiumBox = document.getElementById("planPremiumBox");

  const planExtraWrap = document.getElementById("planExtraWrap");
  const planRoughWrap = document.getElementById("planRoughWrap");

  const priority = document.getElementById("priority");
  const stylePreferences = document.getElementById("stylePreferences");
  const roughIdeas = document.getElementById("roughIdeas");

  function attachCounter(inputId, counterId) {
    const el = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!el || !counter) return;
    const max = el.getAttribute("maxlength") || "";
    const update = () => {
      const len = (el.value || "").length;
      counter.textContent = `${len} / ${max}`;
    };
    el.addEventListener("input", update);
    update();
  }



  const requiredAlways = [
    "paymentEmail",
    "plan",
    "businessName",
    "contactName",
    "phone",
    "city",
    "province",
    "services",
    "businessDescription",
    "strength1",
    "strength2",
    "strength3"
  ];

  function setAlert(kind, msg) {
    if (!alertBox) return;
    alertBox.hidden = false;
    alertBox.classList.remove("isOk", "isErr");
    alertBox.classList.add(kind === "ok" ? "isOk" : "isErr");
    alertBox.textContent = msg;
  }

  function clearAlert() {
    if (!alertBox) return;
    alertBox.hidden = true;
    alertBox.textContent = "";
    alertBox.classList.remove("isOk", "isErr");
  }

  
  attachCounter("businessDescription", "businessDescriptionCounter");
  attachCounter("strength1", "strength1Counter");
  attachCounter("strength2", "strength2Counter");
  attachCounter("strength3", "strength3Counter");
  attachCounter("services", "servicesCounter");
  attachCounter("notes", "notesCounter");
  attachCounter("priority", "priorityCounter");
  attachCounter("stylePreferences", "stylePreferencesCounter");
  attachCounter("roughIdeas", "roughIdeasCounter");



  function getRadioValue(name) {
    const el = form.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  }

  function setRequired(el, isRequired) {
    if (!el) return;
    if (isRequired) el.setAttribute("required", "required");
    else el.removeAttribute("required");
  }

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function toggleByBusinessType() {
    const t = getRadioValue("businessType");

    if (t === "SEDE") {
      show(typeSede);
      hide(typeDomicilio);

      setRequired(address, true);
      setRequired(openingHours, true);
      setRequired(serviceArea, false);

      if (serviceArea) serviceArea.value = "";
    } else if (t === "DOMICILIO") {
      show(typeDomicilio);
      hide(typeSede);

      setRequired(serviceArea, true);
      setRequired(address, false);
      setRequired(openingHours, false);

      if (address) address.value = "";
      if (openingHours) openingHours.value = "";
    } else {
      hide(typeSede);
      hide(typeDomicilio);

      setRequired(address, false);
      setRequired(openingHours, false);
      setRequired(serviceArea, false);
    }
  }

  function toggleByGoogleProfile() {
    const gp = getRadioValue("googleProfile");

    if (gp === "SI") {
      show(googleYesBox);
      hide(googleNoBox);
      show(googleLinkWrap);
    } else if (gp === "NO") {
      hide(googleYesBox);
      show(googleNoBox);
      hide(googleLinkWrap);
      const gl = document.getElementById("googleLink");
      if (gl) gl.value = "";
    } else {
      hide(googleYesBox);
      hide(googleNoBox);
      hide(googleLinkWrap);
    }
  }

  function sanitizeProvince(val) {
    return String(val || "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  }

  function prefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const qEmail = params.get("email");
    const qPlan = params.get("piano") || params.get("plan");

    if (qEmail && paymentEmail && !paymentEmail.value) paymentEmail.value = qEmail.trim();
    if (qPlan && plan && !plan.value) plan.value = qPlan.trim().toUpperCase();
  }

  function collectData() {
    // Normalizza provincia
    if (province) province.value = sanitizeProvince(province.value);

    const data = {
      paymentEmail: (paymentEmail?.value || "").trim(),
      plan: (plan?.value || "").trim(),
      businessName: (document.getElementById("businessName")?.value || "").trim(),
      contactName: (document.getElementById("contactName")?.value || "").trim(),
      phone: (document.getElementById("phone")?.value || "").trim(),
      city: (document.getElementById("city")?.value || "").trim(),
      province: sanitizeProvince(province?.value),

      publicEmail: (document.getElementById("publicEmail")?.value || "").trim(),
      businessDescription: (document.getElementById("businessDescription")?.value || "").trim(),
      strength1: (document.getElementById("strength1")?.value || "").trim(),
      strength2: (document.getElementById("strength2")?.value || "").trim(),
      strength3: (document.getElementById("strength3")?.value || "").trim(),

      businessType: getRadioValue("businessType"),

      address: (document.getElementById("address")?.value || "").trim(),
      openingHours: (document.getElementById("openingHours")?.value || "").trim(),
      closingDays: (document.getElementById("closingDays")?.value || "").trim(),

      serviceArea: (document.getElementById("serviceArea")?.value || "").trim(),

      googleProfile: getRadioValue("googleProfile"),
      googleLink: (document.getElementById("googleLink")?.value || "").trim(),

      services: (document.getElementById("services")?.value || "").trim(),
      materials: getRadioValue("materials"),
      notes: (document.getElementById("notes")?.value || "").trim(),

      priority: (priority?.value || "").trim(),
      stylePreferences: (stylePreferences?.value || "").trim(),
      roughIdeas: (roughIdeas?.value || "").trim(),

      pageUrl: window.location.href,
      userAgent: navigator.userAgent,

      privacyAccepted: !!document.getElementById("privacyAccepted")?.checked,
      privacyAcceptedAt: document.getElementById("privacyAccepted")?.checked ? new Date().toISOString() : "",
      privacyPolicyVersion: PRIVACY_POLICY_VERSION
    };

    return data;
  }

  function validateClientSide(data) {
    // campi sempre obbligatori
    for (const id of requiredAlways) {
      const el = document.getElementById(id);
      if (!el) continue;
      const val = (el.value || "").trim();
      if (!val) {
        el.focus();
        setAlert("err", "Compila tutti i campi obbligatori prima di inviare.");
        return false;
      }
    }

    if (!data.businessType) {
      setAlert("err", "Seleziona il tipo di attività.");
      return false;
    }

    if (!data.googleProfile) {
      setAlert("err", "Seleziona se il profilo Google Business esiste già o va creato.");
      return false;
    }

    if (!data.materials) {
      setAlert("err", "Seleziona come preferisci inviarci foto e logo.");
      return false;
    }

    if (!data.privacyAccepted) {
      const privacyEl = document.getElementById("privacyAccepted");
      if (privacyEl) privacyEl.focus();
      setAlert("err", "Per proseguire devi accettare la Privacy e Cookie.");
      return false;
    }

    if (data.businessType === "SEDE") {
      if (!data.address || !data.openingHours) {
        setAlert("err", "Per attività con sede: indirizzo e orari sono obbligatori.");
        return false;
      }
    }

    if (data.businessType === "DOMICILIO") {
      if (!data.serviceArea) {
        setAlert("err", "Per attività a domicilio: la zona in cui lavori è obbligatoria.");
        return false;
      }
    }


    if (data.plan === "PLUS" || data.plan === "PREMIUM") {
      if (!data.priority) {
        if (priority) priority.focus();
        setAlert("err", "Per PLUS/PREMIUM: indica cosa vuoi evidenziare (priorità).");
        return false;
      }
    }

    if (!data.province || data.province.length !== 2) {
      if (province) province.focus();
      setAlert("err", "Provincia non valida. Inserisci la sigla (2 lettere), es. MS.");
      return false;
    }

    return true;
  }


  function toggleByPlan() {
    const v = (plan?.value || "").trim();

    // info box
    if (planBaseBox) planBaseBox.hidden = v !== "BASE";
    if (planPlusBox) planPlusBox.hidden = v !== "PLUS";
    if (planPremiumBox) planPremiumBox.hidden = v !== "PREMIUM";

    // extra fields
    const needsExtras = (v === "PLUS" || v === "PREMIUM");
    if (planExtraWrap) planExtraWrap.hidden = !needsExtras;

    // priority required for PLUS/PREMIUM
    if (priority) {
      priority.required = needsExtras;
      // Pulizia validazione HTML se si passa a BASE
      if (!needsExtras) priority.setCustomValidity("");
    }

    // rough ideas only for PREMIUM (facoltativo)
    if (planRoughWrap) planRoughWrap.hidden = v !== "PREMIUM";
  }


  async function postToGAS(data) {
    if (!GAS_ENDPOINT || GAS_ENDPOINT.includes("INCOLLA_QUI")) {
      throw new Error("Endpoint non configurato. Incolla l'URL della Web App in js/onboarding.js");
    }

    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      // Evita preflight CORS: inviamo JSON come text/plain
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    });

    // Se la risposta non è JSON parsabile, solleva errore
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error("Risposta non valida dal server (non JSON).");
    }

    if (!json || json.ok !== true) {
      const msg = (json && json.error) ? String(json.error) : "Errore sconosciuto.";
      throw new Error(msg);
    }
    return json;
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? "Invio in corso…" : submitBtnDefaultText;
  }

  form.addEventListener("change", (e) => {
    if (e.target && e.target.name === "businessType") toggleByBusinessType();
    if (e.target && e.target.name === "googleProfile") toggleByGoogleProfile();
    if (e.target && e.target.id === "plan") toggleByPlan();
  });

  if (province) {
    province.addEventListener("input", () => {
      province.value = sanitizeProvince(province.value);
    });
  }

  form.addEventListener("submit", async (e) => {
    // Anti-doppio click: disabilita subito il submit
    const __submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (__submitBtn) __submitBtn.disabled = true;

    e.preventDefault();
    clearAlert();

    const data = collectData();
    if (!validateClientSide(data)) return;

    setSubmitting(true);

    try {
      await postToGAS(data);
      const email = encodeURIComponent(String(data.paymentEmail || "").trim().toLowerCase());
      const plan = encodeURIComponent(String(data.plan || "").trim().toUpperCase());
      window.location.href = `fatturazione.html?email=${email}&plan=${plan}`;
      return;
    } catch (err) {
      if (typeof __submitBtn !== 'undefined' && __submitBtn) __submitBtn.disabled = false;

      const msg = (err && err.message) ? err.message : "Errore durante l’invio.";
      setAlert("err", msg);
    } finally {
      setSubmitting(false);
    }
  });

  // init
  prefillFromQuery();
  toggleByBusinessType();
  toggleByGoogleProfile();
  toggleByPlan();
})();


