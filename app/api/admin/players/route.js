System.register("route", ["@/lib/db"], function (exports_1, context_1) {
    "use strict";
    var db_1;
    var __moduleName = context_1 && context_1.id;
    function isAuthed(request) {
        var _a;
        return ((_a = request.cookies.get('admin_auth')) === null || _a === void 0 ? void 0 : _a.value) === process.env.ADMIN_PASSWORD;
    }
    async function GET(request) {
        if (!isAuthed(request))
            return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
        const sql = db_1.getDb();
        const players = await sql `SELECT * FROM players ORDER BY name ASC`;
        return Response.json(players);
    }
    exports_1("GET", GET);
    async function POST(request) {
        if (!isAuthed(request))
            return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
        const sql = db_1.getDb();
        const { id, name, nationality, team, team_id } = await request.json();
        await sql `
    INSERT INTO players (id, name, nationality, team, team_id)
    VALUES (${id}, ${name}, ${nationality !== null && nationality !== void 0 ? nationality : 'Finland'}, ${team}, ${team_id})
    ON CONFLICT (id) DO UPDATE SET
      name        = EXCLUDED.name,
      nationality = EXCLUDED.nationality,
      team        = EXCLUDED.team,
      team_id     = EXCLUDED.team_id
  `;
        return Response.json({ ok: true });
    }
    exports_1("POST", POST);
    async function PUT(request) {
        if (!isAuthed(request))
            return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
        const sql = db_1.getDb();
        const { id, name, nationality, team, team_id } = await request.json();
        await sql `
    UPDATE players SET name=${name}, nationality=${nationality}, team=${team}, team_id=${team_id}
    WHERE id=${id}
  `;
        return Response.json({ ok: true });
    }
    exports_1("PUT", PUT);
    async function DELETE(request) {
        if (!isAuthed(request))
            return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
        const sql = db_1.getDb();
        const { id } = await request.json();
        await sql `DELETE FROM fixture_players WHERE player_id=${id}`;
        await sql `DELETE FROM players WHERE id=${id}`;
        return Response.json({ ok: true });
    }
    exports_1("DELETE", DELETE);
    return {
        setters: [
            function (db_1_1) {
                db_1 = db_1_1;
            }
        ],
        execute: function () {
        }
    };
});
