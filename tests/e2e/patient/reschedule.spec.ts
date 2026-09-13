import { expect, journey } from "../journey";

journey.happy(
  "C12",
  "a confirmed replacement releases the old booking without changing payment",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const state = await app.state();
    const booking = (await app.rows("consultations")).find(
      (row) =>
        row.patient_identity_id === state.session?.viewingPatientId && row.status === "SCHEDULED",
    );
    expect(booking).toBeTruthy();
    const beforePayments = await app.rows("checkoutPayments");
    const availability = await app.rows("expertAvailability");
    const original = availability.find(
      (row) =>
        row.expert_id === booking.expert_id &&
        row.start === booking.scheduled_start &&
        row.end === booking.scheduled_end,
    )!;
    expect(original.taken).toBe(true);
    const replacement = availability
      .filter(
        (row) =>
          row.expert_id === booking.expert_id && !row.taken && row.start > "2026-08-29T09:15:00",
      )
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    await app.goto(`/app/consultations/${booking.id}/reschedule`);
    await page
      .getByRole("button", {
        name: `${replacement.start.slice(11, 16)}-${replacement.end.slice(11, 16)}`,
        exact: true,
      })
      .first()
      .click();
    await page.getByRole("button", { name: "Review new time", exact: true }).click();
    expect((await app.rows("consultations")).find((row) => row.id === booking.id)).toEqual(booking);
    await page.getByRole("button", { name: "Keep current time", exact: true }).click();
    expect((await app.rows("expertAvailability")).find((row) => row.id === original.id).taken).toBe(
      true,
    );
    await app.selectScreenState("409 on confirmation");
    await page.getByRole("button", { name: "Review new time", exact: true }).click();
    await page.getByRole("button", { name: "Confirm time", exact: true }).click();
    await expect(
      page.getByText("That replacement time was just booked. Your current booking is unchanged.", {
        exact: true,
      }),
    ).toBeVisible();
    expect((await app.rows("consultations")).find((row) => row.id === booking.id)).toEqual(booking);
    expect((await app.rows("expertAvailability")).find((row) => row.id === original.id).taken).toBe(
      true,
    );
    await page
      .getByRole("button", {
        name: `${replacement.start.slice(11, 16)}-${replacement.end.slice(11, 16)}`,
        exact: true,
      })
      .first()
      .click();
    await page.getByRole("button", { name: "Review new time", exact: true }).click();
    await page.getByRole("button", { name: "Confirm time", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/consultations/${booking.id}/booking$`));
    await app.reload();
    expect((await app.rows("consultations")).find((row) => row.id === booking.id)).toEqual({
      ...booking,
      scheduled_start: replacement.start,
      scheduled_end: replacement.end,
    });
    const after = await app.rows("expertAvailability");
    expect(after.find((row) => row.id === original.id).taken).toBe(false);
    expect(after.find((row) => row.id === replacement.id).taken).toBe(true);
    expect(await app.rows("checkoutPayments")).toEqual(beforePayments);
  },
);
