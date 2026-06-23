const ANALYTICS_ID = 'G-W5MG295476';
const CONSENT_KEY = 'secondguessit-analytics-consent';

function loadAnalytics() {
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', ANALYTICS_ID, { anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
  document.head.append(script);
}

function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Consent remains valid for this page even if storage is unavailable.
  }
}

const consentBanner = document.getElementById('consentBanner');
const acceptAnalytics = document.getElementById('acceptAnalytics');
const declineAnalytics = document.getElementById('declineAnalytics');
const storedConsent = getConsent();

if (storedConsent === 'accepted') {
  loadAnalytics();
} else if (!storedConsent && consentBanner) {
  consentBanner.hidden = false;
}

acceptAnalytics?.addEventListener('click', () => {
  setConsent('accepted');
  consentBanner.hidden = true;
  loadAnalytics();
});

declineAnalytics?.addEventListener('click', () => {
  setConsent('declined');
  consentBanner.hidden = true;
});

const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.nav-links');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
});

navigation?.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
});
