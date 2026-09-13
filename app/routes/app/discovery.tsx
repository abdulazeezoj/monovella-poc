import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Mic,
  Search,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  AvailabilityBadge,
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  DataRow,
  EmptyState,
  Field,
  InlineLoading,
  Input,
  PageFooter,
  SearchablePicker,
  SegmentedControl,
  Sheet,
  Textarea,
} from "~/components/ui";
import { reference } from "~/data";
import {
  accountCanManagePatient,
  availabilityFor,
  EXPERT_ID,
  expertAcceptsNewWork,
  expertAvailabilityStatus,
  expertById,
  expertName,
  filterExperts,
  patientById,
  scheduleFor,
  schedulingRulesFor,
} from "~/data/selectors";
import type { ExpertRead, Specialty } from "~/data/types";
import { now } from "~/lib/clock";
import { cn } from "~/lib/cn";
import { EMERGENCY_GUIDANCE, isPossibleEmergency } from "~/lib/emergency";
import {
  credentialTierLabel,
  DAY_NAMES,
  formatDateLong,
  formatSlotLabel,
  formatTime,
  genderLabel,
  naira,
  platformFee,
  professionalTypeLabel,
  specialtyLabel,
} from "~/lib/format";
import { usePagedList } from "~/lib/paged-list";
import { usePrototype } from "~/store/prototype";

type MatchState =
  | "default"
  | "recording"
  | "transcript"
  | "matched"
  | "ambiguous"
  | "fallback"
  | "emergency"
  | "mic_denied"
  | "too_short"
  | "transcription_failed"
  | "rate_limited";

const VOICE_SAMPLE =
  "I've had dark patches on my cheeks for about six months and a cream I bought made it worse";

/**
 * P35 — Tell Us What's Going On. Complaint → a *kind of specialist*, never a
 * condition, cause or treatment. Only the matched specialty crosses the handoff
 * into P36; the complaint text stays clinical narrative.
 */
export function TellUsWhatsGoingOn() {
  const { session, setBookingDraft } = usePrototype();
  const [state, setState] = useState<MatchState>("default");
  const [mode, setMode] = useState<"TEXT" | "VOICE">("TEXT");
  const [text, setText] = useState("");
  const [matchedSpecialty, setMatchedSpecialty] = useState<Specialty>("DERMATOLOGY");
  useEffect(() => {
    if (state !== "rate_limited") return;
    const retry = window.setTimeout(
      () => setState(mode === "VOICE" ? "transcript" : "default"),
      30_000,
    );
    return () => window.clearTimeout(retry);
  }, [state, mode]);

  const run = () => {
    const summary = text.trim();
    if (!summary) return;
    if (isPossibleEmergency(summary)) {
      setBookingDraft(null);
      setState("emergency");
      return;
    }
    // Emergency guidance is local and must remain available during throttling.
    if (state === "rate_limited") return;

    setBookingDraft({
      patientId: session.viewingPatientId,
      requestSummary: summary,
      source: mode,
    });
    const t = summary.toLowerCase();
    if (/\b(?:skin|rash(?:es)?|pigment(?:ation)?|acne|dark patch(?:es)?)\b/.test(t)) {
      setMatchedSpecialty("DERMATOLOGY");
      setState("matched");
    } else if (/\b(?:periods?|menstrua\w*|pregnan\w*|gynaec\w*|gynec\w*)\b/.test(t)) {
      setMatchedSpecialty("OBSTETRICS_GYNECOLOGY");
      setState("matched");
    } else if (/\b(?:tired|dizzy|weight)\b/.test(t)) {
      setState("ambiguous");
    } else {
      setState("fallback");
    }
  };

  return (
    <MobileScreen title="What's going on?" back="/app" patientContext>
      <div data-screen="P35" className="space-y-4">
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "recording", label: "Recording" },
            { value: "mic_denied", label: "Mic denied" },
            { value: "too_short", label: "Too short" },
            { value: "transcription_failed", label: "Transcription failed" },
            { value: "transcript", label: "Transcript" },
            { value: "matched", label: "One match" },
            { value: "ambiguous", label: "Ambiguous" },
            { value: "fallback", label: "No match" },
            { value: "emergency", label: "Emergency" },
            { value: "rate_limited", label: "429 too many attempts" },
          ]}
          value={state}
          onChange={(next) => {
            if (next === "transcript" && !text) setText(VOICE_SAMPLE);
            setState(next);
          }}
        />

        {state === "emergency" ? (
          <>
            <div className="rounded-brand-lg border-2 border-error bg-error-tint p-5">
              <AlertTriangle aria-hidden className="size-8 text-error" strokeWidth={1.5} />
              <h2 className="mt-3 font-heading text-h1 leading-tight text-error">
                Get help in person now
              </h2>
              <p className="measure mt-3 text-body text-base-content/85">{EMERGENCY_GUIDANCE}</p>
            </div>
            <Button variant="ghost" full onClick={() => setState("transcript")}>
              That's not what I meant. Go back
            </Button>
          </>
        ) : (
          <>
            <p className="measure text-body text-base-content/75">
              Describe it however you'd say it out loud. We'll point you at the right kind of
              specialist. That's all this does. It never tells you what's wrong.
            </p>

            {state === "rate_limited" ? (
              <Banner tone="warning">
                Specialty matching is temporarily busy. Your words are kept here. Try again in 30
                seconds. Emergency guidance is still available.
              </Banner>
            ) : null}
            <SegmentedControl
              label="How to describe it"
              value={mode}
              onChange={(v) => {
                setMode(v);
                if (state !== "rate_limited") setState(v === "VOICE" ? "recording" : "default");
              }}
              options={[
                { value: "TEXT", label: "Type it" },
                { value: "VOICE", label: "Say it", disabled: state === "rate_limited" },
              ]}
            />

            {mode === "VOICE" && state === "recording" ? (
              <Card className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-content">
                  <Mic aria-hidden className="size-7" strokeWidth={1.5} />
                </div>
                <p className="mt-3 font-mono text-h2 tabular">0:12</p>
                <p className="mt-1 text-body-sm text-base-content/60">Listening…</p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="secondary"
                    full
                    onClick={() => {
                      setMode("TEXT");
                      setText("");
                      setState("default");
                    }}
                  >
                    <X aria-hidden className="size-4" strokeWidth={1.5} />
                    Discard
                  </Button>
                  <Button
                    full
                    onClick={() => {
                      setText(VOICE_SAMPLE);
                      setState("transcript");
                    }}
                  >
                    <Square aria-hidden className="size-4" strokeWidth={2} />
                    Stop
                  </Button>
                </div>
              </Card>
            ) : null}

            {state === "mic_denied" ? (
              <>
                <Banner tone="warning">
                  Monovella doesn't have permission to use your microphone. Nothing was recorded.
                </Banner>
                <Button
                  variant="secondary"
                  full
                  onClick={() => {
                    setMode("TEXT");
                    setState("default");
                  }}
                >
                  Type instead
                </Button>
              </>
            ) : null}
            {state === "too_short" ? (
              <>
                <Banner tone="warning">That was too short to make out. Nothing was sent.</Banner>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setState("recording")}>
                    Record again
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMode("TEXT");
                      setState("default");
                    }}
                  >
                    Type instead
                  </Button>
                </div>
              </>
            ) : null}
            {state === "transcription_failed" ? (
              <Card>
                <p className="font-heading text-h3">We couldn't make out that recording</p>
                <p className="measure mt-1.5 text-body-sm text-base-content/70">
                  The recording is still here in this prototype. Try the transcript again, record
                  again, or type instead. Nothing was sent.
                </p>
                <div className="mt-3 grid gap-2">
                  <Button
                    onClick={() => {
                      setText(VOICE_SAMPLE);
                      setState("transcript");
                    }}
                  >
                    Try transcript again
                  </Button>
                  <Button variant="secondary" onClick={() => setState("recording")}>
                    Record again
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMode("TEXT");
                      setState("default");
                    }}
                  >
                    Type instead
                  </Button>
                </div>
              </Card>
            ) : null}
            {state === "transcript" ? (
              <Banner tone="info">
                Here's what we heard. Fix anything that's wrong before you send it. You're the one
                who knows what you meant.
              </Banner>
            ) : null}

            {mode === "TEXT" ||
            state === "transcript" ||
            state === "rate_limited" ||
            state === "mic_denied" ||
            state === "too_short" ? (
              <Field label="In your own words">
                {(p) => (
                  <Textarea
                    {...p}
                    value={state === "transcript" && !text ? VOICE_SAMPLE : text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (["matched", "ambiguous", "fallback"].includes(state)) setState("default");
                    }}
                    placeholder="For example: dark patches on my face that got worse after a cream"
                  />
                )}
              </Field>
            ) : null}

            {state === "matched" ? (
              <Card className="border-l-[3px] border-l-primary">
                <p className="text-body-sm text-base-content/60">Matched to</p>
                <p className="mt-1 font-heading text-h2">{specialtyLabel(matchedSpecialty)}</p>
                <p className="measure mt-2 text-body-sm text-base-content/70">
                  This is a routing suggestion, not a diagnosis. You can browse other specialties
                  too.
                </p>
                <ButtonLink to={`/app/experts?specialty=${matchedSpecialty}`} full className="mt-4">
                  {matchedSpecialty === "DERMATOLOGY" ? "See dermatologists" : "See specialists"}
                </ButtonLink>
              </Card>
            ) : null}

            {state === "ambiguous" ? (
              <Card>
                <p className="text-body-sm text-base-content/60">This could fit a few</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["ENDOCRINOLOGY", "GENERAL_PRACTICE", "CARDIOLOGY"] as Specialty[]).map((s) => (
                    <Link key={s} to={`/app/experts?specialty=${s}`}>
                      <Chip kind="suggestion">{specialtyLabel(s)}</Chip>
                    </Link>
                  ))}
                </div>
                <p className="measure mt-3 text-body-sm text-base-content/65">
                  Pick whichever sounds closest. You can change it on the next screen.
                </p>
              </Card>
            ) : null}

            {state === "fallback" ? (
              <Card>
                <p className="font-heading text-h3">Start with General Practice</p>
                <p className="measure mt-1.5 text-body-sm text-base-content/70">
                  Nothing here points at one specialty clearly, and that's normal. A GP is the right
                  first stop and will say if you need someone more specific.
                </p>
                <ButtonLink to="/app/experts?specialty=GENERAL_PRACTICE" full className="mt-4">
                  See GPs
                </ButtonLink>
              </Card>
            ) : null}

            {["default", "transcript", "mic_denied", "too_short", "rate_limited"].includes(
              state,
            ) ? (
              <Button full disabled={!text && state !== "transcript"} onClick={run}>
                Find specialist
              </Button>
            ) : null}

            {/* Always visible, never buried. */}
            <ButtonLink to="/app/experts" variant="ghost" full>
              All specialists
            </ButtonLink>
          </>
        )}
      </div>
    </MobileScreen>
  );
}

/**
 * P36 — Browse Experts. Sort order is the whole design: soonest available by
 * default, price either way, and nothing else. No "recommended", no promoted
 * placement, now or later.
 */
/** Stable identity for paging: the row, not its position in the list. */
function expertKey(expert: { id: string }) {
  return expert.id;
}

export function BrowseExperts() {
  const { data } = usePrototype();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<"populated" | "loading" | "filtered_empty" | "next_page_failed">(
    "populated",
  );
  const [sheet, setSheet] = useState<null | "specialty" | "filters">(null);
  const [sort, setSort] = useState<"SOONEST_AVAILABLE" | "FEE_ASC" | "FEE_DESC">(
    "SOONEST_AVAILABLE",
  );
  const [maxFee, setMaxFee] = useState<number | null>(null);
  const [gender, setGender] = useState<ExpertRead["gender"] | null>(null);
  const [state, setState] = useState<string | null>(null);

  const query = params.get("q") ?? "";
  const specialty = (params.get("specialty") as Specialty | null) ?? null;

  const results = useMemo(() => {
    if (view === "filtered_empty") return [];
    return filterExperts(data, {
      specialty,
      maxFeeKobo: maxFee,
      gender,
      state,
      sort,
      // Patient and Expert are one account. Without this, the directory offers
      // Amara a consultation with herself.
      excludeExpertId: EXPERT_ID,
    }).filter((expert) =>
      [expertName(data, expert.id), specialtyLabel(expert.specialty), expert.state]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    );
  }, [data, specialty, query, maxFee, gender, state, sort, view]);

  // A directory of nineteen on one phone page hid the boundary states the API
  // actually has. Changing any filter starts a new list rather than appending.
  const page = usePagedList(results, expertKey, {
    pageSize: 6,
    resetKey: [specialty, query, maxFee, gender, state, sort].join("|"),
    failNext: view === "next_page_failed",
  });

  const activeFilters = [
    query.trim() ? { key: "q", label: query.trim() } : null,
    specialty ? { key: "specialty", label: specialtyLabel(specialty) } : null,
    maxFee ? { key: "maxFee", label: `Under ${naira(maxFee)}` } : null,
    gender ? { key: "gender", label: genderLabel[gender] } : null,
    state ? { key: "state", label: state } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  const clear = (key: string) => {
    if (key === "specialty" || key === "q") {
      const next = new URLSearchParams(params);
      next.delete(key);
      setParams(next);
    }
    if (key === "maxFee") setMaxFee(null);
    if (key === "gender") setGender(null);
    if (key === "state") setState(null);
  };

  return (
    <MobileScreen
      title="Choose a specialist"
      back="/app"
      patientContext
      action={
        <Button size="sm" variant="secondary" onClick={() => setSheet("filters")}>
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
          Filter
        </Button>
      }
    >
      <div data-screen="P36" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "loading", label: "Loading" },
            { value: "filtered_empty", label: "Filtered to nothing" },
            { value: "next_page_failed", label: "Next page failed" },
          ]}
          value={view}
          onChange={setView}
        />

        <Field label="Search specialists">
          {(props) => (
            <Input
              {...props}
              type="search"
              placeholder="Name, specialty or state"
              value={query}
              onChange={(event) => {
                const next = new URLSearchParams(params);
                if (event.target.value) next.set("q", event.target.value);
                else next.delete("q");
                setParams(next, { replace: true });
              }}
            />
          )}
        </Field>
        {activeFilters.length ? (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((f) => (
              <Chip key={f.key} kind="filter" onRemove={() => clear(f.key)}>
                {f.label}
              </Chip>
            ))}
            {activeFilters.length > 1 ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setParams(new URLSearchParams());
                  setMaxFee(null);
                  setGender(null);
                  setState(null);
                }}
              >
                Clear all
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSheet("specialty")}>
            <Search aria-hidden className="size-4" strokeWidth={1.5} />
            {specialty ? specialtyLabel(specialty) : "Any specialty"}
          </Button>
          <SegmentedControl
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "SOONEST_AVAILABLE", label: "Soonest" },
              { value: "FEE_ASC", label: "₦ low" },
              { value: "FEE_DESC", label: "₦ high" },
            ]}
          />
        </div>

        <p className="text-body-sm text-base-content/60">
          Fees below are each expert's own. Monovella's service fee is added on top: 20%, never more
          than {naira(300000)}. It supports the secure booking and connected record around the
          visit.
        </p>

        {view === "loading" ? <InlineLoading label="Finding specialists" /> : null}

        {view !== "loading" && !results.length ? (
          <EmptyState
            icon={SearchX}
            title={
              specialty
                ? `No ${specialtyLabel(specialty).toLowerCase()} matches these filters`
                : "Nothing matches these filters"
            }
            body={
              maxFee
                ? `No ${specialty ? specialtyLabel(specialty).toLowerCase() : "specialist"} under ${naira(maxFee)} has an opening this week. Try raising the price, or looking further out.`
                : "Try widening the narrowest filter, or clear them all and start again."
            }
            action={
              <div className="flex flex-wrap gap-2">
                {maxFee ? (
                  <Button variant="secondary" onClick={() => setMaxFee(null)}>
                    Remove the price limit
                  </Button>
                ) : null}
                <Button
                  onClick={() => {
                    setParams(new URLSearchParams());
                    setMaxFee(null);
                    setGender(null);
                    setState(null);
                    setView("populated");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            }
          />
        ) : null}

        {view !== "loading" && results.length ? (
          <>
            <ul className="space-y-3 @2xl:grid @2xl:grid-cols-2 @2xl:gap-3 @2xl:space-y-0">
              {page.rows.map((e) => (
                <li key={e.id}>
                  <ExpertCard expert={e} />
                </li>
              ))}
            </ul>
            <PageFooter
              nextCursor={page.nextCursor}
              loading={page.loading}
              error={page.error}
              onLoadMore={page.loadMore}
              onRetry={page.retry}
              shown={page.rows.length}
              total={page.total}
              moreLabel="Show more specialists"
              endLabel="That's every specialist matching these filters"
            />
          </>
        ) : null}
      </div>

      <Sheet open={sheet === "specialty"} onClose={() => setSheet(null)} title="Specialty">
        <SearchablePicker
          items={[
            { value: "", label: "Any specialty", blurb: "Show everyone" },
            ...reference.specialties,
          ]}
          value={specialty ?? ""}
          getKey={(s) => s.value}
          getLabel={(s) => s.label}
          getMeta={(s) => s.blurb}
          placeholder="Search 18 specialties"
          onSelect={(s) => {
            const next = new URLSearchParams(params);
            if (s.value) next.set("specialty", s.value);
            else next.delete("specialty");
            setParams(next);
            setSheet(null);
          }}
        />
      </Sheet>

      <Sheet
        open={sheet === "filters"}
        onClose={() => setSheet(null)}
        title="Narrow the list"
        footer={
          <Button full onClick={() => setSheet(null)}>
            Show {results.length} specialists
          </Button>
        }
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-label font-medium">Their fee is under</p>
            <div className="flex flex-wrap gap-2">
              {[500000, 1000000, 1500000, 2000000].map((v) => (
                <Chip
                  key={v}
                  selected={maxFee === v}
                  onClick={() => setMaxFee(maxFee === v ? null : v)}
                >
                  {naira(v)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-label font-medium">Gender</p>
            <div className="flex flex-wrap gap-2">
              {(["FEMALE", "MALE"] as const).map((g) => (
                <Chip
                  key={g}
                  selected={gender === g}
                  onClick={() => setGender(gender === g ? null : g)}
                >
                  {genderLabel[g]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-label font-medium">Based in</p>
            <p className="measure mb-2 text-body-sm text-base-content/60">
              An attribute, not a distance: useful for language or a lab they might recommend. It's
              never applied for you.
            </p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(data.experts.map((expert) => expert.state))].sort().map((s) => (
                <Chip
                  key={s}
                  selected={state === s}
                  onClick={() => setState(state === s ? null : s)}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
    </MobileScreen>
  );
}

function ExpertCard({ expert }: { expert: ExpertRead }) {
  const { data } = usePrototype();
  const fee = expert.consultation_fee_kobo;
  const status = expertAvailabilityStatus(data, expert.id);
  const acceptsNewWork = expertAcceptsNewWork(data, expert.id);
  return (
    <Link
      to={`/app/experts/${expert.id}`}
      className="block rounded-brand border border-base-300 bg-base-200 p-4 transition-colors hover:border-primary/40"
    >
      {/* The card leads with the next open slot — the question a patient
          scanning this list is actually asking. */}
      <p
        className={cn(
          "text-label",
          acceptsNewWork && expert.next_available_start ? "text-primary" : "text-base-content/50",
        )}
      >
        {acceptsNewWork && expert.next_available_start
          ? `Next available ${formatSlotLabel(expert.next_available_start)}`
          : acceptsNewWork
            ? "No upcoming times"
            : "Not taking new bookings"}
      </p>
      <p className="mt-1 font-heading text-h3">
        {expert.professional_type === "DOCTOR" ? "Dr. " : ""}
        {expert.first_name} {expert.last_name}
      </p>
      <p className="text-body-sm text-base-content/65">
        {specialtyLabel(expert.specialty)} · {professionalTypeLabel[expert.professional_type]}
        {expert.state ? ` · ${expert.state}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <AvailabilityBadge status={status} />
        <p className="text-right">
          <span className="font-mono text-data">{naira(fee)}</span>
          <span className="block text-body-sm text-base-content/55">
            + {naira(platformFee(fee))} Monovella fee
          </span>
        </p>
      </div>
    </Link>
  );
}

/** P37 — Expert Profile. Booking preconditions surface here, not at P39. */
export function ExpertProfile() {
  const { id } = useParams();
  const { data, session, toast } = usePrototype();
  const [notified, setNotified] = useState(false);
  const [precondition, setPrecondition] = useState<"none" | "unverified" | "checkout_unavailable">(
    "none",
  );
  const expert = expertById(data, id ?? "");
  const patient = patientById(data, session.viewingPatientId)!;
  const bookableCredentials = expert?.credentials.filter(
    (credential) => credential.verification_status === "VERIFIED" && !credential.retired_at,
  );
  const multiTier = (bookableCredentials?.length ?? 0) > 1;
  const [credentialId, setCredentialId] = useState<string | null>(null);

  if (!expert) {
    return (
      <MobileScreen title="Expert" back="/app/experts" patientContext>
        <EmptyState
          title="Expert not found"
          body="They may no longer be practising on Monovella."
        />
      </MobileScreen>
    );
  }

  // Patient and Expert are one account with a switchable context, so a copied
  // link could otherwise open a booking with yourself. No clinician consults
  // with themselves, and hiding the row from the directory is not the rule.
  if (expert?.id === EXPERT_ID) {
    return (
      <MobileScreen title="Expert" back="/app/experts" patientContext>
        <EmptyState
          title="This is your own practice"
          body="You cannot book a consultation with yourself. Switch to your expert workspace to see your own profile as patients do."
          action={
            <>
              <ButtonLink to="/app/expert">My practice</ButtonLink>
              <ButtonLink to="/app/experts" variant="secondary">
                Find another
              </ButtonLink>
            </>
          }
        />
      </MobileScreen>
    );
  }

  if (!bookableCredentials?.length) {
    return (
      <MobileScreen title={expertName(data, expert.id)} back="/app/experts" patientContext>
        <EmptyState
          title="This expert is not bookable yet"
          body="Monovella is reviewing their professional details. Please choose another verified expert."
          action={<ButtonLink to="/app/experts">Browse experts</ButtonLink>}
        />
      </MobileScreen>
    );
  }

  const credential =
    bookableCredentials.find((candidate) => candidate.id === credentialId) ??
    bookableCredentials[0];
  const status = expertAvailabilityStatus(data, expert.id);
  const acceptsNewWork = expertAcceptsNewWork(data, expert.id);
  const slots = availabilityFor(data, expert.id);
  const schedule = scheduleFor(data, expert.id);
  const schedulingRules = schedulingRulesFor(data, expert.id);
  const hasSlots = acceptsNewWork && slots.length > 0;
  const needsVerify = precondition === "unverified" || patient.status !== "VERIFIED";
  const checkoutUnavailable = precondition === "checkout_unavailable";
  const bookHref = `/app/experts/${expert.id}/book${credentialId ? `?credential=${credentialId}` : ""}`;

  return (
    <MobileScreen title={expertName(data, expert.id)} back="/app/experts" patientContext>
      <div data-screen="P37" className="space-y-4">
        <ScreenStates
          states={[
            { value: "none", label: "Ready to book" },
            { value: "unverified", label: "403 verify ID" },
            { value: "checkout_unavailable", label: "503 checkout unavailable" },
          ]}
          value={precondition}
          onChange={setPrecondition}
        />

        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success" icon={ShieldCheck}>
              Verified by Monovella
            </Badge>
            <AvailabilityBadge status={status} />
          </div>
          <p className="mt-3 font-heading text-h2">{expertName(data, expert.id)}</p>
          <p className="text-body-sm text-base-content/65">
            {specialtyLabel(credential.specialty)} ·{" "}
            {professionalTypeLabel[expert.professional_type]}
          </p>
          <p className="measure mt-3 text-body text-base-content/80">{expert.bio}</p>
          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow label="Licence" value={expert.licence_number ?? "Not on file"} />
            <DataRow
              label="Years practising"
              value={String(expert.years_practising ?? "Not on file")}
            />
            <DataRow label="Based in" value={expert.state ?? "Not on file"} mono={false} />
          </dl>
        </Card>

        {multiTier ? (
          <Card>
            <p className="font-heading text-h3">Choose the kind of visit</p>
            <p className="measure mt-1 text-body-sm text-base-content/65">
              {expert.first_name} holds more than one credential. Pick which one this visit is for,
              since each has its own fee.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {bookableCredentials.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCredentialId(c.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-brand border px-4 py-3 text-left transition-colors",
                    credentialId === c.id
                      ? "border-primary bg-primary-tint"
                      : "border-base-300 bg-base-100 hover:border-primary/40",
                  )}
                >
                  <span>
                    <span className="block text-label font-medium">
                      {credentialTierLabel[c.tier]}
                    </span>
                    <span className="block text-body-sm text-base-content/60">
                      {specialtyLabel(c.specialty)}
                    </span>
                  </span>
                  <span className="font-mono text-data tabular">
                    {naira(c.consultation_fee_kobo)}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <p className="font-heading text-h3">What you'll pay</p>
          <dl className="mt-2 divide-y divide-base-300">
            <DataRow
              label="Their consultation fee"
              value={naira(credential.consultation_fee_kobo)}
            />
            <DataRow
              label="Monovella service fee"
              value={naira(platformFee(credential.consultation_fee_kobo))}
            />
          </dl>
          <p className="measure mt-2 text-body-sm text-base-content/65">
            You pay one transparent total at secure checkout. The service fee covers the Monovella
            layer around the visit: secure booking, your connected record and support if plans
            change. A failed booking starts a refund of the full checkout total; you can track its
            progress in your payment details.
          </p>
        </Card>

        {!acceptsNewWork ? (
          <Card>
            <p className="font-heading text-h3">Not taking new bookings</p>
            <p className="measure mt-1.5 text-body-sm text-base-content/70">
              {expert.first_name} is out of office. Existing appointments are unchanged, but start a
              new consultation with another verified expert.
            </p>
            <ButtonLink className="mt-3" to="/app/experts" full>
              Choose another
            </ButtonLink>
          </Card>
        ) : hasSlots ? (
          needsVerify ? (
            <ButtonLink
              to={patient.is_dependant ? `/app/dependants/${patient.id}/verify` : "/app/verify-id"}
              full
            >
              <ShieldCheck aria-hidden className="size-4" strokeWidth={1.5} />
              {patient.is_dependant
                ? `Verify ${patient.first_name ?? "this dependant"}'s ID to request`
                : "Verify your ID to request"}
            </ButtonLink>
          ) : checkoutUnavailable ? (
            <Button full disabled>
              Checkout unavailable
            </Button>
          ) : multiTier && !credentialId ? (
            <Button full disabled>
              Choose type
            </Button>
          ) : (
            <ButtonLink to={bookHref} full>
              See available times: next {formatSlotLabel(slots[0].start)}
              <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
            </ButtonLink>
          )
        ) : (
          <>
            <Banner tone="info">
              {expert.first_name} hasn't published any upcoming hours. That's different from being
              away. There's nothing to book into right now.
            </Banner>
            <Button
              full
              variant="secondary"
              disabled={notified}
              onClick={() => {
                setNotified(true);
                toast("We'll let you know when they publish hours.");
              }}
            >
              {notified ? "We'll notify you" : "Notify me when they're available"}
            </Button>
          </>
        )}

        {checkoutUnavailable ? (
          <Banner tone="warning">
            Monovella's checkout is unavailable right now. A saved card is optional; you can use
            card or bank transfer when checkout returns.
          </Banner>
        ) : null}

        {status === "AWAY" ? (
          <Banner tone="warning">
            {expert.first_name} is away. The dated slots above are still bookable, but their reply
            may take longer.
          </Banner>
        ) : null}

        {schedule.length ? (
          <Card>
            <p className="font-heading text-h3">A normal week</p>
            <p className="measure mt-1 text-body-sm text-base-content/60">
              {schedulingRules
                ? `${schedulingRules.appointment_duration_minutes}-minute visits with a ${schedulingRules.buffer_minutes}-minute buffer. Pick an actual date on the next screen.`
                : "The hours they usually work. Pick an actual date on the next screen."}
            </p>
            <table className="mt-3 w-full">
              <tbody className="divide-y divide-base-300">
                {schedule.map((slot) => (
                  <tr key={slot.id}>
                    <th
                      scope="row"
                      className="py-2 text-left text-body-sm font-normal text-base-content/70"
                    >
                      {DAY_NAMES[slot.day_of_week]}
                    </th>
                    <td className="py-2 text-right font-mono text-data tabular">
                      {slot.start_time}-{slot.end_time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P38 — Add & Verify a Card. */
export function AddCard() {
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const card =
    data.paymentMethods.find((method) => method.id === savedId) ?? data.paymentMethods[0];
  const [status, setStatus] = useState<"none" | "confirming" | "verified" | "failed" | "conflict">(
    data.paymentMethods.length && !params.has("add") ? "verified" : "none",
  );

  useEffect(() => {
    if (!verifying || status !== "confirming") return;
    const timer = window.setTimeout(() => {
      const id = crypto.randomUUID();
      update((draft) => {
        draft.paymentMethods.push({
          id,
          brand: "Verve",
          last4: "7723",
          expiry_month: 11,
          expiry_year: 2030,
          verified_at: now().toISOString(),
        });
      });
      setSavedId(id);
      setVerifying(false);
      setStatus("verified");
      toast("Demo card verified and saved.");
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [verifying, status, update, toast]);

  return (
    <MobileScreen title="Save a card" back tabs="none">
      <div data-screen="P38" className="space-y-4">
        <ScreenStates
          states={[
            { value: "none", label: "No card" },
            { value: "confirming", label: "CONFIRMING" },
            { value: "verified", label: "VERIFIED" },
            { value: "failed", label: "FAILED" },
            { value: "conflict", label: "409 in progress" },
          ]}
          value={status}
          onChange={(next) => {
            setVerifying(false);
            setStatus(next);
          }}
        />

        <p className="text-body-sm text-base-content/65">
          Demo verification. No card details are collected and no money moves.
        </p>
        {status === "verified" ? (
          <>
            <div className="flex items-center gap-3 rounded-brand border border-base-300 bg-base-200 px-4 py-3">
              <CreditCard aria-hidden className="size-5 text-base-content/50" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-body-sm font-medium">
                  {card?.brand ?? "Verve"} ···· {card?.last4 ?? "4412"}
                </p>
                <p className="font-mono text-body-sm text-base-content/55">
                  Expires {String(card?.expiry_month ?? 9).padStart(2, "0")}/
                  {card?.expiry_year ?? 2029}
                </p>
              </div>
              <Badge tone="success">Verified</Badge>
            </div>
            <Button full onClick={() => setStatus("none")}>
              Add another card
            </Button>
            <Button variant="secondary" full onClick={() => navigate(-1)}>
              Done
            </Button>
          </>
        ) : (
          <>
            <p className="measure text-body text-base-content/75">
              A saved card is optional. It can make a future Monovella checkout quicker, and bank
              transfer remains available at checkout. The full provider price and service fee are
              shown together before you pay.
            </p>
            <Card>
              <p className="font-heading text-h3">Before you tap through</p>
              <p className="measure mt-1.5 text-body-sm text-base-content/75">
                We'll send you to a secure Nomba-hosted page. Monovella never sees your card number.
                We charge <span className="font-mono">{naira(10000)}</span> to check the card works,
                then automatically start the refund; your card issuer may take a few days to show
                it.
              </p>
            </Card>

            {status === "confirming" ? (
              <>
                <div className="skeleton h-16 w-full rounded-brand" aria-hidden />
                <p className="text-body-sm text-base-content/70">
                  Confirming your card… If your bank alerts you about a{" "}
                  <span className="font-mono">{naira(10000)}</span> charge, that's this check. Its
                  refund is already on the way.
                </p>
              </>
            ) : null}

            {status === "failed" ? (
              <Banner tone="error">
                That card couldn't be verified. Nothing was charged. Try again or use another card.
              </Banner>
            ) : null}
            {status === "conflict" ? (
              <Banner tone="warning">
                A card verification is already in progress. Wait a moment and try again.
              </Banner>
            ) : null}

            <Button
              full
              disabled={status === "confirming" || status === "conflict"}
              onClick={() => {
                setStatus("confirming");
                setVerifying(true);
              }}
            >
              Continue to Nomba
            </Button>
          </>
        )}
      </div>
    </MobileScreen>
  );
}

/** P39 — Pick a Time & Book. Chronological, and nothing else. */
/**
 * "Today" / "Tomorrow" for the two days a patient actually plans around.
 * Returns null past that, where a weekday and date read better than "in 4 days".
 */
function dayAnchor(day: string) {
  const today = now();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  if (day === key(today)) return "Today";
  if (day === key(new Date(today.getTime() + 86_400_000))) return "Tomorrow";
  return null;
}

export function BookSlot() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { data, session, bookingDraft, setBookingDraft, update, toast, nextId } = usePrototype();
  const [bookingPatientId] = useState(session.viewingPatientId);
  const navigate = useNavigate();
  const pendingCheckout = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (pendingCheckout.current !== null) window.clearTimeout(pendingCheckout.current);
    },
    [],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<
    "none" | "taken" | "checkout_unavailable" | "checkout_failed" | "not_accepting" | "emergency"
  >("none");
  const [checkoutMethod, setCheckoutMethod] = useState<"CARD" | "TRANSFER">("CARD");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "confirming">("idle");
  const [showAllTimes, setShowAllTimes] = useState(false);
  const [requestSummary, setRequestSummary] = useState(
    bookingDraft?.patientId === session.viewingPatientId ? bookingDraft.requestSummary : "",
  );
  const summaryLength = requestSummary.trim().length;
  const summaryError =
    summaryLength > 0 && summaryLength < 10
      ? "Add a little more detail so the expert can review the request."
      : summaryLength > 1000
        ? "Keep this summary within 1,000 characters. Your text has been preserved."
        : null;
  const expert = expertById(data, id ?? "");
  const bookingPatient = patientById(data, bookingPatientId);

  if (!expert) {
    return (
      <MobileScreen title="Book" back="/app/experts" patientContext>
        <EmptyState title="Expert not found" body="Try picking someone else." />
      </MobileScreen>
    );
  }

  if (expert.id === EXPERT_ID) {
    return (
      <MobileScreen title="Book" back="/app/experts" tabs="none" patientContext>
        <EmptyState
          title="This is your own practice"
          body="You cannot book a consultation with yourself."
          action={<ButtonLink to="/app/experts">Find another</ButtonLink>}
        />
      </MobileScreen>
    );
  }

  const bookableCredentials = expert.credentials.filter(
    (candidate) => candidate.verification_status === "VERIFIED" && !candidate.retired_at,
  );
  const requestedCredentialId = searchParams.get("credential");
  const credential = requestedCredentialId
    ? bookableCredentials.find((candidate) => candidate.id === requestedCredentialId)
    : bookableCredentials[0];

  if (!credential) {
    return (
      <MobileScreen title="Book" back={`/app/experts/${expert.id}`} tabs="none" patientContext>
        <EmptyState
          title="This expert is not bookable yet"
          body="Their professional details are still under review."
          action={<ButtonLink to="/app/experts">Browse experts</ButtonLink>}
        />
      </MobileScreen>
    );
  }

  if (
    !bookingPatient ||
    !accountCanManagePatient(data, bookingPatientId) ||
    bookingPatient.status !== "VERIFIED"
  ) {
    return (
      <MobileScreen title="Book" back={`/app/experts/${expert.id}`} tabs="none" patientContext>
        <EmptyState
          title={
            bookingPatient
              ? `${bookingPatient.first_name}'s ID needs verification`
              : "Care context changed"
          }
          body="A consultation request can only be sent for the verified patient shown in this care context."
          action={
            bookingPatient?.is_dependant ? (
              <ButtonLink to={`/app/dependants/${bookingPatient.id}/verify`}>
                Verify {bookingPatient.first_name}'s ID
              </ButtonLink>
            ) : (
              <ButtonLink to="/app/verify-id">Verify ID</ButtonLink>
            )
          }
        />
      </MobileScreen>
    );
  }

  const availabilityStatus = expertAvailabilityStatus(data, expert.id);
  const acceptsNewWork = expertAcceptsNewWork(data, expert.id);
  const slots = acceptsNewWork ? availabilityFor(data, expert.id) : [];
  const grouped = new Map<string, typeof slots>();
  for (const s of slots) {
    const key = s.start.slice(0, 10);
    const list = grouped.get(key);
    if (list) list.push(s);
    else grouped.set(key, [s]);
  }

  const allDays = [...grouped.entries()];
  const days = showAllTimes ? allDays : allDays.slice(0, 6);
  const more = allDays.length > days.length;

  const fee = credential.consultation_fee_kobo;
  const pf = platformFee(fee);
  const total = fee + pf;
  const slot = slots.find((s) => s.id === chosen);

  const confirm = () => {
    if (error !== "none") return;
    const confirmedSummary = requestSummary.trim();
    if (confirmedSummary.length < 10 || confirmedSummary.length > 1000) return;
    if (
      session.viewingPatientId !== bookingPatientId ||
      !accountCanManagePatient(data, bookingPatientId)
    ) {
      toast("The care context changed. Review the booking again.");
      navigate("/app");
      return;
    }
    if (isPossibleEmergency(confirmedSummary)) {
      setError("emergency");
      return;
    }
    if (!expertAcceptsNewWork(data, expert.id)) {
      setError("not_accepting");
      return;
    }
    const liveSlot = chosen
      ? data.expertAvailability.find((candidate) => candidate.id === chosen)
      : undefined;
    if (!liveSlot || liveSlot.taken) {
      setError("taken");
      return;
    }
    const consultationId = nextId("con");
    const checkoutId = nextId("chk");
    const payoutId = nextId("po");
    const paidAt = now();
    const requestedAt = paidAt.toISOString().slice(0, 19);
    const respondBy = new Date(paidAt.getTime() + 15 * 60_000).toISOString().slice(0, 19);
    update((d) => {
      d.expertAvailability = d.expertAvailability.map((s) =>
        s.id === chosen ? { ...s, taken: true } : s,
      );
      d.consultations = [
        {
          id: consultationId,
          expert_id: expert.id,
          patient_identity_id: bookingPatientId,
          status: "REQUESTED",
          platform_fee_kobo: pf,
          expert_fee_kobo: fee,
          credential_id: credential.id,
          tier: credential.tier,
          requested_at: requestedAt,
          scheduled_start: liveSlot.start,
          scheduled_end: liveSlot.end,
          respond_by: respondBy,
          referred_from_id: null,
          referral_reason: null,
          referral_chain_depth: null,
          telemedicine_consent_at: null,
          referral_disclosure_ack_at: null,
          completed_at: null,
          workday_impact_answer: null,
          responded_at: null,
          request_summary: confirmedSummary,
        },
        ...d.consultations,
      ];
      d.checkoutPayments = [
        {
          id: checkoutId,
          consultation_id: consultationId,
          provider_request_id: null,
          provider_id: expert.id,
          provider_type: "SPECIALIST",
          total_amount_kobo: total,
          provider_amount_kobo: fee,
          commission_amount_kobo: pf,
          method: checkoutMethod,
          status: "PAID",
          nomba_order_reference: `MV-${consultationId.toUpperCase()}`,
          paid_at: requestedAt,
          refunded_at: null,
          refund_method: null,
        },
        ...d.checkoutPayments,
      ];
      d.providerPayouts = [
        {
          id: payoutId,
          checkout_payment_id: checkoutId,
          provider_id: expert.id,
          provider_type: "SPECIALIST",
          amount_kobo: fee,
          status: "PROCESSING",
          bank_account_last4: "9740",
          bank_code: "058",
          account_name: expertName(data, expert.id),
          transfer_reference: `NOM-${consultationId.toUpperCase()}`,
          initiated_at: requestedAt,
          completed_at: null,
          failure_reason: null,
        },
        ...d.providerPayouts,
      ];
    });
    setBookingDraft(null);
    toast(
      bookingPatient.is_dependant
        ? `Request sent for ${bookingPatient.first_name}.`
        : "Request sent.",
    );
    navigate(`/app/consultations/${consultationId}/booking`);
  };

  return (
    <MobileScreen
      title="Choose a time"
      back={{
        label: "Back",
        onBack: () => {
          if (pendingCheckout.current !== null) window.clearTimeout(pendingCheckout.current);
          pendingCheckout.current = null;
          navigate(`/app/experts/${expert.id}`);
        },
      }}
      tabs="none"
      patientContext
    >
      <div data-screen="P39" className="space-y-4">
        <ScreenStates
          states={[
            { value: "none", label: "Default" },
            { value: "taken", label: "409 just booked" },
            { value: "checkout_unavailable", label: "503 checkout unavailable" },
            { value: "checkout_failed", label: "402 checkout failed" },
            { value: "not_accepting", label: "403 not accepting" },
            { value: "emergency", label: "Emergency" },
          ]}
          value={error}
          onChange={setError}
        />

        {error === "taken" ? (
          <Banner
            tone="warning"
            action={
              <Button size="sm" variant="secondary" onClick={() => setError("none")}>
                Refresh
              </Button>
            }
          >
            That time was just booked by someone else. Here are the times still open.
          </Banner>
        ) : null}
        {error === "checkout_unavailable" ? (
          <Banner tone="warning">
            Secure checkout is temporarily unavailable. Please try again later.
          </Banner>
        ) : null}
        {error === "checkout_failed" ? (
          <Banner tone="error">
            The {checkoutMethod === "CARD" ? "card" : "bank transfer"} checkout did not complete. No
            consultation request was sent.
          </Banner>
        ) : null}
        {error === "not_accepting" ? (
          <Banner
            tone="warning"
            action={
              <ButtonLink size="sm" variant="secondary" to="/app/experts">
                Pick another
              </ButtonLink>
            }
          >
            {expert.first_name} isn't accepting new consultation requests right now.
          </Banner>
        ) : null}
        {error === "emergency" ? (
          <div className="rounded-brand-lg border-2 border-error bg-error-tint p-5">
            <AlertTriangle aria-hidden className="size-8 text-error" strokeWidth={1.5} />
            <h2 className="mt-3 font-heading text-h1 leading-tight text-error">
              Get help in person now
            </h2>
            <p className="measure mt-3 text-body text-base-content/85">{EMERGENCY_GUIDANCE}</p>
            <Button variant="secondary" className="mt-4" onClick={() => setError("none")}>
              Correct what I wrote
            </Button>
          </div>
        ) : null}

        <Card>
          <Field
            label="What do you want help with?"
            hint="Required. The expert sees this summary before accepting your request."
            error={summaryError}
          >
            {(props) => (
              <Textarea
                {...props}
                value={requestSummary}
                onChange={(event) => {
                  setRequestSummary(event.target.value);
                  if (error === "emergency") setError("none");
                }}
                placeholder="Describe the main concern in your own words"
                rows={4}
              />
            )}
          </Field>
          <p className="measure mt-2 text-body-sm text-base-content/60">
            This is for routing and the expert's pre-acceptance review. It is not a diagnosis.
          </p>
        </Card>

        {/* Who and how much, before a single time is picked. The fee used to
            appear only after choosing a slot, which asks a patient to commit to
            a time before knowing what it costs. */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-heading text-h3">{expertName(data, expert.id)}</p>
            <AvailabilityBadge status={availabilityStatus} />
          </div>
          <p className="text-body-sm text-base-content/65">
            {specialtyLabel(credential.specialty)} ·{" "}
            {professionalTypeLabel[expert.professional_type]}
            {bookableCredentials.length > 1 ? ` · ${credentialTierLabel[credential.tier]}` : ""}
          </p>
          {/* The total only, not the full breakdown. This screen is called
              "Choose a time", and the three-row breakdown plus its paragraph
              pushed the times below two dense cards. The same breakdown already
              appears in the checkout summary once a slot is picked, which is
              the moment it actually matters. What a patient needs here is the
              one number they are deciding against. */}
          <dl className="mt-3 border-t border-base-300 pt-1">
            <DataRow label="Total at checkout" value={naira(total)} />
          </dl>
          <p className="measure mt-2 text-body-sm text-base-content/60">
            One payment: {naira(fee)} for the consultation and a {naira(pf)} Monovella service fee.
            Review the full breakdown before you pay.
          </p>
        </Card>

        {error === "emergency" ? null : !acceptsNewWork ? (
          <EmptyState
            title="Not taking new bookings"
            body={`${expert.first_name} is out of office. Existing appointments are unchanged, but this is not a new-booking route right now.`}
            action={<ButtonLink to="/app/experts">Try another</ButtonLink>}
          />
        ) : !slots.length ? (
          <EmptyState
            title="No upcoming times"
            body={`${expert.first_name} hasn't published hours for the next fortnight.`}
            action={<ButtonLink to="/app/experts">Try another</ButtonLink>}
          />
        ) : (
          <>
            <section aria-labelledby="open-consultation-times" className="space-y-1">
              <h2 id="open-consultation-times" className="font-heading text-h3">
                Open times to plan around
              </h2>
              <p className="measure text-body-sm text-base-content/65">
                All times use Africa/Lagos. Select one that works for you, then review the one
                secure checkout below.
              </p>
            </section>
            {days.map(([day, rows]) => (
              <section key={day}>
                {/* "Tomorrow" is how a patient thinks about a booking; the date
                    stays alongside it so nothing is ambiguous. */}
                <h2 className="mb-2 font-heading text-h3 text-base-content/80">
                  {dayAnchor(day) ? (
                    <>
                      {dayAnchor(day)}{" "}
                      <span className="font-sans text-body-sm font-normal text-base-content/55">
                        {formatDateLong(`${day}T00:00:00`)}
                      </span>
                    </>
                  ) : (
                    formatDateLong(`${day}T00:00:00`)
                  )}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {rows.map((s) => (
                    <Chip key={s.id} selected={chosen === s.id} onClick={() => setChosen(s.id)}>
                      <span className="font-mono tabular">
                        {formatTime(s.start)}-{formatTime(s.end)}
                      </span>
                    </Chip>
                  ))}
                </div>
              </section>
            ))}

            {/* A list that simply stops reads as a loading failure. Say it ended. */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-base-content/55">
              <p>
                {more
                  ? `Showing the next ${days.length} days. ${expert.first_name} publishes hours a fortnight ahead.`
                  : `That's every time ${expert.first_name} has open.`}
              </p>
              {more ? (
                <Button size="sm" variant="secondary" onClick={() => setShowAllTimes(true)}>
                  Show {allDays.length - days.length} more day
                  {allDays.length - days.length === 1 ? "" : "s"}
                </Button>
              ) : null}
            </div>

            {slot ? (
              /* The fees are already stated at the top of the screen, so this
                 card confirms the one thing that just changed — the time — and
                 the single charge that follows from tapping it. */
              <Card>
                <p className="text-body-sm text-base-content/60">You're requesting</p>
                <p className="font-heading text-h3">
                  {dayAnchor(slot.start.slice(0, 10)) ?? formatDateLong(slot.start)},{" "}
                  {formatTime(slot.start)}-{formatTime(slot.end)}
                </p>
                <dl className="mt-2 divide-y divide-base-300 border-t border-base-300 pt-1">
                  <DataRow label="Total at checkout" value={naira(total)} />
                  <DataRow label={`${expertName(data, expert.id)} receives`} value={naira(fee)} />
                  <DataRow label="Monovella service fee" value={naira(pf)} />
                </dl>
                <p className="measure mt-2 text-body-sm text-base-content/70">
                  If {expert.first_name} declines, either of you cancels, or they don't show, we
                  start a full refund of the {naira(total)} automatically. Transfer refunds require
                  the bank-details flow in the real product.
                </p>
                <div className="mt-4 space-y-3">
                  <SegmentedControl
                    label="Checkout method"
                    value={checkoutMethod}
                    onChange={setCheckoutMethod}
                    options={[
                      { value: "CARD", label: "Card" },
                      { value: "TRANSFER", label: "Bank transfer" },
                    ]}
                  />
                  <p className="measure text-body-sm text-base-content/60">
                    Nomba securely collects the full {naira(total)}. Monovella verifies the result
                    before reserving the time and starts {naira(fee)}'s payout automatically.
                  </p>
                  {checkoutStatus === "confirming" ? (
                    <p className="text-body-sm text-base-content/65">
                      Confirming the checkout result… A real build waits for the verified payment
                      result before reserving the time.
                    </p>
                  ) : null}
                  <Button
                    full
                    disabled={
                      checkoutStatus === "confirming" ||
                      error !== "none" ||
                      summaryLength < 10 ||
                      summaryLength > 1000
                    }
                    onClick={() => {
                      setCheckoutStatus("confirming");
                      pendingCheckout.current = window.setTimeout(confirm, 700);
                    }}
                  >
                    {checkoutStatus === "confirming"
                      ? "Confirming checkout…"
                      : "Continue to secure checkout"}
                  </Button>
                </div>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </MobileScreen>
  );
}
