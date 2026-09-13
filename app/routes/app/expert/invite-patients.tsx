import { Share2 } from "lucide-react";
import { useState } from "react";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { Banner, Button, Card, CopyButton, Field, Select } from "~/components/ui";
import { EXPERT_ID, expertById, expertName } from "~/data/selectors";
import { specialtyLabel } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

const EXPERT_REFERRAL_CODE = "EXP-ADEYEMI";

export default function InvitePatients() {
  const { data, toast } = usePrototype();
  const expert = expertById(data, EXPERT_ID)!;
  const [region, setRegion] = useState(expert.state ?? "Lagos");
  const params = new URLSearchParams({ ref: EXPERT_REFERRAL_CODE, region });
  const referralLink = `https://monovella.com/?${params.toString()}`;

  const share = async () => {
    if (!navigator.share) {
      await navigator.clipboard?.writeText(referralLink);
      toast("Invite link copied. Your browser does not provide a share sheet.");
      return;
    }
    try {
      await navigator.share({
        title: "Start your own Monovella ID",
        text: `${expertName(data, EXPERT_ID)} invited you to explore Monovella.`,
        url: referralLink,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("The share sheet was unavailable. Copy the link instead.");
    }
  };

  return (
    <MobileScreen title="Invite a patient" back="/app/expert" tabs="expert">
      <div data-screen="X25" className="space-y-5">
        <p className="measure text-body text-base-content/75">
          Give a patient a clear route to create their own account. You will not receive access to
          their record unless they later choose to share it through a care journey.
        </p>

        <Field
          label="Patient's location"
          hint="This starts discovery in the selected area. The patient can change it before choosing care."
        >
          {(props) => (
            <Select {...props} value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
              <option value="Other">Elsewhere in Nigeria</option>
            </Select>
          )}
        </Field>

        {region === "Other" ? (
          <Banner tone="info">
            Monovella may not have a suitable expert near them. They can still create an account and
            see what remote care is available.
          </Banner>
        ) : null}

        <Card>
          <p className="text-label font-medium">What the patient will see</p>
          <p className="mt-2 text-body-sm text-base-content/75">
            Invited by {expertName(data, EXPERT_ID)}, {specialtyLabel(expert.specialty)}, with{" "}
            {region === "Other" ? "no location assumed" : `${region} selected as a starting area`}.
          </p>
          <p className="mt-3 break-all font-mono text-record text-primary">{referralLink}</p>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <CopyButton text={referralLink} label="Copy link" copiedLabel="Link copied" />
          <Button variant="secondary" onClick={share}>
            <Share2 aria-hidden className="size-4" strokeWidth={1.5} />
            Share
          </Button>
        </div>

        <Card>
          <p className="font-heading text-h3">How to introduce it</p>
          <ol className="mt-3 space-y-2 text-body-sm text-base-content/70">
            <li>1. Explain that the patient creates and controls their own Monovella ID.</li>
            <li>2. Ask them to confirm their location and choose care for themselves.</li>
            <li>3. Do not promise a particular expert, appointment time, price, or free care.</li>
          </ol>
        </Card>
      </div>
    </MobileScreen>
  );
}

export { EXPERT_REFERRAL_CODE };
