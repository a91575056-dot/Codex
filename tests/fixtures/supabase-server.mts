// Local protocol fixture only. Never used by the app or deployed to Supabase.
// Auth is simulated; database operations use actual PostgreSQL RLS through PGlite.
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
);
for (const name of (await readdir("supabase/migrations"))
  .filter((n) => n.endsWith(".sql"))
  .sort())
  await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
const users = [
  { id: "00000000-0000-4000-8000-000000000003", email: "c@fintrack.invalid" },
  { id: "00000000-0000-4000-8000-000000000001", email: "a@fintrack.invalid" },
  { id: "00000000-0000-4000-8000-000000000002", email: "b@fintrack.invalid" },
];
for (const u of users)
  await db.query("insert into auth.users(id) values($1)", [u.id]);
function token(id: string) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: id,
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: "http://127.0.0.1:54329/auth/v1",
    }),
  ).toString("base64url");
  return (
    header +
    "." +
    body +
    "." +
    createHmac("sha256", "local-fixture-only-not-a-production-secret")
      .update(header + "." + body)
      .digest("base64url")
  );
}
const tokens = new Map(users.map((u) => [token(u.id), u]));
const names = new Map<string, string>();
function userBody(u: (typeof users)[number]) {
  return {
    ...u,
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email" },
    user_metadata: names.has(u.id) ? { display_name: names.get(u.id) } : {},
    identities: [],
  };
}
function reply(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(data));
}
async function body(req: IncomingMessage) {
  let s = "";
  for await (const chunk of req) {
    s += chunk.toString();
    if (s.length > 1000000) throw Error("Request too large");
  }
  return s ? JSON.parse(s) : {};
}
const tables = new Set([
  "shortcut_devices",
  "accounts",
  "categories",
  "transactions",
  "savings_goals",
  "goal_contributions",
  "goal_scenarios",
  "budgets",
  "holdings",
]);
const columns = new Map<string, Set<string>>();
const dateColumns = new Map<string, Set<string>>();
for (const table of tables) {
  const r = await db.query<{ column_name: string; data_type: string }>(
    "select column_name,data_type from information_schema.columns where table_schema=$1 and table_name=$2",
    ["public", table],
  );
  columns.set(table, new Set(r.rows.map((x) => x.column_name)));
  dateColumns.set(
    table,
    new Set(
      r.rows.filter((x) => x.data_type === "date").map((x) => x.column_name),
    ),
  );
}
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>) {
  const result = queue.then(fn);
  queue = result.catch(() => {});
  return result;
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1:54329");
    if (url.pathname === "/health") return reply(res, 200, { ready: true });
    const bearer = req.headers.authorization?.replace(/^Bearer /, "");
    const user = bearer ? tokens.get(bearer) : undefined;
    if (url.pathname === "/auth/v1/signup") {
      return reply(res, 429, {
        code: "over_email_send_rate_limit",
        msg: "email rate limit exceeded",
      });
    }
    if (url.pathname === "/auth/v1/token") {
      const data = await body(req);
      const found = users.find((u) => u.email === data.email);
      if (!found || data.password !== "FinTrackFixture2026!")
        return reply(res, 400, {
          error: "invalid_grant",
          error_description: "Invalid credentials",
        });
      const access = [...tokens].find(([, u]) => u.id === found.id)![0];
      return reply(res, 200, {
        access_token: access,
        refresh_token: "fixture-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user: userBody(found),
      });
    }
    if (url.pathname === "/auth/v1/user" && req.method === "PUT" && user) {
      const input = await body(req);
      if (typeof input.data?.display_name === "string")
        names.set(user.id, input.data.display_name);
      return reply(res, 200, userBody(user));
    }
    if (url.pathname === "/auth/v1/user")
      return user
        ? reply(res, 200, userBody(user))
        : reply(res, 401, { msg: "Invalid token", code: "bad_jwt" });
    if (url.pathname === "/auth/v1/logout") return reply(res, 200, {});
    if (["/auth/v1/recover", "/auth/v1/resend"].includes(url.pathname))
      return reply(res, 200, {});
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const rpc = url.pathname.split("/").at(-1);
      const allowed: Record<string, string[]> = {
        shortcut_options: ["p_token"],
        shortcut_expense: [
          "p_token",
          "p_request_id",
          "p_amount_minor",
          "p_payment_method",
          "p_category_id",
          "p_description",
        ],
      };
      if (!rpc || !allowed[rpc] || req.method !== "POST")
        return reply(res, 404, { message: "Unsupported RPC" });
      const args = await body(req);
      return await serial(async () => {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          user?.id || "",
        ]);
        await db.exec(user ? "set role authenticated" : "set role anon");
        try {
          const values = allowed[rpc].map((key) => args[key]);
          const result = await db.query<{ result: unknown }>(
            "select public." +
              rpc +
              "(" +
              values.map((_, i) => "$" + (i + 1)).join(",") +
              ") as result",
            values,
          );
          return reply(res, 200, result.rows[0].result);
        } catch (e) {
          const error = e as { code?: string; message?: string };
          return reply(res, 400, { code: error.code, message: error.message });
        }
      });
    }
    if (!url.pathname.startsWith("/rest/v1/"))
      return reply(res, 404, { message: "Unsupported fixture endpoint" });
    const table = url.pathname.split("/").at(-1)!;
    if (!tables.has(table))
      return reply(res, 404, { message: "Unknown table" });
    const known = columns.get(table)!;
    const quote = (s: string) => {
      if (!known.has(s)) throw Error("Unknown column");
      return '"' + s + '"';
    };
    const payload = ["POST", "PATCH"].includes(req.method || "")
      ? await body(req)
      : null;
    await serial(async () => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user?.id || "",
      ]);
      await db.exec(user ? "set role authenticated" : "set role anon");
      const params: unknown[] = [];
      const placeholder = (v: unknown) => {
        params.push(v);
        return "$" + params.length;
      };
      const where: string[] = [];
      for (const [key, value] of url.searchParams) {
        if (["select", "order", "offset", "limit"].includes(key)) continue;
        if (!value.startsWith("eq.")) throw Error("Unsupported fixture filter");
        where.push(quote(key) + "=" + placeholder(value.slice(3)));
      }
      const filter = where.length ? " where " + where.join(" and ") : "";
      let sql = "";
      if (req.method === "POST") {
        const keys = Object.keys(payload);
        sql =
          "insert into public." +
          table +
          " (" +
          keys.map(quote).join(",") +
          ") values (" +
          keys
            .map((k) =>
              placeholder(
                typeof payload[k] === "object"
                  ? JSON.stringify(payload[k])
                  : payload[k],
              ),
            )
            .join(",") +
          ") returning *";
      } else if (req.method === "PATCH") {
        const keys = Object.keys(payload);
        sql =
          "update public." +
          table +
          " set " +
          keys
            .map(
              (k) =>
                quote(k) +
                "=" +
                placeholder(
                  typeof payload[k] === "object"
                    ? JSON.stringify(payload[k])
                    : payload[k],
                ),
            )
            .join(",") +
          filter +
          " returning *";
      } else if (req.method === "DELETE")
        sql = "delete from public." + table + filter + " returning *";
      else {
        sql = "select * from public." + table + filter;
        const order = url.searchParams.get("order");
        if (order)
          sql +=
            " order by " +
            order
              .split(",")
              .map((o) => {
                const [col, dir] = o.split(".");
                return quote(col) + (dir === "desc" ? " desc" : " asc");
              })
              .join(",");
        const limit = Number(url.searchParams.get("limit") || 500),
          offset = Number(url.searchParams.get("offset") || 0);
        if (
          !Number.isSafeInteger(limit) ||
          !Number.isSafeInteger(offset) ||
          limit < 0 ||
          offset < 0
        )
          throw Error("Invalid page");
        sql += " limit " + limit + " offset " + offset;
      }
      try {
        const result = await db.query(sql, params);
        result.rows = result.rows.map((row) =>
          Object.fromEntries(
            Object.entries(row as Record<string, unknown>).map(([k, v]) => [
              k,
              dateColumns.get(table)?.has(k) && v != null
                ? (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10)
                : v,
            ]),
          ),
        );
        const selected = url.searchParams.get("select") || "*";
        const rows =
          selected === "*"
            ? result.rows
            : result.rows.map((row) =>
                Object.fromEntries(
                  selected.split(",").map((k) => {
                    quote(k);
                    return [k, (row as Record<string, unknown>)[k]];
                  }),
                ),
              );
        const single = String(req.headers.accept || "").includes(
          "application/vnd.pgrst.object+json",
        );
        reply(res, 200, single ? (rows[0] ?? null) : rows);
      } catch (e) {
        const error = e as { code?: string; message?: string };
        reply(
          res,
          error.code === "42501" ? 403 : error.code === "23505" ? 409 : 400,
          {
            code: error.code || "FIXTURE_ERROR",
            message: error.message || "Database error",
          },
        );
      }
    });
  } catch {
    reply(res, 500, {
      code: "FIXTURE_ERROR",
      message: "Local fixture request failed",
    });
  }
});
server.listen(54329, "127.0.0.1", () =>
  process.stdout.write("FinTrack local integration fixture ready\n"),
);
process.on("SIGTERM", () => {
  server.close();
  void db.close();
});
