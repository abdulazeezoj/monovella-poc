import { Lockup } from "~/components/shell/logo";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { ButtonLink } from "~/components/ui";

/** P1 — Welcome / Get Started. */
export default function Welcome() {
  return (
    <MobileScreen tabs="none">
      <div
        data-screen="P1"
        className="flex min-h-full flex-col py-1 @lg:grid @lg:min-h-[58rem] @lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.95fr)]"
      >
        <section className="flex flex-col @lg:order-2 @lg:p-10">
          <Lockup size="md" />
          <div className="mt-8">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-primary">
              One whole health story
            </p>
            {/* The one screen where --text-display is licensed to appear. */}
            <h1 className="mt-2 max-w-[14ch] font-heading text-display leading-[1.1] @lg:max-w-[11ch] @lg:text-[3rem]">
              See a specialist without losing a day.
            </h1>
            <p className="measure mt-4 max-w-[39ch] text-body text-base-content/75 @lg:text-[1.125rem]/[1.55]">
              Find care around your day, then keep the important parts of your health story together
              for the next conversation.
            </p>
          </div>

          <div className="mt-auto pt-6">
            <ButtonLink to="/app/sign-up" size="lg" full>
              Create ID
            </ButtonLink>
            <p className="mt-3 text-center text-body-sm text-base-content/70">
              Already have an account?{" "}
              <ButtonLink to="/app/sign-in" variant="ghost" size="md" className="px-1 text-primary">
                Sign in
              </ButtonLink>
            </p>
          </div>
        </section>

        <figure className="mt-6 overflow-hidden rounded-brand-lg border border-base-300 bg-base-200 shadow-folio @lg:order-1 @lg:mt-0 @lg:flex @lg:min-h-0 @lg:flex-col @lg:rounded-none @lg:border-0 @lg:bg-transparent @lg:shadow-none">
          <img
            src="/marketing/patient-home-lagos.png"
            alt="A woman at home reviewing health information on her phone."
            className="aspect-[5/3] w-full object-cover object-[52%_43%] @lg:hidden"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <img
            src="/marketing/hero-patient-balanced.png"
            alt="A woman at home reviewing health information on her phone."
            className="hidden @lg:block @lg:h-0 @lg:min-h-0 @lg:flex-1 @lg:w-full @lg:object-cover @lg:object-center"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <figcaption className="border-t border-base-300 px-4 py-3 text-body-sm text-base-content/80 @lg:border-t-0 @lg:px-0 @lg:py-4">
            Your health story, whole and in your hands.
          </figcaption>
        </figure>
      </div>
    </MobileScreen>
  );
}
