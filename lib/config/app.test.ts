import { describe, expect, it } from "vitest";
import { APP } from "./app";
import { isUndeliverableRecipient } from "./email";

/**
 * The public contact address sits on the footer, every legal page, the
 * structured data and every email template. It was hello@/support@petvity.com
 * for months: a domain this project does not own, so privacy requests and
 * support mail went to a stranger or bounced. Only the orangecat.ch apex has a
 * mailbox; subdomains (petvity., fleetcrown.) have no MX.
 */
describe("APP.email", () => {
  it("is on the orangecat.ch apex, the only domain that receives mail", () => {
    expect(APP.email.split("@")[1]).toBe("orangecat.ch");
  });

  it("is not an address the app itself treats as undeliverable", () => {
    expect(isUndeliverableRecipient(APP.email)).toBe(false);
  });
});
