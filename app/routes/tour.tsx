import {
  ArrowRight,
  ClipboardList,
  FlaskConical,
  Globe,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Link } from "react-router";
import { Lockup, MonovellaIcon } from "~/components/shell/logo";
import { PrototypeBar } from "~/components/shell/prototype-bar";
import { Badge } from "~/components/ui";
import {
  REVIEWER_SURFACE_COUNT,
  SCREEN_ENTRY_COUNT,
  SCREEN_ID_COUNT,
  SCREEN_ROUTE_COUNT,
} from "~/data/screen-manifest";
import { ANCHOR_ISO } from "~/lib/clock";
import { formatDate } from "~/lib/format";

const SURFACES = [
  {
    to: "/app",
    eyebrow: "Mobile app · Patient",
    title: "The patient's record",
    icon: UserRound,
    body:
      "Amara Okonkwo's account, six months in: an active consultation, a prescription she " +
      "hasn't collected, a result that just landed, two dependants, and a calendar of " +
      "everything she has logged.",
    screens: "P1-P67",
  },
  {
    to: "/app/expert",
    eyebrow: "Mobile app · Expert",
    title: "The expert's practice",
    icon: Stethoscope,
    body:
      "The same account, switched into Amara's expert context: incoming requests with " +
      "live response deadlines, her published hours, SOAP notes, prescribing, referral, " +
      "and her own fee ledger.",
    screens: "X1-X23",
  },
  {
    to: "/console",
    eyebrow: "Web app · Back office",
    title: "Monovella's own console",
    icon: ShieldCheck,
    body:
      "The four review queues that keep the network trustworthy: provider applications " +
      "against MDCN, PCN and MLSCN, checkout exceptions, refund requests, and standing.",
    screens: "B1-B22",
  },
  {
    to: "/pharmacy",
    eyebrow: "Web app · Pharmacy",
    title: "GreenLife Pharmacy",
    icon: Pill,
    body:
      "A verified pharmacy's counter view: directed fulfilment requests to accept or " +
      "decline, order status through to handoff, and confirming a patient's payment " +
      "evidence.",
    screens: "V1-V13",
  },
  {
    to: "/lab",
    eyebrow: "Web app · Lab",
    title: "Lagos Diagnostics",
    icon: FlaskConical,
    body:
      "The same portal, parameterised for a lab: test requests, published appointment " +
      "slots patients book into, and uploading a result straight into the patient's case.",
    screens: "V1-V13",
  },
  {
    to: "/",
    eyebrow: "Public · Everyone",
    title: "The landing page",
    icon: Globe,
    body:
      "Monovella's real public front door, one page, one per audience: Patient, Expert, " +
      "Pharmacy and Lab each get their own pitch and their own next step.",
    screens: "M1",
  },
  {
    to: "/screens",
    eyebrow: "Reference",
    title: "Every screen, indexed",
    icon: ClipboardList,
    body: `${SCREEN_ENTRY_COUNT} manifest entries represent ${SCREEN_ID_COUNT} distinct screen IDs from PRODUCT_SCREEN_V0.md across ${SCREEN_ROUTE_COUNT} manifest routes and ${REVIEWER_SURFACE_COUNT} reviewer surfaces.`,
    screens: "Index",
  },
];

const LOOP = [
  {
    step: "Log",
    body: "Food, drink, cycle, symptoms, vitals, activity, sleep: by tapping or by talking to Teni.",
  },
  {
    step: "Understand",
    body: "Cautious, explained observations placed next to the entries they came from. Never a diagnosis.",
  },
  {
    step: "Consult",
    body: "Describe it in your own words, get pointed at a kind of specialist, pick a person, book a real slot.",
  },
  {
    step: "Fulfil",
    body: "Take the prescription anywhere, or send it to one verified pharmacy or lab and let the result come back on its own.",
  },
  {
    step: "Carry it forward",
    body: "A signed report anyone can verify, without needing a Monovella account of their own.",
  },
];

export function meta() {
  return [
    { title: "Monovella: Product Prototype" },
    {
      name: "description",
      content:
        "A clickable prototype of Monovella V0: the patient and expert mobile app, and the back-office, pharmacy and lab web console.",
    },
  ];
}

export default function Tour() {
  return (
    <div className="min-h-dvh bg-base-100">
      <div className="mx-auto w-full max-w-6xl px-5 pb-32 pt-10 sm:px-8 sm:pt-16">
        <header className="border-b border-base-300 pb-10">
          <Lockup size="lg" />
          <p className="mt-8 max-w-[22ch] font-heading text-[clamp(2rem,7vw,3.5rem)] leading-[1.08]">
            Your record. Your experts. Always yours.
          </p>
          <p className="measure mt-6 text-body text-base-content/75">
            Care and the medical record are usually two separate products, built and sold by
            institutions. Neither travels well alone. Monovella does both jobs at once: it connects
            a patient to a real, verified expert, and it keeps the record of that care with the
            patient, not the institution.
          </p>
          <p className="measure mt-4 text-body text-base-content/75">
            What follows is the V0 product, built end to end as a clickable prototype: two apps,
            five audiences, every screen driven by the same JSON the real API would return.
          </p>
        </header>

        <section aria-labelledby="surfaces" className="py-10">
          <h2 id="surfaces" className="font-heading text-h2">
            Pick a seat
          </h2>
          <p className="measure mt-1 text-body-sm text-base-content/65">
            Each one signs you straight in. Nothing here needs a password.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SURFACES.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="group flex h-full flex-col rounded-brand-lg border border-base-300 bg-base-200 p-5 transition-colors duration-(--motion-base) hover:border-primary/45 hover:bg-base-300"
                >
                  <div className="flex items-center gap-2.5">
                    <s.icon aria-hidden className="size-5 text-primary" strokeWidth={1.5} />
                    <p className="text-label text-base-content/60">{s.eyebrow}</p>
                  </div>
                  <h3 className="mt-3 font-heading text-h2">{s.title}</h3>
                  <p className="mt-2 flex-1 text-body-sm text-base-content/70">{s.body}</p>
                  <p className="mt-4 flex items-center justify-between gap-2">
                    <span className="font-mono text-body-sm text-base-content/45">{s.screens}</span>
                    <span className="inline-flex items-center gap-1.5 text-label text-primary">
                      Open
                      <ArrowRight
                        aria-hidden
                        className="size-4 transition-transform duration-(--motion-base) group-hover:translate-x-0.5"
                        strokeWidth={1.5}
                      />
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="loop" className="border-t border-base-300 py-10">
          <h2 id="loop" className="font-heading text-h2">
            The one job is Connect
          </h2>
          <p className="measure mt-1 text-body-sm text-base-content/65">
            Everything else (logging, Teni, payment, pharmacies, labs) exists to serve one action:
            get a patient to a real, verified expert, and keep their history whole however many
            times they switch.
          </p>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-brand border border-base-300 bg-base-300 sm:grid-cols-2 lg:grid-cols-5">
            {LOOP.map((l, i) => (
              <li key={l.step} className="bg-base-100 p-4">
                <p className="font-mono text-body-sm text-primary">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-1.5 font-heading text-h3">{l.step}</p>
                <p className="mt-1.5 text-body-sm text-base-content/65">{l.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="about" className="border-t border-base-300 py-10">
          <h2 id="about" className="font-heading text-h2">
            About this prototype
          </h2>
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Fact term="No backend">
              Every screen reads a JSON fixture shaped exactly like the response
              <span className="font-mono"> openapi.json</span> v0.33.0 defines. Actions you take
              (accepting a request, completing checkout, finalising a note) advance that data in the
              browser, so the flows really run.
            </Fact>
            <Fact term="A frozen clock">
              The demo is anchored to {formatDate(ANCHOR_ISO)}, so the story reads the same today as
              in six months. Countdowns still tick from that anchor, because a response deadline
              that never moves reads as a dead label.
            </Fact>
            <Fact term="Both modes, every screen">
              Dark mode is an independently verified palette, not a filter. Use the control at the
              bottom of any screen.
            </Fact>
            <Fact term="Real reflow">
              The mobile app responds to its own frame, not the browser window, so switching Phone
              to Tablet reflows the layout instead of scaling it. The web app does the same from
              320px up.
            </Fact>
            <Fact term="Nobody real">
              Amara is a patient, and, in her switchable expert context, a verified dermatologist.
              GreenLife and Lagos Diagnostics are invented. No real patient, expert, pharmacy or lab
              appears anywhere in this data.
            </Fact>
            <Fact term="Accessibility">
              An automated 320px smoke test checks reflow, target size, accessible names, labels,
              heading order and image alternatives. Keyboard, screen-reader, zoom and real-device
              checks remain before the WCAG 2.2 AA target can be claimed as verified.
            </Fact>
          </dl>
        </section>

        <footer className="flex flex-wrap items-center gap-3 border-t border-base-300 pt-8">
          <MonovellaIcon className="size-6" />
          <p className="text-body-sm text-base-content/60">
            Monovella V0 prototype · built from{" "}
            <span className="font-mono">PRODUCT_SCREEN_V0.md</span> and{" "}
            <span className="font-mono">openapi.json</span> v0.33.0
          </p>
          <Badge tone="primary">Demo data</Badge>
        </footer>
      </div>
      <PrototypeBar surface="Tour" />
    </div>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-heading text-h3">{term}</dt>
      <dd className="measure mt-1 text-body-sm text-base-content/70">{children}</dd>
    </div>
  );
}
