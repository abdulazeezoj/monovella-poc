import { Link } from "react-router";
import { Lockup } from "~/components/shell/logo";
import { PrototypeBar } from "~/components/shell/prototype-bar";
import { SCREEN_COUNT, SCREEN_SECTIONS } from "~/data/screen-manifest";

export function meta() {
  return [{ title: "Every screen: Monovella prototype" }];
}

/** Reference index: every screen in PRODUCT_SCREEN_V0.md and where it lives. */
export default function Screens() {
  const groups = ["Public", "Mobile app", "Web app"] as const;

  return (
    <div className="min-h-dvh bg-base-100">
      <div className="mx-auto w-full max-w-5xl px-5 pb-32 pt-10 sm:px-8">
        <Link to="/tour" aria-label="Back to the prototype tour" className="inline-block">
          <Lockup size="sm" />
        </Link>
        <h1 className="mt-8 font-heading text-h1">Every screen, indexed</h1>
        <p className="measure mt-2 text-body text-base-content/70">
          All {SCREEN_COUNT} entries from <span className="font-mono">PRODUCT_SCREEN_V0.md</span>,
          in the document's own order, each linking to where it lives here. A few are folded into
          another screen because the spec says to. Those are listed with the screen that absorbed
          them rather than dropped.
        </p>

        {groups.map((group) => (
          <section key={group} className="mt-10">
            <h2 className="border-b border-base-300 pb-2 font-heading text-h2">{group}</h2>
            <div className="mt-5 space-y-8">
              {SCREEN_SECTIONS.filter((s) => s.app === group).map((section) => (
                <div key={`${section.key}-${section.audience}`}>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-body-sm text-primary">{section.key}</span>
                    <h3 className="font-heading text-h3">{section.title}</h3>
                    <span className="text-body-sm text-base-content/50">{section.audience}</span>
                  </div>
                  <ul className="grid gap-px overflow-hidden rounded-brand border border-base-300 bg-base-300 sm:grid-cols-2 lg:grid-cols-3">
                    {section.screens.map((screen) => (
                      <li
                        key={`${section.key}-${screen.id}-${screen.name}`}
                        className="bg-base-100"
                      >
                        {screen.path ? (
                          <Link
                            to={screen.path}
                            className="flex h-full min-h-[3.25rem] items-baseline gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-base-200"
                          >
                            <span className="w-12 shrink-0 font-mono text-body-sm tabular text-primary">
                              {screen.id}
                            </span>
                            <span className="min-w-0 flex-1 text-body-sm">
                              {screen.name}
                              {screen.note ? (
                                <span className="block text-base-content/50">{screen.note}</span>
                              ) : null}
                            </span>
                          </Link>
                        ) : (
                          <div className="flex min-h-[3.25rem] items-baseline gap-2.5 px-3.5 py-2.5 text-base-content/40">
                            <span className="w-12 shrink-0 font-mono text-body-sm">
                              {screen.id}
                            </span>
                            <span className="flex-1 text-body-sm">{screen.name}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <PrototypeBar surface="Screen index" />
    </div>
  );
}
