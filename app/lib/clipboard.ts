/**
 * `navigator.clipboard` can throw or simply not exist (an insecure context,
 * a browser without permission granted). The textarea fallback keeps an
 * explicit user action usable in older and embedded browsers too.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue to the user-action fallback below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;opacity:0";
    document.body.append(textarea);
    try {
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      return document.execCommand("copy");
    } finally {
      textarea.remove();
    }
  } catch {
    return false;
  }
}
