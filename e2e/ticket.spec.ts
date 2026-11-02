import { expect, test, type Page } from "@playwright/test";

const event = { slug: "batangas-dev-meetup-12", title: "Batangas Dev Meetup #12" };
const person = { name: "Dana Cruz", password: "kapeng barako 3x" };

async function logIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(person.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(next);
}

// One ticket from start to finish: someone new signs up and registers, opens
// their ticket, and the organizer checks it in at the door. The tests share
// that ticket, so they run in order.
test.describe.serial("a ticket from sign-up to the door", () => {
  let email: string;
  let code: string;

  test.beforeAll(() => {
    email = `dana-${test.info().project.name}-${Date.now()}@example.com`;
  });

  test("someone new signs up and registers for an event", async ({ page }) => {
    await page.goto(`/events/${event.slug}`);
    await page.getByRole("link", { name: "Log in to register" }).click();
    await page.getByRole("link", { name: "Create an account" }).click();

    await page.getByLabel("Name").fill(person.name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(person.password);
    await page.getByRole("button", { name: "Create account" }).click();

    // Signing up sends them back to the event they were looking at.
    await expect(page).toHaveURL(`/events/${event.slug}`);
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await expect(page.getByText("You're going. Here's your ticket.")).toBeVisible();

    const href = await page.getByRole("link", { name: "Show my ticket" }).getAttribute("href");
    code = href!.replace("/tickets/", "");
    expect(code).toMatch(/^[A-Z0-9]{10}$/);
  });

  test("the ticket is under My tickets with a QR code", async ({ page }) => {
    await logIn(page, email, "/tickets");
    await page.getByRole("link", { name: event.title }).click();

    await expect(page).toHaveURL(`/tickets/${code}`);
    const ticket = page.getByRole("main");
    const shown = `${code.slice(0, 5)}-${code.slice(5)}`;
    await expect(ticket.getByRole("img", { name: `QR code for ticket ${shown}` })).toBeVisible();
    await expect(ticket.getByText(shown, { exact: true })).toBeVisible();
    await expect(ticket.getByText(person.name, { exact: true })).toBeVisible();
  });

  test("the ticket opens with no signal until they log out", async ({ page, context }) => {
    await logIn(page, email, "/tickets");
    await expect(page.getByText("Saved on this device, so this ticket opens with no signal.")).toBeVisible();

    await context.setOffline(true);
    await page.goto(`/tickets/${code}`);
    await expect(page.getByRole("status")).toContainText("No connection right now");
    const shown = `${code.slice(0, 5)}-${code.slice(5)}`;
    await expect(page.getByRole("main").getByRole("img", { name: `QR code for ticket ${shown}` })).toBeVisible();

    // A page that isn't saved sends them to the tickets that are.
    await page.goto("/events");
    await expect(page).toHaveURL("/tickets");
    await page.getByRole("link", { name: event.title }).click();
    await expect(page).toHaveURL(`/tickets/${code}`);
    await context.setOffline(false);

    // Logging out leaves nothing saved, even straight after opening My tickets
    // while it may still be saving.
    await page.goto("/tickets");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/");
    await context.setOffline(true);
    await expect(page.goto(`/tickets/${code}`)).rejects.toThrow();
    await context.setOffline(false);
  });

  test("the organizer checks the ticket in at the door", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Try as an organizer" }).click();
    await expect(page).toHaveURL("/organize");
    await page.getByRole("link", { name: event.title }).click();
    await page.getByRole("link", { name: "Check people in" }).click();

    const box = page.getByLabel("Ticket code");
    const checkIn = page.getByRole("button", { name: "Check in", exact: true });

    // A made-up code gets turned away.
    await box.fill("ZZZZZ-ZZZZZ");
    await checkIn.click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("No ticket matches that code.");

    // Door staff type codes however they read them: lowercase, with or without the dash.
    await box.fill(code.toLowerCase());
    await checkIn.click();
    await expect(page.getByText("Admitted", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText(person.name, { exact: true }).first()).toBeVisible();

    // The same ticket can't get a second person in.
    await box.fill(code);
    await checkIn.click();
    await expect(page.getByText("Already in", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Already checked in at/)).toBeVisible();
  });

  test("the ticket then shows it's been used", async ({ page }) => {
    await logIn(page, email, `/tickets/${code}`);
    await expect(page.getByText(/^Checked in at/)).toBeVisible();
  });
});
