import { PHARMACY, ProviderApplicationStatus } from "~/routes/provider/shared";

export default function Screen() {
  return <ProviderApplicationStatus config={PHARMACY} />;
}
