"""API del reporte de tendencias ofensivas. Ejecuta: .venv/bin/uvicorn backend.main:app --reload"""
from typing import Literal

from fastapi import FastAPI, HTTPException, Query

from .datos import EQUIPOS
from .reportes import lista_partidos, lista_qbs, reporte_equipo, reporte_partido, reporte_qb
from .tracking import tracking_jugada

app = FastAPI(title="Hackathon NFL UNAM")


def _o_404(resultado, que: str):
    if resultado is None:
        raise HTTPException(status_code=404, detail=f"{que} no encontrado")
    return resultado


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/equipos")
def equipos() -> list[str]:
    return EQUIPOS


@app.get("/api/equipos/{abbr}/reporte")
def equipo_reporte(
    abbr: str,
    down: int | None = Query(None, ge=1, le=4),
    distancia: Literal["corta", "media", "larga"] | None = None,
    cuarto: int | None = Query(None, ge=1, le=5, description="5 = tiempo extra"),
) -> dict:
    return _o_404(reporte_equipo(abbr.upper(), down, distancia, cuarto), "Equipo")


@app.get("/api/qbs")
def qbs() -> list[dict]:
    return lista_qbs()


@app.get("/api/qbs/{nfl_id}/reporte")
def qb_reporte(nfl_id: int) -> dict:
    return _o_404(reporte_qb(nfl_id), "QB")


@app.get("/api/partidos")
def partidos() -> list[dict]:
    return lista_partidos()


@app.get("/api/partidos/{game_id}/reporte")
def partido_reporte(game_id: int) -> dict:
    return _o_404(reporte_partido(game_id), "Partido")


@app.get("/api/jugadas/{game_id}/{play_id}/tracking")
def jugada_tracking(game_id: int, play_id: int) -> dict:
    return _o_404(tracking_jugada(game_id, play_id), "Jugada")
