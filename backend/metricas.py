"""Métricas puras sobre un DataFrame de jugadas. Definiciones: glosario de requirements.md."""
import json

import pandas as pd


def registros(df: pd.DataFrame) -> list[dict]:
    """DataFrame -> lista de dicts con tipos JSON (NaN -> None, numpy -> Python)."""
    return json.loads(df.to_json(orient="records"))


def _frac(numerador: float, denominador: float) -> float | None:
    return round(float(numerador) / denominador, 4) if denominador else None


def filtrar(df: pd.DataFrame, down: int | None = None, distancia: str | None = None,
            cuarto: int | None = None) -> pd.DataFrame:
    """Sin filtro de down se incluyen las jugadas con down = 0; con filtro, solo ese down."""
    mascara = pd.Series(True, index=df.index)
    if down is not None:
        mascara &= df["down"].eq(down)
    if distancia is not None:
        mascara &= df["distancia"].eq(distancia)
    if cuarto is not None:
        mascara &= df["quarter"].eq(cuarto)
    return df[mascara]


def resumen(df: pd.DataFrame) -> dict:
    n = len(df)
    intentos = int(df["intento"].sum())
    return {
        "n": n,
        "intentos": intentos,
        "pct_completos": _frac(df["completo"].sum(), intentos),
        "yardas_por_jugada": round(float(df["prePenaltyPlayResult"].mean()), 2) if n else None,
        "tasa_sack": _frac(df["sack"].sum(), n),
        "tasa_int": _frac(df["intercepcion"].sum(), intentos),
        "tasa_scramble": _frac(df["scramble"].sum(), n),
        "pct_play_action": _frac(df["pff_playAction"].sum(), n),
        "pct_presion": _frac(df["presion"].sum(), n),
    }


def distribucion(df: pd.DataFrame, columna: str, top: int | None = None) -> list[dict]:
    """Uso de cada valor: n y porcentaje sobre todas las jugadas del grupo."""
    conteo = df[columna].value_counts()
    if top:
        conteo = conteo.head(top)
    total = len(df)
    return [{"valor": str(v), "n": int(c), "pct": _frac(c, total)} for v, c in conteo.items()]


def comparar(equipo: pd.DataFrame, liga: pd.DataFrame, columna: str, top: int | None = None) -> list[dict]:
    """Uso por valor del equipo junto al uso de la liga con los mismos filtros."""
    uso_liga = liga[columna].value_counts()
    total_liga = len(liga)
    return [
        {"valor": d["valor"], "n_equipo": d["n"], "pct_equipo": d["pct"],
         "pct_liga": _frac(uso_liga.get(d["valor"], 0), total_liga)}
        for d in distribucion(equipo, columna, top)
    ]


def por_grupo(df: pd.DataFrame, columna: str, extra: dict | None = None) -> list[dict]:
    """% de completos y yardas por jugada por valor de `columna` (una sola pasada groupby)."""
    agregaciones = {
        "n": ("playId", "size"),
        "completos": ("completo", "sum"),
        "intentos": ("intento", "sum"),
        "yardas_por_jugada": ("prePenaltyPlayResult", "mean"),
        **(extra or {}),
    }
    g = df.groupby(columna, sort=False).agg(**agregaciones).reset_index().sort_values("n", ascending=False)
    g["pct_completos"] = (g["completos"] / g["intentos"].where(g["intentos"] > 0)).round(4)
    g["yardas_por_jugada"] = g["yardas_por_jugada"].round(2)
    g = g.drop(columns=["completos", "intentos"]).rename(columns={columna: "valor"})
    return registros(g)
