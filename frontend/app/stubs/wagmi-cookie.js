/**
 * Stub for missing @wagmi/core utils/cookie.js
 */
function parseCookie(cookieString) {
  if (!cookieString) return {};
  return Object.fromEntries(
    cookieString.split(";").map((s) => {
      const i = s.indexOf("=");
      const key = i > 0 ? s.slice(0, i).trim() : s.trim();
      const value = i > 0 ? s.slice(i + 1).trim() : "";
      return [key, value];
    })
  );
}

const cookieStorage = {
  getItem: (key) =>
    typeof document !== "undefined" ? parseCookie(document.cookie)[key] : undefined,
  setItem: () => {},
  removeItem: () => {},
};

function cookieToInitialState(_config, cookieString) {
  if (!cookieString) return undefined;
  try {
    const parsed = parseCookie(cookieString);
    const state = parsed["wagmi.store"];
    return state ? JSON.parse(decodeURIComponent(state)) : undefined;
  } catch {
    return undefined;
  }
}

export { cookieStorage, cookieToInitialState, parseCookie };
