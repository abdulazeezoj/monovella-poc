import { PHARMACY, ProviderCredentials } from "~/routes/provider/shared";

export default function PharmacyCredentials() {
  return <ProviderCredentials config={PHARMACY} />;
}
