import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  FlaskConical,
  HeartPulse,
  Mail,
  Phone,
  Pill,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { Lockup } from "~/components/shell/logo";
import { PublicWebShell } from "~/components/shell/web-shell";
import { Badge, ButtonLink } from "~/components/ui";
import { EXPERT_ID, expertById, expertName, patientById } from "~/data/selectors";
import { asset } from "~/lib/asset";
import { specialtyLabel } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

const CARE_TEAMS: {
  icon: LucideIcon;
  title: string;
  body: string;
  image: { src: string; alt: string };
  to: string;
  label: string;
}[] = [
  {
    icon: Stethoscope,
    title: "Experts",
    body: "A calmer way to manage care with the context a patient brings.",
    image: {
      src: asset("/marketing/expert-consult.jpg"),
      alt: "A clinician consulting with a patient.",
    },
    to: "/app/expert/apply",
    label: "Join as an expert",
  },
  {
    icon: Pill,
    title: "Pharmacies",
    body: "Manage fulfilment requests with the patient record they belong to.",
    image: {
      src: asset("/marketing/pharmacy-counter.jpg"),
      alt: "People speaking with a pharmacist at a pharmacy counter.",
    },
    to: "/pharmacy/apply",
    label: "Partner as a pharmacy",
  },
  {
    icon: FlaskConical,
    title: "Labs",
    body: "Keep a lab request and result connected to the wider care story.",
    image: {
      src: asset("/marketing/lab-technician.jpg"),
      alt: "A laboratory technician preparing samples.",
    },
    to: "/lab/apply",
    label: "Partner as a lab",
  },
];

const JOURNEY = [
  {
    icon: HeartPulse,
    number: "01",
    title: "Start with what is happening",
    body: "Describe a concern in plain language and bring the pieces you already have.",
  },
  {
    icon: Clock3,
    number: "02",
    title: "Choose care around your day",
    body: "Find the right next step without making a full day disappear.",
  },
  {
    icon: FileText,
    number: "03",
    title: "Keep the context with you",
    body: "Your record makes the next conversation start with more of your story already there.",
  },
];

export function meta() {
  return [
    { title: "Monovella: See a specialist without losing a day." },
    {
      name: "description",
      content: "Monovella helps you find care around your day and keep your health story together.",
    },
  ];
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center text-body-sm text-base-content/65 transition-colors hover:text-primary"
    >
      {children}
    </Link>
  );
}

export default function Landing() {
  const { data } = usePrototype();
  const [searchParams] = useSearchParams();
  const requestedCode = searchParams.get("ref");
  const requestedRegion = searchParams.get("region");
  const region = ["Lagos", "Abuja", "Other"].includes(requestedRegion ?? "")
    ? requestedRegion
    : null;
  const expert = expertById(data, EXPERT_ID);
  const invitation = data.referralCodes.find((row) => row.referral_code === requestedCode);
  const patient = invitation ? patientById(data, invitation.patient_id) : undefined;
  const expertInvite = requestedCode === "EXP-ADEYEMI" && expert;
  const patientInvite = patient;
  const validCode = expertInvite || patientInvite ? requestedCode : null;
  const joinParams = new URLSearchParams();
  if (validCode) joinParams.set("ref", validCode);
  if (expertInvite && region) joinParams.set("region", region);
  const joinHref = joinParams.size ? `/app/sign-up?${joinParams.toString()}` : "/app/sign-up";

  return (
    <PublicWebShell>
      <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3.5 @lg:px-8">
          <Lockup size="sm" className="shrink-0" />
          <nav
            aria-label="Main navigation"
            className="hidden min-w-0 flex-1 items-center justify-end gap-5 @lg:flex"
          >
            <a
              href="#how-it-works"
              className="text-label text-base-content/70 hover:text-base-content"
            >
              How it works
            </a>
            <a
              href="#care-teams"
              className="text-label text-base-content/70 hover:text-base-content"
            >
              For care teams
            </a>
            <Link
              to="/legal/privacy"
              className="text-label text-base-content/70 hover:text-base-content"
            >
              Privacy
            </Link>
          </nav>
          <ButtonLink to={joinHref} size="sm" className="ml-auto shrink-0 @lg:ml-0">
            Get started
          </ButtonLink>
        </div>
      </header>

      <main>
        {expertInvite || patientInvite ? (
          <section className="border-b border-base-300 bg-primary-tint">
            <div className="mx-auto w-full max-w-6xl px-5 py-4 @lg:px-8">
              <p className="font-heading text-h3">
                Invited by{" "}
                {expertInvite
                  ? expertName(data, EXPERT_ID)
                  : patient
                    ? `${patient.first_name} ${patient.last_name}`
                    : "A Monovella member"}
              </p>
              <p className="measure mt-1 text-body-sm text-base-content/70">
                {expertInvite
                  ? `${specialtyLabel(expert.specialty)} expert. ${
                      region === "Other"
                        ? "No location has been assumed."
                        : `${region ?? expert.state ?? "Your area"} will be your starting area.`
                    }`
                  : "A Monovella member shared their personal invite with you."}{" "}
                You will create and control your own account. This invite does not promise an
                appointment, endorse a particular provider, or make care free.
              </p>
            </div>
          </section>
        ) : null}
        <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 @lg:px-8 @lg:py-14 @4xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.82fr)] @4xl:items-center @4xl:gap-14 @4xl:py-20">
          <div className="max-w-2xl">
            <Badge tone="primary" icon={HeartPulse}>
              One whole health story
            </Badge>
            <h1 className="mt-5 max-w-[14ch] font-heading text-display @lg:text-[3.25rem]/[1.06]">
              See a specialist without losing a day.
            </h1>
            <p className="measure mt-5 text-body text-base-content/75 @lg:text-[1.1875rem]/[1.55]">
              Non-emergency care should not cost a workday. Monovella helps you choose care around
              your day and keep the context that matters together.
            </p>
            <div className="mt-7 flex flex-col gap-3 @lg:flex-row @lg:items-center">
              <ButtonLink to={joinHref} size="lg">
                Get started
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </ButtonLink>
              <a
                href="#care-teams"
                className="inline-flex min-h-11.5 items-center justify-center px-3 text-label text-secondary transition-colors hover:text-primary @lg:justify-start"
              >
                I provide care
                <ArrowRight aria-hidden className="ml-1.5 size-4" strokeWidth={1.5} />
              </a>
            </div>
            <p className="mt-4 max-w-xl text-body-sm text-base-content/60">
              Start with what is happening, then take the next useful step with your story close by.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[1.25rem] border border-base-300 bg-base-200 shadow-folio">
            <img
              src={asset("/marketing/hero-patient-balanced.png")}
              alt="A woman using her phone in a naturally lit home."
              className="block w-full"
              decoding="async"
              fetchPriority="high"
            />
            <div className="absolute inset-x-4 bottom-4 max-w-[17rem] rounded-brand border border-base-300 bg-base-100/95 p-4 backdrop-blur">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-primary">
                The idea
              </p>
              <p className="mt-1.5 font-heading text-h3">
                Care that fits the life already in motion.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-base-300 bg-base-200">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 @lg:px-8 @4xl:grid-cols-[0.78fr_1.22fr] @4xl:items-center @4xl:gap-16 @4xl:py-14">
            <div>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-secondary">
                Care, without the runaround
              </p>
              <h2 className="mt-2 font-heading text-h2 @lg:text-[2rem]/[1.15]">
                A care journey should not begin with starting from zero.
              </h2>
            </div>
            <p className="measure text-body text-base-content/75 @lg:text-[1.125rem]/[1.6]">
              Care should not mean time away from work, a second trip to tell the same story, or a
              record that gets left behind. Monovella brings the important pieces closer together.
            </p>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-24 mx-auto w-full max-w-6xl px-5 py-12 @lg:px-8 @lg:py-16"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-primary">
              How Monovella works
            </p>
            <h2 className="mt-2 font-heading text-h2 @lg:text-[2rem]/[1.15]">
              Less admin. More context.
            </h2>
            <p className="measure mt-3 text-body text-base-content/70">
              A simpler path through care, built to make the next useful step feel clear rather than
              make you read a long explanation.
            </p>
          </div>

          <ol className="mt-8 grid gap-4 @lg:grid-cols-3">
            {JOURNEY.map((item) => (
              <li
                key={item.number}
                className="rounded-[1.25rem] border border-base-300 bg-base-200 p-5 shadow-folio"
              >
                <div className="flex items-center justify-between gap-4">
                  <item.icon aria-hidden className="size-5 text-primary" strokeWidth={1.5} />
                  <span className="font-mono text-data text-base-content/50">{item.number}</span>
                </div>
                <h3 className="mt-8 font-heading text-h3">{item.title}</h3>
                <p className="mt-2 text-body-sm text-base-content/70">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-base-300">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 @lg:px-8 @lg:py-16 @4xl:grid-cols-[0.9fr_1.1fr] @4xl:items-center @4xl:gap-16">
            <div className="overflow-hidden rounded-[1.25rem] border border-base-300 bg-base-200 shadow-folio">
              <img
                src={asset("/marketing/patient-home-lagos.png")}
                alt="A woman reviewing her phone at home."
                className="aspect-[16/10] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="max-w-xl">
              <Badge tone="secondary" icon={ShieldCheck}>
                Patient-held context
              </Badge>
              <h2 className="mt-4 font-heading text-h2 @lg:text-[2rem]/[1.15]">
                Your health story, whole and in your hands.
              </h2>
              <p className="measure mt-4 text-body text-base-content/75 @lg:text-[1.125rem]/[1.6]">
                Monovella keeps the moments you choose to add, a concern, a consultation, a
                prescription or a result, so the next care conversation can begin with useful
                context.
              </p>
              <ul className="mt-5 space-y-3 text-body-sm text-base-content/75">
                {[
                  "A clear place to bring together the details you choose to share.",
                  "A care conversation designed to start with context, not repetition.",
                  "A story that stays whole as your care moves forward.",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-secondary"
                      strokeWidth={1.5}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="care-teams"
          className="scroll-mt-24 mx-auto w-full max-w-6xl px-5 py-12 @lg:px-8 @lg:py-16"
        >
          <div className="flex flex-col gap-3 @lg:flex-row @lg:items-end @lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-secondary">
                For care teams
              </p>
              <h2 className="mt-2 font-heading text-h2 @lg:text-[2rem]/[1.15]">
                For the people who make care work.
              </h2>
            </div>
            <p className="max-w-md text-body-sm text-base-content/65">
              Bring your expertise, service or results into a more connected care experience.
            </p>
          </div>

          <div className="mt-8 grid gap-5 @lg:grid-cols-3">
            {CARE_TEAMS.map((team) => (
              <article
                key={team.title}
                className="overflow-hidden rounded-[1.25rem] border border-base-300 bg-base-200 shadow-folio"
              >
                <img
                  src={team.image.src}
                  alt={team.image.alt}
                  className="aspect-[16/9] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-5">
                  <team.icon aria-hidden className="size-5 text-secondary" strokeWidth={1.5} />
                  <h3 className="mt-5 font-heading text-h3">{team.title}</h3>
                  <p className="mt-2 text-body-sm text-base-content/70">{team.body}</p>
                  <ButtonLink to={team.to} variant="secondary" size="sm" className="mt-5">
                    {team.label}
                    <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.5} />
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-base-300 bg-neutral text-neutral-content">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-12 @lg:px-8 @lg:py-14 @4xl:flex-row @4xl:items-center @4xl:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-neutral-content">
                Start with the patient view
              </p>
              <h2 className="mt-2 font-heading text-h2">
                Care that starts with the right context.
              </h2>
              <p className="mt-3 text-body text-neutral-content/75">
                Start your health story with what is happening now, then follow it through to the
                next useful step.
              </p>
            </div>
            <ButtonLink to={joinHref} variant="primary" size="lg" className="shrink-0">
              Get started
              <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-base-300 bg-base-100">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 @lg:px-8 mockup:pb-6">
          <div className="flex flex-col gap-7 @lg:flex-row @lg:items-start @lg:justify-between">
            <div>
              <Lockup size="sm" />
              <p className="mt-3 max-w-sm text-body-sm text-base-content/60">
                One whole health story. Care that makes room for the life you already have.
              </p>
            </div>
            <div className="grid gap-x-8 gap-y-1 @lg:grid-cols-2">
              <div className="flex flex-col">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-base-content/50">
                  Documents
                </p>
                <FooterLink to="/legal/privacy">Privacy</FooterLink>
                <FooterLink to="/legal/terms">Terms</FooterLink>
                <FooterLink to="/legal/cookies">Cookies</FooterLink>
              </div>
              <div className="flex flex-col">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-base-content/50">
                  Contact
                </p>
                <a
                  href="mailto:hello@monovella.com"
                  className="inline-flex min-h-11 items-center gap-2 text-body-sm text-base-content/65 transition-colors hover:text-primary"
                >
                  <Mail aria-hidden className="size-3.5" strokeWidth={1.5} />
                  hello@monovella.com
                </a>
                <a
                  href="tel:+2349032392234"
                  className="inline-flex min-h-11 items-center gap-2 text-body-sm text-base-content/65 transition-colors hover:text-primary"
                >
                  <Phone aria-hidden className="size-3.5" strokeWidth={1.5} />
                  +234 903 239 2234
                </a>
                <div className="flex flex-wrap gap-x-4">
                  <a
                    href="https://www.linkedin.com/company/monovella"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-body-sm text-base-content/65 transition-colors hover:text-primary"
                  >
                    LinkedIn
                  </a>
                  <a
                    href="https://x.com/monovella"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center text-body-sm text-base-content/65 transition-colors hover:text-primary"
                  >
                    X / monovella
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </PublicWebShell>
  );
}
