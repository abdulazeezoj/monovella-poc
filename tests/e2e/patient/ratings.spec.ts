import { expect, journey, test } from "../journey";

journey.happy(
  "C17",
  "completed care invites one rating and keeps private recovery separate",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const state = await app.state();
    const booking = state.data!.consultations.find(
      (row) =>
        row.patient_identity_id === state.session!.viewingPatientId &&
        row.status === "COMPLETED" &&
        !state.data!.feedbackEntries.some((entry) => entry.interaction_id === row.id),
    )!;
    await app.goto(`/app/consultations/${booking.id}`);
    await page.getByRole("link", { name: /^Rate / }).click();
    await expect(page.getByRole("button", { name: "Submit once" })).toBeDisabled();
    await page.getByRole("radio", { name: "4 of 5 stars" }).click();
    await page
      .getByLabel("Public review", { exact: true })
      .fill("Clear explanations in this demonstration.");
    await page
      .getByLabel("Private help from Monovella (optional)")
      .fill("Please help me locate the receipt.");
    await page.getByRole("button", { name: "Submit once" }).click();
    await expect(page.getByRole("heading", { name: "Feedback already received" })).toBeVisible();
    await app.reload();
    await expect(page.getByRole("button", { name: "Submit once" })).toHaveCount(0);
    const entries = (await app.rows("feedbackEntries")).filter(
      (entry) => entry.interaction_id === booking.id,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      rating: 4,
      moderation_status: "PENDING",
      public_comment: "Clear explanations in this demonstration.",
    });
    expect(
      (await app.rows("supportCases")).some(
        (entry) => entry.message === "Please help me locate the receipt.",
      ),
    ).toBe(true);
    await app.goto(`/app/consultations/${booking.id}`);
    await expect(page.getByRole("link", { name: /^Rate / })).toHaveCount(0);
    await expect(page.getByText(/You rated this consultation 4 of 5/)).toBeVisible();
  },
);

test("spoken-review simulation requires a finished recording", async ({ app, page }) => {
  await page.clock.install();
  await app.bootstrap("/app");
  const state = await app.state();
  const booking = state.data!.consultations.find(
    (row) =>
      row.patient_identity_id === state.session!.viewingPatientId &&
      row.status === "COMPLETED" &&
      !state.data!.feedbackEntries.some((entry) => entry.interaction_id === row.id),
  )!;
  await app.goto(`/app/feedback/expert/${booking.id}`);
  await page.getByRole("radio", { name: "4 of 5 stars" }).click();
  await page.getByRole("radio", { name: "Say it", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit once" })).toBeDisabled();
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit once" })).toBeDisabled();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByText(/That recording is too short/)).toBeVisible();
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.getByRole("button", { name: "Cancel recording", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit once" })).toBeDisabled();
  for (const action of ["Delete", "Submit once"]) {
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await page.clock.fastForward(5000);
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(page.getByText(/Demo recording ready/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit once" })).toBeEnabled();
    await page.getByRole("button", { name: action, exact: true }).click();
    if (action === "Delete")
      await expect(page.getByRole("button", { name: "Submit once" })).toBeDisabled();
  }
  const entries = (await app.rows("feedbackEntries")).filter(
    (entry) => entry.interaction_id === booking.id,
  );
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    comment_kind: "VOICE",
    public_comment: "",
    moderation_status: "PENDING",
  });
  expect(entries[0].voice_duration_seconds).toBeGreaterThanOrEqual(5);
});
