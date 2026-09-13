import { useState } from "react";
import { ScreenStates } from "~/components/shell/state-switcher";
import { ButtonLink, PageStatus } from "~/components/ui";

export type PageStatusKind = "not-found" | "error" | "loading";

/**
 * The three shared route-status surfaces, in one place so the reviewable states
 * and the real `ErrorBoundary` in `root.tsx` cannot drift apart. Every shell
 * renders the same layout, wording shape and recovery actions; only the home
 * destination and its label change.
 *
 * The states are declared for the prototype bar rather than exposed on the page:
 * an error screen must never ship a control that puts itself into an error.
 */
export function RouteStatus({
  home,
  homeLabel,
  support,
  scope,
}: {
  home: string;
  homeLabel: string;
  /** Where an unresolved error goes for human help, when the shell has one. */
  support?: string;
  /** Names the part of Monovella in the not-found copy, e.g. "the mobile app". */
  scope: string;
}) {
  const [kind, setKind] = useState<PageStatusKind>("not-found");

  return (
    <>
      <ScreenStates
        value={kind}
        onChange={setKind}
        states={[
          { value: "not-found", label: "404 not found" },
          { value: "error", label: "Unexpected error" },
          { value: "loading", label: "Loading" },
        ]}
      />
      {kind === "loading" ? (
        <PageStatus
          kind="loading"
          title="Opening this screen"
          body="Your place is saved while Monovella gets everything ready."
        />
      ) : kind === "error" ? (
        <PageStatus
          kind="error"
          title="We couldn't open this screen"
          body="Something went wrong on our side, not yours. Nothing you were working on was lost."
          action={
            <>
              <ButtonLink to={home}>Try again</ButtonLink>
              <ButtonLink to={home} variant="secondary">
                {homeLabel}
              </ButtonLink>
              {support ? (
                <ButtonLink to={support} variant="ghost">
                  Contact support
                </ButtonLink>
              ) : null}
            </>
          }
        />
      ) : (
        <PageStatus
          kind="not-found"
          title="Screen not found"
          body={`That address doesn't match a screen in ${scope}. No record or queue was changed.`}
          action={<ButtonLink to={home}>{homeLabel}</ButtonLink>}
        />
      )}
    </>
  );
}
