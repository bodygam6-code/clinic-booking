/**
 * Clinic booking page.
 *
 * Flow:
 *   1. Patient fills the form (validated before submit).
 *   2. Payload is sent as JSON to the n8n webhook.
 *   3. A success or error screen is shown.
 */
(function () {
  "use strict";

  /* ==========================================================
     Configuration
     ========================================================== */

  /**
   * Booking webhooks — every booking is sent to ALL URLs in this list.
   * Paste a teammate's ngrok webhook URL as another line to mirror bookings.
   */
  const WEBHOOK_URLS = [
    // Clinic A (mine)
    "https://attitude-blighted-stunned.ngrok-free.dev/webhook/189bbb0c-e5a0-46e3-b281-472dd8186438",
    // Clinic B (teammate) — test URL: only works while their editor is listening
    "https://retract-monsieur-jovial.ngrok-free.dev/webhook-test/Clinic",
  ];

  const VALIDATION_RULES = {
    name: {
      isValid: (value) => value.length >= 3,
    },
    phone: {
      isValid: (value) => /^01[0125][0-9]{8}$/.test(value),
    },
    date: {
      isValid: (value) => value !== "" && value >= todayISO(),
    },
    age: {
      isValid: (value) => value !== "" && Number(value) >= 0 && Number(value) <= 120,
    },
    gender: {
      isValid: () => getSelectedGender() !== null,
    },
    address: {
      isValid: (value) => value.length >= 3,
    },
  };

  const SUBMIT_BUTTON_LABEL = "✅ تأكيد الحجز";
  const SENDING_BUTTON_LABEL = "جاري إرسال الحجز...";

  /* ==========================================================
     DOM references
     ========================================================== */

  const dom = {
    form: document.getElementById("booking-form"),
    submitButton: document.getElementById("submit-button"),
    dateInput: document.getElementById("date"),

    sections: {
      booking: document.getElementById("booking-section"),
      success: document.getElementById("success-screen"),
      error: document.getElementById("error-screen"),
    },
    successDetails: document.getElementById("success-details"),
  };

  /* ==========================================================
     Helpers
     ========================================================== */

  /** Returns today's date as "YYYY-MM-DD" in local time. */
  function todayISO() {
    const now = new Date();
    const local = now.getTime() - now.getTimezoneOffset() * 60000;
    return new Date(local).toISOString().split("T")[0];
  }

  function getSelectedGender() {
    const checked = dom.form.querySelector('input[name="gender"]:checked');
    return checked ? checked.value : null;
  }

  function readFormValues() {
    return {
      name: dom.form.name.value.trim(),
      phone: dom.form.phone.value.trim(),
      date: dom.form.date.value,
      age: dom.form.age.value,
      gender: getSelectedGender(),
      address: dom.form.address.value.trim(),
    };
  }

  /** Builds the JSON payload sent to n8n. */
  function buildPayload(values) {
    return {
      event: "clinic_booking",
      ...values,
      submittedAt: new Date().toLocaleString("ar-EG"),
      source: "QR-Code",
    };
  }

  /* ==========================================================
     API — n8n webhooks (sent to every URL in WEBHOOK_URLS)
     ========================================================== */

  /** Sends the payload to one webhook; throws on HTTP errors. */
  async function deliverBooking(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with HTTP ${response.status}`);
    }
  }

  /**
   * Sends the booking to all webhooks in parallel.
   * Succeeds if at least one copy is delivered; reports the rest.
   */
  async function sendBooking(payload) {
    const results = await Promise.allSettled(
      WEBHOOK_URLS.map((url) => deliverBooking(url, payload))
    );

    const delivered = results.filter((result) => result.status === "fulfilled");
    if (delivered.length === 0) {
      throw new Error("No webhook accepted the booking");
    }

    results
      .filter((result) => result.status === "rejected")
      .forEach((result) => console.warn("A webhook copy failed:", result.reason));
  }

  /* ==========================================================
     UI
     ========================================================== */

  function showSection(name) {
    Object.entries(dom.sections).forEach(([key, section]) => {
      section.hidden = key !== name;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setFieldError(fieldName, hasError) {
    // Radio groups come back as a RadioNodeList — it has no classList,
    // so only single-input controls get the invalid styling.
    const control = dom.form.elements[fieldName];
    if (control && control.classList) {
      control.classList.toggle("form__input--invalid", hasError);
    }

    const message = dom.form.querySelector(`[data-error-for="${fieldName}"]`);
    if (message) {
      message.classList.toggle("form__error--visible", hasError);
    }
  }

  function clearFieldError(input) {
    setFieldError(input.name, false);
  }

  function setSending(isSending) {
    dom.submitButton.disabled = isSending;
    dom.submitButton.innerHTML = isSending
      ? '<span class="form__spinner"></span>' + SENDING_BUTTON_LABEL
      : SUBMIT_BUTTON_LABEL;
  }

  function showSuccess(payload) {
    dom.successDetails.textContent =
      `يا هلا ${payload.name} 👋 هنتواصل معاك على ${payload.phone} ` +
      `لتأكيد موعد يوم ${payload.date}.`;
    showSection("success");
  }

  function showError() {
    showSection("error");
  }

  /* ==========================================================
     Validation
     ========================================================== */

  /** Returns an array of invalid field names. */
  function findInvalidFields() {
    return Object.entries(VALIDATION_RULES)
      .filter(([field, rule]) => !rule.isValid(dom.form.elements[field].value))
      .map(([field]) => field);
  }

  function validateForm() {
    const invalidFields = findInvalidFields();

    Object.keys(VALIDATION_RULES).forEach((field) => {
      setFieldError(field, invalidFields.includes(field));
    });

    return invalidFields.length === 0;
  }

  /* ==========================================================
     Event wiring
     ========================================================== */

  function initDateMinLimit() {
    dom.dateInput.min = todayISO();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = buildPayload(readFormValues());
    setSending(true);

    sendBooking(payload)
      .then(() => showSuccess(payload))
      .catch((error) => {
        console.error("Booking submission failed:", error);
        showError();
      })
      .finally(() => setSending(false));
  }

  function handleReset() {
    dom.form.reset();
    showSection("booking");
  }

  function init() {
    initDateMinLimit();

    dom.form.addEventListener("submit", handleSubmit);
    dom.form.addEventListener("input", (event) => clearFieldError(event.target));

    document.getElementById("new-booking-button").addEventListener("click", handleReset);
    document.getElementById("retry-button").addEventListener("click", () => showSection("booking"));
  }

  init();
})();
