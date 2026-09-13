import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Field, Input, SearchablePicker, Sheet, Textarea } from "~/components/ui";
import { reference } from "~/data";

export type LocationValue = {
  address: string;
  city: string;
  localGovernmentArea: string;
  state: string;
};

type LocationFieldErrors = Partial<Record<keyof LocationValue, string>>;

const selectButton =
  "flex min-h-11.5 w-full items-center justify-between gap-3 rounded-brand border border-base-300 bg-base-200 px-3.5 py-2.5 text-left text-body text-base-content transition-[background-color,border-color] duration-(--motion-fast) hover:bg-base-300 focus:border-primary focus:bg-base-100 focus:outline-none aria-invalid:border-error disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The shared Nigerian address capture pattern. State and Local Government Area
 * use filterable dropdown sheets because the option sets exceed a practical
 * native select. Reference labels are static fixtures, not a live lookup.
 */
export function LocationFields({
  value,
  onChange,
  errors = {},
  addressLabel = "Address",
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  errors?: LocationFieldErrors;
  addressLabel?: string;
}) {
  const [picker, setPicker] = useState<"state" | "lga" | null>(null);
  const lgasByState = reference.local_government_areas_by_state as Record<string, string[]>;
  const lgas = value.state ? (lgasByState[value.state] ?? []) : [];

  const update = <K extends keyof LocationValue>(key: K, nextValue: LocationValue[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="space-y-4">
      <Field label={addressLabel} error={errors.address}>
        {(p) => (
          <Textarea
            {...p}
            className="min-h-[80px]"
            value={value.address}
            onChange={(event) => update("address", event.target.value)}
            autoComplete="street-address"
          />
        )}
      </Field>
      <Field label="City" error={errors.city}>
        {(p) => (
          <Input
            {...p}
            value={value.city}
            onChange={(event) => update("city", event.target.value)}
            autoComplete="address-level2"
          />
        )}
      </Field>
      <Field label="State" error={errors.state}>
        {(p) => (
          <button
            {...p}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={picker === "state"}
            onClick={() => setPicker("state")}
            className={selectButton}
          >
            <span className={value.state ? undefined : "text-base-content/45"}>
              {value.state || "Choose a state"}
            </span>
            <ChevronDown aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          </button>
        )}
      </Field>
      <Field
        label="Local Government Area"
        hint={!value.state ? "Choose a state first." : undefined}
        error={errors.localGovernmentArea}
      >
        {(p) => (
          <button
            {...p}
            type="button"
            disabled={!value.state}
            aria-haspopup="dialog"
            aria-expanded={picker === "lga"}
            onClick={() => setPicker("lga")}
            className={selectButton}
          >
            <span className={value.localGovernmentArea ? undefined : "text-base-content/45"}>
              {value.localGovernmentArea || "Choose an LGA"}
            </span>
            <ChevronDown aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          </button>
        )}
      </Field>

      <Sheet open={picker === "state"} onClose={() => setPicker(null)} title="Choose a state">
        <SearchablePicker
          items={reference.states}
          value={value.state}
          getKey={(state) => state}
          getLabel={(state) => state}
          placeholder="Search states"
          onSelect={(state) => {
            onChange({ ...value, state, localGovernmentArea: "" });
            setPicker(null);
          }}
        />
      </Sheet>
      <Sheet
        open={picker === "lga"}
        onClose={() => setPicker(null)}
        title={value.state ? `Choose an LGA in ${value.state}` : "Choose an LGA"}
      >
        <SearchablePicker
          items={lgas}
          value={value.localGovernmentArea}
          getKey={(lga) => lga}
          getLabel={(lga) => lga}
          placeholder="Search LGAs"
          emptyText="No LGAs found for this state"
          onSelect={(localGovernmentArea) => {
            update("localGovernmentArea", localGovernmentArea);
            setPicker(null);
          }}
        />
      </Sheet>
    </div>
  );
}
