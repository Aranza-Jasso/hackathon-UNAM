"""Carga de datos al arrancar. Solo lectura: no modifica ni escribe archivos."""
from pathlib import Path

import pandas as pd

from .traduccion import traducir

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "data" / "nfl-big-data-bowl-regional-event-data-main" / "data"
CARPETA_TRACKING = DATOS / "tracking"


def _reloj_a_segundos(reloj: pd.Series) -> pd.Series:
    """'MM:SS' -> segundos, vectorizado."""
    partes = reloj.str.split(":", expand=True).astype(int)
    return partes[0] * 60 + partes[1]


def _cargar():
    plays = pd.read_csv(DATOS / "plays.csv")
    games = pd.read_csv(DATOS / "games.csv")
    players = pd.read_csv(DATOS / "players.csv", usecols=["nflId", "displayName"])
    scouting = pd.read_csv(
        DATOS / "pffScoutingData.csv",
        usecols=["gameId", "playId", "nflId", "pff_role", "pff_hit", "pff_hurry", "pff_sack"],
    )
    llave = ["gameId", "playId"]

    # QB de la jugada: el jugador con pff_role == "Pass" (exactamente uno por jugada).
    pasadores = (
        scouting.loc[scouting["pff_role"] == "Pass", llave + ["nflId"]]
        .merge(players, on="nflId", how="left")
        .rename(columns={"nflId": "qb_id", "displayName": "qb_nombre"})
    )

    # Jugadores con presión (hit, hurry o sack = 1), agrupados por jugada.
    presionadores = scouting.loc[scouting[["pff_hit", "pff_hurry", "pff_sack"]].eq(1).any(axis=1), llave + ["nflId"]]
    presion_ids = {
        (int(g), int(p)): ids.astype(int).tolist()
        for (g, p), ids in presionadores.groupby(llave)["nflId"]
    }

    j = plays.merge(pasadores, on=llave, how="left").merge(
        games[["gameId", "week", "homeTeamAbbr", "visitorTeamAbbr"]].rename(
            columns={"week": "semana", "homeTeamAbbr": "local", "visitorTeamAbbr": "visitante"}
        ),
        on="gameId",
        how="left",
    )

    # Columnas derivadas: las métricas se vuelven sumas y promedios vectorizados.
    j["presion"] = pd.MultiIndex.from_frame(j[llave]).isin(pd.MultiIndex.from_frame(presionadores[llave]))
    resultado = j["passResult"]
    j["intento"] = resultado.isin(["C", "I", "IN"])
    j["completo"] = resultado.eq("C")
    j["sack"] = resultado.eq("S")
    j["intercepcion"] = resultado.eq("IN")
    j["scramble"] = resultado.eq("R")
    j["distancia"] = pd.cut(
        j["yardsToGo"], bins=[0, 3, 7, float("inf")], labels=["corta", "media", "larga"]
    ).astype(str)
    j["rival"] = j["defensiveTeam"]
    j["reloj_seg"] = _reloj_a_segundos(j["gameClock"])
    # Descripción en español; la original en inglés se conserva en playDescription.
    j["descripcion_es"] = j["playDescription"].map(traducir)

    qbs = (
        j.groupby("qb_id")
        .agg(
            nombre=("qb_nombre", "first"),
            equipos=("possessionTeam", lambda s: sorted(s.unique().tolist())),
            jugadas=("playId", "size"),
        )
        .reset_index()
        .rename(columns={"qb_id": "nflId"})
        .sort_values("jugadas", ascending=False, kind="stable")
    )

    claves = set(zip(j["gameId"].astype(int), j["playId"].astype(int)))
    return j, games, qbs, claves, presion_ids


JUGADAS, PARTIDOS, QBS, CLAVES, PRESION_IDS = _cargar()
EQUIPOS = sorted(JUGADAS["possessionTeam"].unique().tolist())
IDS_QB = set(QBS["nflId"].astype(int))
IDS_PARTIDO = set(PARTIDOS["gameId"].astype(int))
