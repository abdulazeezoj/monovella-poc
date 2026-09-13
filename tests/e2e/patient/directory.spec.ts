import { expect, journey } from "../journey";

journey.happy(
  ["C2", "C3"],
  "symptom intake finds a specialty and direct search finds a named expert",
  async ({ app, page }) => {
    await app.bootstrap("/app/find");
    await page
      .getByLabel("In your own words")
      .fill("I want to discuss changes to my menstrual periods.");
    await page.getByRole("button", { name: "Find specialist", exact: true }).click();
    await page.getByRole("link", { name: "See specialists", exact: true }).click();
    await expect(page).toHaveURL(/specialty=OBSTETRICS_GYNECOLOGY/);
    await expect(page.getByText(/Chinelo Eze/).first()).toBeVisible();
    await page.getByLabel("Search specialists").fill("Chinelo");
    await expect(page.getByText(/Chinelo Eze/).first()).toBeVisible();
    await app.reload();
    await expect(page.getByLabel("Search specialists")).toHaveValue("Chinelo");
    await app.goto("/app/experts");
    await page.getByLabel("Search specialists").fill("Chinelo Eze");
    await expect(page.getByText(/Chinelo Eze/).first()).toBeVisible();
  },
);

journey.sad("C3", "a directory search with no match can be cleared", async ({ app, page }) => {
  await app.bootstrap("/app/experts");
  await page.getByLabel("Search specialists").fill("no-such-specialist");
  await expect(page).toHaveURL(/q=no-such-specialist/);
  await expect(
    page.getByRole("heading", { name: "Nothing matches these filters", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/experts$/);
  await expect(page.getByLabel("Search specialists")).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Nothing matches these filters", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Search specialists").fill("Chinelo");
  await expect(page.getByText(/Chinelo Eze/).first()).toBeVisible();
});

journey.sad(
  "C2",
  "ordinary words containing a routing keyword do not become a confident match",
  async ({ app, page }) => {
    await app.bootstrap("/app/find");
    await page.getByLabel("In your own words").fill("I am asking about periodic headaches.");
    await page.getByRole("button", { name: "Find specialist", exact: true }).click();
    await expect(page.getByText("Start with General Practice", { exact: true })).toBeVisible();
    await expect(page.getByText("Matched to", { exact: true })).toHaveCount(0);
  },
);
