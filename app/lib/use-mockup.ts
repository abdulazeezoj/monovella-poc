/**
 * Whether the phone/laptop device mockup should be drawn around the app.
 *
 * Deployed as a clickable prototype, the app is the thing being clicked
 * through — on any device, including a desktop browser — so the bezel never
 * renders and this always answers `false`. The `mockup:` CSS variant (see
 * app/app.css) already has a fully exercised "no mockup" path from when a
 * real phone or tablet answered `false` here, so turning it off everywhere
 * is a zero-risk flip rather than new behaviour.
 */
export function usePointerFine() {
  return false;
}
