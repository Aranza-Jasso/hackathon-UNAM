"""Tracking de una jugada, leído por partido bajo demanda. Solo lectura, sin escribir en disco."""
from functools import lru_cache

import pandas as pd

from .datos import CARPETA_TRACKING, CLAVES, JUGADAS, PRESION_IDS
from .metricas import registros

COLUMNAS = ["playId", "frameId", "nflId", "jerseyNumber", "team", "playDirection", "x", "y", "s", "event"]
EVENTOS_SNAP = {"ball_snap", "autoevent_ballsnap"}
JUGADAS_IDX = JUGADAS.set_index(["gameId", "playId"])


@lru_cache(maxsize=4)
def _leer_partido(game_id: int) -> pd.DataFrame:
    """Solo se llama con un gameId ya validado contra CLAVES."""
    df = pd.read_csv(CARPETA_TRACKING / f"tracking_{game_id}.csv", usecols=COLUMNAS)
    df["event"] = df["event"].where(df["event"] != "None")
    return df


def tracking_jugada(game_id: int, play_id: int) -> dict | None:
    if (game_id, play_id) not in CLAVES:
        return None  # 404 sin abrir ningún archivo
    t = _leer_partido(game_id)
    t = t[t["playId"] == play_id].sort_values(["frameId", "team"], kind="stable")

    # Una sola conversión a JSON; luego se agrupa por frame en Python.
    filas = registros(t[["frameId", "nflId", "jerseyNumber", "team", "x", "y", "s", "event"]])
    frames: list[dict] = []
    for f in filas:
        if not frames or frames[-1]["frameId"] != f["frameId"]:
            frames.append({"frameId": f["frameId"], "event": f["event"], "entidades": []})
        frames[-1]["entidades"].append(
            {"nflId": f["nflId"], "num": f["jerseyNumber"], "team": f["team"],
             "x": f["x"], "y": f["y"], "s": f["s"]}
        )

    frame_snap = next((fr["frameId"] for fr in frames if fr["event"] in EVENTOS_SNAP), None)
    j = JUGADAS_IDX.loc[(game_id, play_id)]
    jugada = registros(pd.DataFrame([{
        "gameId": game_id, "playId": play_id, "playDescription": j["playDescription"],
        "descripcion_es": j["descripcion_es"],
        "quarter": j["quarter"], "down": j["down"], "yardsToGo": j["yardsToGo"],
        "passResult": j["passResult"], "pff_passCoverage": j["pff_passCoverage"],
        "absoluteYardlineNumber": j["absoluteYardlineNumber"],
        "posesion": j["possessionTeam"], "rival": j["rival"],
    }]))[0]

    return {
        "jugada": jugada,
        "playDirection": t["playDirection"].iloc[0] if len(t) else None,
        "frame_snap": frame_snap,
        "qb_id": None if pd.isna(j["qb_id"]) else int(j["qb_id"]),
        "presion_ids": PRESION_IDS.get((game_id, play_id), []),
        "frames": frames,
    }
