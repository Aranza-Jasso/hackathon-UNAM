"""Reportes por equipo, QB y partido. Devuelven None si el elemento no existe."""
from functools import lru_cache

import pandas as pd

from .datos import IDS_PARTIDO, IDS_QB, JUGADAS, PARTIDOS, QBS
from .metricas import comparar, distribucion, filtrar, por_grupo, registros, resumen

COLUMNAS_JUGADA = [
    "gameId", "playId", "semana", "possessionTeam", "rival", "quarter", "gameClock",
    "down", "yardsToGo", "passResult", "playDescription", "descripcion_es", "pff_passCoverage",
]


def lista_jugadas(df: pd.DataFrame) -> list[dict]:
    return registros(df[COLUMNAS_JUGADA].rename(columns={"possessionTeam": "posesion"}))


@lru_cache(maxsize=256)
def _liga(down: int | None, distancia: str | None, cuarto: int | None) -> tuple[pd.DataFrame, dict]:
    """La liga con unos filtros dados no cambia: se calcula una vez por combinación (máx. 120)."""
    liga = filtrar(JUGADAS, down, distancia, cuarto)
    return liga, resumen(liga)


def reporte_equipo(abbr: str, down: int | None = None, distancia: str | None = None,
                   cuarto: int | None = None) -> dict | None:
    del_equipo = JUGADAS[JUGADAS["possessionTeam"] == abbr]
    if del_equipo.empty:
        return None
    equipo = filtrar(del_equipo, down, distancia, cuarto)
    liga, resumen_liga = _liga(down, distancia, cuarto)
    return {
        "equipo_abbr": abbr,
        "filtros": {"down": down, "distancia": distancia, "cuarto": cuarto},
        # Cuartos con jugadas del equipo (sin filtros): el 5 (tiempo extra) solo si jugó tiempo extra.
        "cuartos_disponibles": sorted(int(q) for q in del_equipo["quarter"].unique()),
        "equipo": resumen(equipo),
        "liga": resumen_liga,
        "formaciones": comparar(equipo, liga, "offenseFormation"),
        "personal": comparar(equipo, liga, "personnelO", top=5),
        "coberturas": por_grupo(equipo, "pff_passCoverage"),
        "tipo_cobertura": por_grupo(equipo, "pff_passCoverageType"),
        "jugadas": lista_jugadas(equipo),
    }


def lista_qbs() -> list[dict]:
    return registros(QBS)


def reporte_qb(nfl_id: int) -> dict | None:
    if nfl_id not in IDS_QB:
        return None
    df = JUGADAS[JUGADAS["qb_id"] == nfl_id]
    info = QBS[QBS["nflId"] == nfl_id].iloc[0]
    por_partido = por_grupo(
        df, "gameId", extra={"semana": ("semana", "first"), "rival": ("rival", "first")}
    )
    return {
        "qb": {"nflId": nfl_id, "nombre": info["nombre"], "equipos": info["equipos"]},
        "resumen": resumen(df),
        "man_zona": [g for g in por_grupo(df, "pff_passCoverageType") if g["valor"] in ("Man", "Zone")],
        "por_partido": sorted(
            ({"gameId": g["valor"], **{k: v for k, v in g.items() if k != "valor"}} for g in por_partido),
            key=lambda g: g["semana"],
        ),
        "jugadas": lista_jugadas(df.sort_values(["semana", "quarter", "reloj_seg"], ascending=[True, True, False])),
    }


def lista_partidos() -> list[dict]:
    p = PARTIDOS.rename(columns={"week": "semana", "gameDate": "fecha",
                                 "homeTeamAbbr": "local", "visitorTeamAbbr": "visitante"})
    return registros(p[["gameId", "semana", "fecha", "local", "visitante"]].sort_values(["semana", "gameId"]))


def reporte_partido(game_id: int) -> dict | None:
    if game_id not in IDS_PARTIDO:
        return None
    juego = PARTIDOS[PARTIDOS["gameId"] == game_id].iloc[0]
    df = JUGADAS[JUGADAS["gameId"] == game_id]
    equipos = []
    for abbr in (juego["visitorTeamAbbr"], juego["homeTeamAbbr"]):
        d = df[df["possessionTeam"] == abbr]
        equipos.append({
            "equipo": abbr,
            "resumen": resumen(d),
            "sacks": int(d["sack"].sum()),
            "intercepciones": int(d["intercepcion"].sum()),
            "qbs": d["qb_nombre"].dropna().unique().tolist(),
            "coberturas": distribucion(d, "pff_passCoverage"),
        })
    # Sin marcador: el dataset no trae el marcador final (Requisito 4.4).
    return {
        "partido": {"gameId": game_id, "semana": int(juego["week"]), "fecha": juego["gameDate"],
                    "local": juego["homeTeamAbbr"], "visitante": juego["visitorTeamAbbr"]},
        "equipos": equipos,
        "jugadas": lista_jugadas(df.sort_values(["quarter", "reloj_seg"], ascending=[True, False])),
    }
