import { WebNotFound } from "../web-not-found";

export default function PharmacyNotFound() {
  return (
    <WebNotFound
      home="/pharmacy"
      label="Go to pharmacy home"
      support="/pharmacy/support"
      scope="the Pharmacy Portal"
    />
  );
}
