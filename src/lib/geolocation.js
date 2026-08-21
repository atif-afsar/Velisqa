/**
 * Geolocation utility — requests the browser's location permission
 * and reverse-geocodes coordinates into an Indian PIN code.
 *
 * Uses the free OpenStreetMap Nominatim API (no key required).
 */

const STORAGE_KEY = 'velisqa:delivery_pincode';
const GEO_ASKED_KEY = 'velisqa:geo_asked';

/**
 * Returns the user's current position as { latitude, longitude }.
 * Rejects if the user denies permission or geolocation is unavailable.
 */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

/**
 * Reverse-geocodes { latitude, longitude } into a 6-digit Indian PIN code
 * using Nominatim (OpenStreetMap).
 *
 * Returns the pincode string, or null if not found.
 */
async function reverseGeocodePincode(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`;

    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const postcode = data?.address?.postcode;

    // Validate Indian 6-digit PIN
    if (postcode && /^\d{6}$/.test(postcode)) {
      return postcode;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Main entry — call once on app load.
 *
 * If a pincode is already saved, resolves immediately with it.
 * Otherwise requests location, reverse-geocodes, saves, and returns the pincode.
 *
 * @returns {{ pincode: string|null, city: string|null }}
 */
export async function requestLocationPincode() {
  // Already have a saved pincode — skip
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return { pincode: saved, city: null };

  // Already asked once this browser — don't nag
  const alreadyAsked = sessionStorage.getItem(GEO_ASKED_KEY);
  if (alreadyAsked) return { pincode: null, city: null };

  // Mark as asked so we don't re-prompt during this session
  sessionStorage.setItem(GEO_ASKED_KEY, '1');

  try {
    const { latitude, longitude } = await getCurrentPosition();
    const pincode = await reverseGeocodePincode(latitude, longitude);

    if (pincode) {
      localStorage.setItem(STORAGE_KEY, pincode);
      return { pincode, city: null };
    }

    return { pincode: null, city: null };
  } catch {
    // User denied or error — silently fail
    return { pincode: null, city: null };
  }
}
