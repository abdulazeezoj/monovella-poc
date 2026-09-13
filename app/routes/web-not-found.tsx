import { RouteStatus } from "~/components/shell/page-status-states";

export function WebNotFound({
  home,
  label,
  support,
  scope,
}: {
  home: string;
  label: string;
  support?: string;
  scope: string;
}) {
  return (
    // Centres against the viewport rather than a fixed block height, so the
    // console, pharmacy and lab surfaces all sit the same way.
    <div className="flex min-h-[60vh] flex-col justify-center">
      <RouteStatus home={home} homeLabel={label} support={support} scope={scope} />
    </div>
  );
}
