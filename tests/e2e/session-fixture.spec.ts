import { expect, SEATS, test } from "./fixtures";

test("a session switch survives a pending save from the page being left", async ({ app, page }) => {
  await app.bootstrap("/app");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.evaluate(() => {
    const key = "mv-prototype-state";
    const state = JSON.parse(sessionStorage.getItem(key)!);
    state.data.reports[0].status = "GENERATING";
    sessionStorage.setItem(key, JSON.stringify(state));
  });
  await app.reload();
  const navigate = app.goto.bind(app);
  app.goto = async (path, timeout) => {
    // Finish the pending report between the helper's session patch and
    // document navigation. The old page persists its own session with it.
    await page.clock.fastForward(2000);
    await navigate(path, timeout);
  };
  await app.asSeat(SEATS.doctor);
  expect((await app.state()).session?.role).toBe("expert");
  expect((await app.rows("reports"))[0].status).toBe("READY");
});
