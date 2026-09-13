import { ArrowLeft, Cookie, Mail, Phone, ScrollText, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Lockup } from "~/components/shell/logo";
import { PublicWebShell } from "~/components/shell/web-shell";
import { cn } from "~/lib/cn";

const LAST_UPDATED = "2 September 2026";
const CONTACT_EMAIL = "hello@monovella.com";
const CONTACT_PHONE = "+234 903 239 2234";

const PAGES = [
  { to: "/legal/terms", label: "Terms", icon: ScrollText },
  { to: "/legal/privacy", label: "Privacy", icon: ShieldCheck },
  { to: "/legal/cookies", label: "Cookies", icon: Cookie },
];

type Highlight = { label: string; value: string };

function LegalPage({
  title,
  intro,
  highlights,
  children,
}: {
  title: string;
  intro: string;
  highlights: Highlight[];
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${title} | Monovella`;
  }, [title]);

  return (
    <PublicWebShell surface={title}>
      <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3.5 @lg:px-8">
          <Lockup size="sm" className="shrink-0" />
          <Link
            to="/"
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-label text-base-content/65 transition-colors hover:text-primary"
          >
            <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
            Back to Monovella
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-9 @lg:px-8 @lg:pt-14 mockup:pb-14">
        <div className="grid gap-8 @4xl:grid-cols-[12.5rem_minmax(0,1fr)] @4xl:gap-14">
          <aside className="@4xl:sticky @4xl:top-24 @4xl:self-start">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-base-content/50">
              Legal centre
            </p>
            <nav
              aria-label="Legal documents"
              className="mt-3 flex gap-2 overflow-x-auto pb-1 @4xl:flex-col @4xl:overflow-visible"
            >
              {PAGES.map((page) => {
                const active = pathname === page.to;
                return (
                  <Link
                    key={page.to}
                    to={page.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-brand px-3 text-label transition-colors duration-(--motion-fast)",
                      active
                        ? "bg-primary-tint text-primary"
                        : "text-base-content/65 hover:bg-base-200 hover:text-base-content",
                    )}
                  >
                    <page.icon aria-hidden className="size-4" strokeWidth={1.5} />
                    {page.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 hidden border-t border-base-300 pt-5 @4xl:block">
              <p className="text-label text-base-content/75">Need help?</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-2 inline-flex min-h-11 items-center gap-2 text-body-sm text-primary hover:underline"
              >
                <Mail aria-hidden className="size-3.5" strokeWidth={1.5} />
                {CONTACT_EMAIL}
              </a>
            </div>
          </aside>

          <article className="min-w-0 max-w-3xl">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-primary">
              Monovella legal
            </p>
            <h1 className="mt-3 font-heading text-display @lg:text-[3.25rem]/[1.08]">{title}</h1>
            <p className="mt-2 text-body-sm text-base-content/55">Last updated {LAST_UPDATED}</p>
            <p className="measure mt-5 text-body text-base-content/75 @lg:text-[1.125rem]/[1.6]">
              {intro}
            </p>

            <dl className="mt-8 grid gap-px overflow-hidden rounded-[1.25rem] border border-base-300 bg-base-300 @lg:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="bg-base-200 p-4">
                  <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-base-content/50">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-body-sm text-base-content/80">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="measure mt-10 space-y-10 text-body text-base-content/80">
              {children}
            </div>

            <div className="mt-12 flex flex-col gap-3 border-t border-base-300 pt-6 text-body-sm text-base-content/65 @lg:flex-row @lg:items-center @lg:justify-between">
              <div className="flex flex-wrap gap-x-4">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex min-h-11 items-center gap-2 hover:text-primary"
                >
                  <Mail aria-hidden className="size-3.5" strokeWidth={1.5} />
                  {CONTACT_EMAIL}
                </a>
                <a
                  href="tel:+2349032392234"
                  className="inline-flex min-h-11 items-center gap-2 hover:text-primary"
                >
                  <Phone aria-hidden className="size-3.5" strokeWidth={1.5} />
                  {CONTACT_PHONE}
                </a>
              </div>
              <Link
                to="/"
                className="inline-flex min-h-11 items-center text-primary hover:underline"
              >
                Return to Monovella
              </Link>
            </div>
          </article>
        </div>
      </main>
    </PublicWebShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-h2">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/** Public route: /legal/terms */
export function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms set out the rules for using Monovella. They are written to make our role, your choices and the limits of the service clear before you use it."
      highlights={[
        { label: "Our role", value: "A digital service that helps keep a health story connected." },
        {
          label: "Clinical decisions",
          value: "Made by the qualified professional providing care.",
        },
        {
          label: "Need help?",
          value: "Contact us before relying on the service for an urgent need.",
        },
      ]}
    >
      <Section title="Document status">
        <p>
          Version <span className="font-mono">terms-v0.1-2026-09-04</span>. This pre-build draft is
          available before sign-up acceptance. It still requires review and approval by qualified
          Nigerian counsel before live use.
        </p>
      </Section>
      <Section title="1. Using Monovella">
        <p>
          Monovella helps patients, healthcare professionals, pharmacies and laboratories work from
          clearer context. The service may support finding care, booking, sharing records and
          coordinating the next step. You must provide accurate information, keep your account
          details secure and use the service lawfully and respectfully.
        </p>
      </Section>

      <Section title="2. Care and emergencies">
        <p>
          Monovella does not replace emergency services. If you think you or someone else needs
          urgent help, seek immediate in-person care. Clinical decisions, prescriptions, dispensing
          decisions and laboratory results remain the responsibility of the qualified person or
          premises providing them.
        </p>
      </Section>

      <Section title="3. Your health story">
        <p>
          You decide what information to add and share through Monovella. Use the service only for
          information you are entitled to provide, including when you act for another person. Our
          Privacy Policy explains how personal information is used and the choices available to you.
        </p>
      </Section>

      <Section title="4. Fees and availability">
        <p>
          Where a fee applies, the amount and the party receiving it will be shown before you
          confirm a charge. Availability, cancellations, payment methods and any refund process may
          differ by service; the relevant details will be shown at the point you make a decision.
        </p>
      </Section>

      <Section title="5. Keeping the service safe">
        <p>
          Do not misuse Monovella, interfere with the service, impersonate another person or use it
          to share unlawful, harmful or misleading material. We may restrict access when reasonably
          necessary to protect people, the service or legal obligations, and will explain a material
          restriction where we can.
        </p>
      </Section>

      <Section title="6. Changes and contact">
        <p>
          We may update these terms as Monovella changes. For a material change, we will provide
          notice through the service or by another reasonable means. Questions or complaints can be
          sent to{" "}
          <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          or raised by phone on{" "}
          <a className="text-primary hover:underline" href="tel:+2349032392234">
            {CONTACT_PHONE}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}

/** Public route: /legal/privacy */
export function PrivacyPolicy() {
  return (
    <LegalPage
      title="Data & Privacy Policy"
      intro="Your health story is personal. This policy explains the information Monovella uses, why we use it, the choices available to you and how to contact us about privacy."
      highlights={[
        { label: "What matters", value: "Your identity, contact details and health information." },
        {
          label: "Our approach",
          value: "Use only what is needed for care coordination and service delivery.",
        },
        {
          label: "Your choices",
          value: "Ask questions, correct information and exercise applicable rights.",
        },
      ]}
    >
      <Section title="Document status">
        <p>
          Version <span className="font-mono">privacy-notice-v0.1-2026-09-04</span>. This pre-build
          draft is available before sign-up acceptance. It still requires review and approval by
          qualified Nigerian data-protection and health-sector counsel before live use.
        </p>
      </Section>
      <Section title="1. Information we use">
        <p>
          Depending on how you use Monovella, we may use your identity and contact details, health
          information you choose to add, records connected to your care, communications, payment
          details and technical information needed to keep the service secure and working. We may
          also use professional and business-verification information for care teams.
        </p>
      </Section>

      <Section title="2. Why we use it">
        <p>
          We use information to provide and improve the service, help coordinate care you request,
          maintain your health story, communicate with you, protect people and the platform, meet
          legal obligations and resolve support issues. We do not sell personal information.
        </p>
      </Section>

      <Section title="3. Who may receive information">
        <p>
          Information is shared only where it is needed: with the care professional, pharmacy or
          laboratory involved in a service you choose; with providers that help us run the service;
          and where required by law or necessary to protect people. We require service providers to
          handle information for the agreed purpose and with appropriate safeguards.
        </p>
      </Section>

      <Section title="4. Health data and security">
        <p>
          Health information deserves extra care. We use access controls and other safeguards
          designed to protect information against loss, misuse and unauthorised access. No system is
          completely risk-free, so we continue to review our controls as the service changes.
        </p>
      </Section>

      <Section title="5. Your rights and choices">
        <p>
          Subject to applicable law, you may ask to access or correct your information, object to
          certain processing, withdraw consent where consent is the basis for processing, request
          deletion or portability where applicable, and complain to the relevant data-protection
          authority. We may need to verify a request before acting on it.
        </p>
      </Section>

      <Section title="6. Consent records and memory choices">
        <p>
          Where consent is the basis for a specific action, Monovella records the acting account,
          patient, guardian relationship where relevant, purpose, statement version and time. A
          withdrawal is recorded without erasing earlier evidence or information already shared.
          Removing Teni active memory stops future use of that memory, but operational logs, backups
          and records required by law may remain for a limited period.
        </p>
      </Section>

      <Section title="7. Retention and contact">
        <p>
          We keep information only for as long as needed for the purpose it was collected, including
          care continuity, legal obligations, disputes and security. For a privacy question or
          request, email{" "}
          <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          . We will explain the next step and any information we need from you.
        </p>
      </Section>
    </LegalPage>
  );
}

/** Public route: /legal/cookies */
export function CookiePolicy() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="Cookies and similar technologies help Monovella remember choices, keep the service working and understand what needs improvement. This page explains the choices you have."
      highlights={[
        { label: "Necessary", value: "Keeps the service secure and working as expected." },
        {
          label: "Preferences",
          value: "Remembers choices such as how you prefer the interface to appear.",
        },
        {
          label: "Control",
          value: "You can manage browser storage and any optional choices we present.",
        },
      ]}
    >
      <Section title="1. Necessary technologies">
        <p>
          Some cookies and similar technologies are needed for core functions such as security,
          session management and remembering essential settings. You cannot switch these off through
          Monovella because the service may not work correctly without them.
        </p>
      </Section>

      <Section title="2. Preferences and measurement">
        <p>
          We may use storage to remember preferences and, where offered, optional measurement tools
          to understand whether the service is useful and reliable. We will explain any optional
          technology and provide the appropriate choice before it is used.
        </p>
      </Section>

      <Section title="3. Managing your choices">
        <p>
          You can control cookies and similar storage through your browser settings. Removing or
          blocking necessary storage can affect how Monovella works. If we provide a preference
          centre, it will let you review and change optional choices at any time.
        </p>
      </Section>

      <Section title="4. Changes and contact">
        <p>
          We may update this policy when our use of cookies or similar technology changes. The date
          at the top of the page will show when it was last updated. Questions can be sent to{" "}
          <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
