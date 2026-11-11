import { test } from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage } from "../../src/lib/auth/errors";
test("auth errors explain email limits without leaking raw provider details", () => {
  assert.match(
    authErrorMessage(
      { code: "over_email_send_rate_limit", status: 429 },
      "generic",
    ),
    /limita de trimitere/,
  );
  assert.match(
    authErrorMessage(
      { message: "email rate limit exceeded", status: 429 },
      "generic",
    ),
    /limita de trimitere/,
  );
  assert.match(
    authErrorMessage({ status: 429 }, "generic"),
    /prea multe încercări/,
  );
  assert.match(
    authErrorMessage({ code: "email_address_not_authorized" }, "generic"),
    /SMTP/,
  );
  assert.match(
    authErrorMessage({ code: "email_not_confirmed" }, "generic"),
    /Confirmă adresa/,
  );
  assert.equal(
    authErrorMessage({ code: "unexpected_failure", status: 500 }, "generic"),
    "generic",
  );
});
