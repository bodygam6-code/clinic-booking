/**
 * QR generator page.
 *
 * Builds a QR code that points at index.html in the same folder,
 * so the printed code always matches the hosted page location.
 */
(function () {
  "use strict";

  const QR_API_URL = "https://api.qrserver.com/v1/create-qr-code/";

  const dom = {
    qrImage: document.getElementById("qr-image"),
    bookingUrl: document.getElementById("booking-url"),
    openLink: document.getElementById("open-booking-link"),
    printButton: document.getElementById("print-button"),
  };

  /** Absolute URL of index.html (the booking page) next to the current page. */
  function getBookingPageUrl() {
    return new URL("index.html", window.location.href).href;
  }

  function buildQrImageUrl(targetUrl) {
    return `${QR_API_URL}?size=400x400&margin=10&data=${encodeURIComponent(targetUrl)}`;
  }

  function init() {
    const bookingUrl = getBookingPageUrl();

    dom.bookingUrl.textContent = bookingUrl;
    dom.openLink.href = bookingUrl;
    dom.qrImage.src = buildQrImageUrl(bookingUrl);
    dom.printButton.addEventListener("click", () => window.print());
  }

  init();
})();
