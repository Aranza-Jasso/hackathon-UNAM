"""Traducción al español de `playDescription` con reglas fijas.

Las descripciones de plays.csv siguen un formato regular ("X pass short right to Y to TB 40 for 7 yards").
Se traducen frase por frase, de la más larga a la más corta. Nombres de jugadores, equipos y números
no se tocan. El texto original se conserva en `playDescription`; esto solo agrega `descripcion_es`.
"""
import re
from functools import lru_cache

# Nombres de falta: los 29 valores de foulName1-3 en plays.csv.
FALTAS = {
    "Defensive Pass Interference": "Interferencia de pase defensiva",
    "Offensive Pass Interference": "Interferencia de pase ofensiva",
    "Offensive Holding": "Sujeción ofensiva",
    "Defensive Holding": "Sujeción defensiva",
    "Roughing the Passer": "Rudeza contra el pasador",
    "Defensive Offside": "Fuera de lugar defensivo",
    "Unnecessary Roughness": "Rudeza innecesaria",
    "Illegal Use of Hands": "Uso ilegal de las manos",
    "Face Mask (15 Yards)": "Agarre de máscara (15 yardas)",
    "Illegal Contact": "Contacto ilegal",
    "Intentional Grounding": "Lanzamiento intencional al suelo",
    "Taunting": "Provocación",
    "Ineligible Downfield Pass": "Jugador inelegible adelantado en pase",
    "Illegal Formation": "Formación ilegal",
    "Unsportsmanlike Conduct": "Conducta antideportiva",
    "Lowering the Head to Initiate Contact": "Bajar la cabeza para iniciar contacto",
    "Illegal Touch Pass": "Toque ilegal de pase",
    "Illegal Blindside Block": "Bloqueo ilegal por el lado ciego",
    "Illegal Motion": "Movimiento ilegal",
    "Horse Collar Tackle": "Tacleo de cuello (horse collar)",
    "Disqualification": "Descalificación",
    "Tripping": "Zancadilla",
    "Low Block": "Bloqueo bajo",
    "Illegal Shift": "Cambio de posición ilegal",
    "Illegal Forward Pass": "Pase adelantado ilegal",
    "Illegal Block Above the Waist": "Bloqueo ilegal arriba de la cintura",
    "Chop Block": "Bloqueo chop",
    "Illegal Substitution": "Sustitución ilegal",
    "Clipping": "Bloqueo por la espalda (clipping)",
    # Falta colectiva que aparece en las descripciones, no en foulName1-3
    "Defensive Too Many Men on Field": "Demasiados jugadores en el campo (defensa)",
}

# Decisiones que se revisan o retan: los 14 valores que aparecen en playDescription.
DECISIONES = {
    "pass completion": "pase completo",
    "incomplete pass": "pase incompleto",
    "runner broke the plane": "el corredor rompió el plano de la zona de anotación",
    "fumble": "balón suelto",
    "interception": "intercepción",
    "short of the goal line": "antes de la línea de gol",
    "runner was not down by contact": "el corredor no fue derribado por contacto",
    "runner was down by contact": "el corredor fue derribado por contacto",
    "first down": "primer down",
    "runner was inbounds": "el corredor estaba dentro del campo",
    "short of the line to gain": "antes de la línea de primer down",
    "loose ball recovery": "recuperación de balón suelto",
    "backward pass": "pase hacia atrás",
    "penalty enforcement": "aplicación del castigo",
}
REGRESO = {"Questionable": "dudoso", "Doubtful": "poco probable", "Probable": "probable"}


def _decision(m: re.Match) -> str:
    return DECISIONES.get(m.group(1), m.group(1))

POS = r"([A-Z]{2,3} -?\d+|\d+)"  # posición en el campo: "TB 40" o "50"

# (patrón, reemplazo) en orden. Frases largas primero para que las palabras sueltas no las rompan.
REGLAS = [
    # Formación y ritmo al inicio
    (r"\(No Huddle, Shotgun\)", "(Sin reunión, escopeta)"),
    (r"\(No Huddle\)", "(Sin reunión)"),
    (r"\(Shotgun\)", "(Escopeta)"),
    (r"\(Pass formation\)", "(Formación de pase)"),
    (r"\bNo Huddle\b", "Sin reunión"),
    # Conversión de dos puntos
    (r"TWO-POINT CONVERSION ATTEMPT", "INTENTO DE CONVERSIÓN DE DOS PUNTOS"),
    (r"ATTEMPT SUCCEEDS", "EL INTENTO ES BUENO"),
    (r"ATTEMPT FAILS", "EL INTENTO FALLA"),
    (r"\bis incomplete\b", "es incompleto"),
    (r"\bis complete\b", "es completo"),
    # Revisiones y retos: primero se traduce el nombre de la decisión, luego la frase
    (r"(?<=reviewed the )(.+?)(?= ruling)", _decision),
    (r"(?<=challenged the )(.+?)(?= ruling)", _decision),
    (r"The Replay Official reviewed the (.+?) ruling, and the play was REVERSED",
     r"El oficial de repetición revisó la decisión (\1) y la jugada fue REVOCADA"),
    (r"The Replay Official reviewed the (.+?) ruling, and the play was Upheld",
     r"El oficial de repetición revisó la decisión (\1) y la jugada fue CONFIRMADA"),
    (r"(\S[\w .]*?) challenged the (.+?) ruling, and the play was REVERSED",
     r"\1 retó la decisión (\2) y la jugada fue REVOCADA"),
    (r"(\S[\w .]*?) challenged the (.+?) ruling, and the play was Upheld",
     r"\1 retó la decisión (\2) y la jugada fue CONFIRMADA"),
    (r"The ruling on the field stands", "Se mantiene la decisión en el campo"),
    (r"\bNULLIFIED by Penalty\b", "ANULADA por castigo"),
    (r"\bOfficial Measurement\b", "Medición oficial"),
    (r"One-yard difference on change of possession", "Diferencia de una yarda en el cambio de posesión"),
    (r"\(Timeout #(\d+) at (\d*:\d+)\.\)", r"(Tiempo fuera #\1 a las \2.)"),
    (r"\(Timeout #(\d+)\.\)", r"(Tiempo fuera #\1.)"),
    (r"\bTimeout #(\d+) by (\w+) at (\d*:\d+)", r"Tiempo fuera #\1 de \2 a las \3"),
    # Lesiones y elegibles
    (r"\bwas injured during the play", "se lesionó durante la jugada"),
    (r"His return is (Questionable|Doubtful|Probable)", lambda m: f"Su regreso es {REGRESO[m.group(1)]}"),
    (r"\bHe is Out\b", "Queda descartado"),
    (r"\breported in as eligible", "se reporta como elegible"),
    # Comentarios del lanzamiento
    (r"\bPass batted at line\b", "Pase bateado en la línea"),
    (r"\bPass tipped at line\b", "Pase desviado en la línea"),
    (r"\bPass incomplete on a quick slant\b", "Pase incompleto en una ruta slant rápida"),
    (r"\bThrown away, under pressure\b", "Balón tirado fuera, bajo presión"),
    (r"\bthrown away from outside the pocket\b", "balón tirado fuera desde afuera del pocket"),
    (r"\b[Bb]all thrown away\b", "Balón tirado fuera"),
    (r"\bThrown away\b", "Balón tirado fuera"),
    (r"\bPass (-?\d+), YAC (-?\d+)", r"Pase de \1 yardas en el aire, \2 yardas después de la recepción"),
    (r"\bPass broken up by\b", "Pase desviado por"),
    (r"\bPass incomplete on a deep go route\b", "Pase incompleto en una ruta profunda (go)"),
    (r"\bball landed at the (\d+) yard line\b", r"el balón cayó en la yarda \1"),
    (r"\bPass was caught out of bounds\b", "El pase se atrapó fuera del campo"),
    (r"\bCoverage by\b", "Cobertura de"),
    (r"\b[Oo]fficial [Mm]easurement\b", "Medición oficial"),
    (r"\bin at QB for this play\b", "entra como QB en esta jugada"),
    (r"\bin at QB\b", "entra como QB"),
    (r"\bnow at QB\b", "ahora es el QB"),
    (r"\bchooses (\d+) second runoff\b", r"elige descontar \1 segundos"),
    (r"(#\d+) injured\b", r"\1 lesionado"),
    (r"\bbajo presión from\b", "bajo presión de"),
    (r"\bPressure on QB:", "Presión sobre el QB:"),
    (r"\bPressure by\b", "Presión de"),
    (r"\bat quarterback\b", "como quarterback"),
    (r"\bintercepted the try attempt\b", "interceptó el intento de conversión"),
    # Castigos
    (r"\bPENALTY on\b", "CASTIGO a"),
    (r"\bPenalty on\b", "Castigo a"),
    (r"\benforced at " + POS + r" - No Play", r"aplicado en \1 - jugada anulada"),
    (r"\benforced between downs", "aplicado entre downs"),
    (r"\benforced at\b", "aplicado en"),
    (r"\boffsetting\b", "se compensan"),
    (r"\bdeclined\b", "declinado"),
    # Balón suelto e intercepción
    (r"\bFUMBLES\b", "BALÓN SUELTO (FUMBLE)"),
    (r"\bRECOVERED by\b", "RECUPERADO por"),
    (r"\brecovered by\b", "recuperado por"),
    (r"\band recovers at\b", "y lo recupera en"),
    (r"\brecovers at\b", "recupera en"),
    (r"\bball out of bounds in End Zone", "balón fuera del campo en la zona de anotación"),
    (r"\bball out of bounds at\b", "balón fuera del campo en"),
    (r"\bout of bounds\b", "fuera del campo"),
    (r"\bINTERCEPTED by\b", "INTERCEPTADO por"),
    (r"\bintended for\b", "dirigido a"),
    (r"\bTouchback\b", "Touchback (balón muerto en la zona de anotación)"),
    (r"\bTOUCHDOWN\b", "ANOTACIÓN (TOUCHDOWN)"),
    (r"\bCaught at\b", "Atrapado en"),
    (r"\bCaught (?=[A-Z]{2,3} -?\d)", "Atrapado en "),
    (r"(-?\d+)-YAC\b", r"\1 yardas después de la recepción"),
    # Sack
    (r"\bsack split by (.+?) and (.+?)\)", r"sack compartido entre \1 y \2)"),
    (r"\bsacked ob at\b", "capturado (sack) fuera del campo en"),
    (r"\bsacked at\b", "capturado (sack) en"),
    # Scramble
    (r"\bscrambles up the middle\b", "escapa por el centro"),
    (r"\bscrambles right end\b", "escapa por la banda derecha"),
    (r"\bscrambles left end\b", "escapa por la banda izquierda"),
    (r"\bscrambles right (guard|tackle)\b", "escapa por la derecha"),
    (r"\bscrambles left (guard|tackle)\b", "escapa por la izquierda"),
    (r"\bscrambles\b", "escapa"),
    (r"\bup the middle\b", "por el centro"),
    (r"\bright end\b", "por la banda derecha"),
    (r"\bleft end\b", "por la banda izquierda"),
    # Salida del campo
    (r"\bpushed ob at\b", "empujado fuera del campo en"),
    (r"\bran ob at\b", "sale del campo en"),
    # Pase: tipo, profundidad y dirección
    (r"\bpass incomplete\b", "pase incompleto"),
    (r"\bpass\b", "pase"),
    (r"\bshort right\b", "corto a la derecha"),
    (r"\bshort left\b", "corto a la izquierda"),
    (r"\bshort middle\b", "corto por el centro"),
    (r"\bdeep right\b", "profundo a la derecha"),
    (r"\bdeep left\b", "profundo a la izquierda"),
    (r"\bdeep middle\b", "profundo por el centro"),
    (r"(?<=pase )right\b", "a la derecha"),
    (r"(?<=pase )left\b", "a la izquierda"),
    (r"(?<=pase )middle\b", "por el centro"),
    (r"(?<=pase incompleto )right\b", "a la derecha"),
    (r"(?<=pase incompleto )left\b", "a la izquierda"),
    (r"(?<=pase incompleto )middle\b", "por el centro"),
    # Avance y yardas
    (r"\bfor no gain\b", "sin ganancia"),
    (r"\bfor (-?\d+) yards\b", r"por \1 yardas"),
    (r"\bfor (-?\d+) yard\b", r"por \1 yarda"),
    (r"\b(\d+) yards\b", r"\1 yardas"),
    (r"\bto " + POS + r"\b", r"hasta \1"),
    (r"\bat " + POS + r"\b", r"en \1"),
    (r"\bat (\d+)\b", r"en \1"),
    (r"\bto\b", "para"),
    (r"\band\b", "y"),
]
REGLAS = [(re.compile(p), r) for p, r in REGLAS]
_FALTAS = re.compile("|".join(re.escape(k) for k in sorted(FALTAS, key=len, reverse=True)))


@lru_cache(maxsize=None)
def traducir(texto: str) -> str:
    if not isinstance(texto, str):
        return texto
    t = _FALTAS.sub(lambda m: FALTAS[m.group(0)], texto)
    for patron, reemplazo in REGLAS:
        t = patron.sub(reemplazo, t)
    return t
