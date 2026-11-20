"""Valores de verificación de requirements.md. Ejecuta: .venv/bin/python -m pytest backend/tests -q"""
import statistics

from fastapi.testclient import TestClient

from backend.main import app
from backend.tracking import _leer_partido

cliente = TestClient(app)


def get(ruta, **params):
    return cliente.get(ruta, params=params)


def test_health():
    assert get("/health").json() == {"status": "ok"}


def test_equipos():
    assert len(get("/api/equipos").json()) == 32


def test_reporte_kc_y_no():
    kc = get("/api/equipos/KC/reporte").json()
    assert kc["equipo"]["n"] == 339
    shotgun = next(f for f in kc["formaciones"] if f["valor"] == "SHOTGUN")
    assert abs(shotgun["pct_equipo"] - 0.75) < 0.005
    assert len(kc["personal"]) <= 5
    assert get("/api/equipos/NO/reporte").json()["equipo"]["n"] == 203


def test_filtro_down():
    r = get("/api/equipos/KC/reporte", down=3).json()
    assert r["jugadas"] and all(j["down"] == 3 for j in r["jugadas"])
    assert r["equipo"]["n"] == len(r["jugadas"])


def test_filtros_combinados():
    r = get("/api/equipos/KC/reporte", down=3, distancia="larga", cuarto=2).json()
    assert all(j["down"] == 3 and j["yardsToGo"] >= 8 and j["quarter"] == 2 for j in r["jugadas"])
    assert r["liga"]["n"] >= r["equipo"]["n"]


def test_filtros_invalidos():
    assert get("/api/equipos/KC/reporte", down=9).status_code == 422
    assert get("/api/equipos/KC/reporte", cuarto=0).status_code == 422
    assert get("/api/equipos/KC/reporte", distancia="xx").status_code == 422
    assert get("/api/equipos/XXX/reporte").status_code == 404


def test_qbs():
    qbs = get("/api/qbs").json()
    assert len(qbs) == 60
    assert sum(q["jugadas"] < 20 for q in qbs) == 17
    por_nombre = {q["nombre"]: q for q in qbs}
    assert por_nombre["Patrick Mahomes"]["jugadas"] == 322
    assert por_nombre["Jared Goff"]["jugadas"] == 326
    assert por_nombre["Tom Brady"]["jugadas"] == 306
    r = get(f"/api/qbs/{por_nombre['Tom Brady']['nflId']}/reporte").json()
    assert r["resumen"]["n"] == 306
    assert {g["valor"] for g in r["man_zona"]} <= {"Man", "Zone"}
    assert sum(p["n"] for p in r["por_partido"]) == 306
    assert get("/api/qbs/1/reporte").status_code == 404


def test_partidos():
    assert len(get("/api/partidos").json()) == 122
    r = get("/api/partidos/2021090900/reporte").json()
    assert "marcador" not in str(r).lower()
    assert {e["equipo"] for e in r["equipos"]} == {"TB", "DAL"}
    assert sum(e["resumen"]["n"] for e in r["equipos"]) == len(r["jugadas"]) == 97
    assert get("/api/partidos/1/reporte").status_code == 404


def test_tracking_jugada_97():
    r = get("/api/jugadas/2021090900/97/tracking").json()
    ids = [f["frameId"] for f in r["frames"]]
    assert ids == sorted(ids)
    assert all(len(f["entidades"]) == 23 for f in r["frames"])
    assert r["jugada"]["pff_passCoverage"] == "Cover-1"
    assert r["qb_id"] == 25511
    assert r["frame_snap"] is not None
    assert get("/api/jugadas/2021090900/999999/tracking").status_code == 404


def test_descripcion_en_espanol():
    r = get("/api/jugadas/2021090900/97/tracking").json()["jugada"]
    assert r["playDescription"] == "(13:33) (Shotgun) T.Brady pass incomplete deep right to C.Godwin."
    assert r["descripcion_es"] == "(13:33) (Escopeta) T.Brady pase incompleto profundo a la derecha para C.Godwin."
    j = get("/api/partidos/2021090900/reporte").json()["jugadas"]
    assert all(x["descripcion_es"] and x["playDescription"] for x in j)


def test_traduccion_conserva_nombres_y_numeros():
    import re
    from backend.datos import JUGADAS
    nombre = re.compile(r"\b[A-Z][a-z]*\.[A-Z][\w'-]+")
    for o, t in zip(JUGADAS["playDescription"], JUGADAS["descripcion_es"]):
        assert set(nombre.findall(o)) <= set(nombre.findall(t))
        if "YAC" not in o and "yard line" not in o:
            assert sorted(re.findall(r"-?\d+", o)) == sorted(re.findall(r"-?\d+", t))


def test_linea_de_scrimmage():
    t = _leer_partido(2021090900)
    snap = t[t["event"].isin(["ball_snap", "autoevent_ballsnap"])].drop_duplicates("playId")[["playId", "frameId"]]
    balon = t[t["team"] == "football"].merge(snap, on=["playId", "frameId"])
    from backend.datos import JUGADAS
    los = JUGADAS[JUGADAS["gameId"] == 2021090900][["playId", "absoluteYardlineNumber"]]
    m = balon.merge(los, on="playId")
    assert statistics.median((m["x"] - m["absoluteYardlineNumber"]).abs()) < 1
