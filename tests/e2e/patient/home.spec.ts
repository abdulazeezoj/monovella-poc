import { expect, test } from "../fixtures";

test("Home exposes every pending care task without deferred-feature links", async ({
  app,
  page,
}) => {
  await app.bootstrap("/app");
  const tasks = page.getByRole("region", { name: "Waiting on", exact: true });
  await expect(tasks.getByRole("link")).toHaveCount(3);
  await tasks.getByRole("button", { name: "Show all", exact: true }).click();
  const links = tasks.getByRole("link");
  expect(await links.count()).toBeGreaterThan(3);
  const destinations = await links.evaluateAll((items) =>
    items.map((item) => item.getAttribute("href")),
  );
  expect(
    destinations.every((href) => href && !/^\/app\/(teni|calendar|log)(\/|$)/.test(href)),
  ).toBe(true);
  await expect(tasks.getByRole("button", { name: "Show fewer", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await tasks.getByRole("button", { name: "Show fewer", exact: true }).click();
  await expect(links).toHaveCount(3);
});
