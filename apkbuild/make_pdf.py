#!/usr/bin/env python3
"""Genera el PDF: Guia para publicar Fusion 1.7 en F-Droid."""
from fpdf import FPDF

BLUE = (27, 110, 243)
DARK = (30, 30, 30)
GRAY = (90, 90, 90)
LIGHT = (235, 241, 255)

pdf = FPDF(format="A4", unit="mm")
pdf.set_auto_page_break(auto=True, margin=18)
pdf.set_margins(18, 16, 18)

DJ = "/usr/share/fonts/truetype/dejavu/"
pdf.add_font("Fusion", "", DJ + "DejaVuSans.ttf")
pdf.add_font("Fusion", "B", DJ + "DejaVuSans-Bold.ttf")
pdf.add_font("FusionMono", "", DJ + "DejaVuSansMono.ttf")
pdf.add_font("FusionMono", "B", DJ + "DejaVuSansMono-Bold.ttf")

# ---------- helpers ----------
def section(title):
    pdf.ln(4)
    pdf.set_font("Fusion", "B", 14)
    pdf.set_text_color(*BLUE)
    pdf.cell(0, 9, title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(*BLUE)
    pdf.set_line_width(0.6)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(3)

def para(text):
    pdf.set_font("Fusion", "", 10.5)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 6, text)
    pdf.ln(1)

def bullet(text):
    pdf.set_font("Fusion", "", 10.5)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 6, "  \u2022  " + text)
    pdf.ln(0.5)

def step(n, text):
    pdf.set_font("Fusion", "B", 11)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 6.5, f"Paso {n}. {text}", new_x="LMARGIN", new_y="NEXT")

def code(text):
    pdf.set_font("FusionMono", "", 9)
    pdf.set_fill_color(*LIGHT)
    pdf.set_text_color(*DARK)
    x = pdf.get_x(); y = pdf.get_y()
    pdf.multi_cell(0, 5.5, text, fill=True)
    pdf.ln(1)

def table(headers, rows, widths):
    pdf.set_font("Fusion", "B", 9.5)
    pdf.set_fill_color(*BLUE)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(widths[0], 7, headers[0], fill=True)
    pdf.cell(widths[1], 7, headers[1], fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Fusion", "", 9.5)
    pdf.set_text_color(*DARK)
    fill = False
    for r in rows:
        pdf.set_fill_color(245, 247, 252)
        pdf.cell(widths[0], 7, r[0], fill=fill)
        pdf.cell(widths[1], 7, r[1], fill=fill, new_x="LMARGIN", new_y="NEXT")
        fill = not fill
    pdf.ln(2)

# ---------- cover ----------
pdf.add_page()
pdf.set_fill_color(*BLUE)
pdf.rect(0, 0, 210, 42, style="F")
pdf.set_xy(18, 14)
pdf.set_font("Fusion", "B", 26)
pdf.set_text_color(255, 255, 255)
pdf.cell(0, 12, "Fusion 1.7", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Fusion", "", 13)
pdf.cell(0, 8, "Telegram fork + Mastodon \u2014 la mejor app social", new_x="LMARGIN", new_y="NEXT")

pdf.set_xy(18, 58)
pdf.set_font("Fusion", "B", 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, "Gu\u00eda para publicar en F-Droid", new_x="LMARGIN", new_y="NEXT")
pdf.ln(2)
para("Documento paso a paso para: (1) obtener el APK mejorado de Fusion 1.7 y "
     "(2) publicarlo en la tienda de apps libres F-Droid.")
pdf.ln(4)
pdf.set_font("Fusion", "", 10)
pdf.set_text_color(*GRAY)
pdf.cell(0, 6, "Versi\u00f3n de la app: 1.7  \u00b7  VersionCode: 17  \u00b7  Paquete: com.fusion.app", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 6, "Repositorio fuente: https://github.com/elrelrelr/Fusion", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 6, "Licencia: GPL-3.0", new_x="LMARGIN", new_y="NEXT")

# ---------- pagina 2: obtener APK ----------
pdf.add_page()
section("Parte 1 \u2014 C\u00f3mo obtener el APK mejorado")
para("El APK mejorado de Fusion 1.7 se obtiene compilando el c\u00f3digo fuente. Hay "
     "varias v\u00edas; elige la que mejor se adapte a ti.")

step(1, "Obtenlo ya (APK de prueba)")
para("Se incluye un APK firmado de prueba con la app b\u00e1sica (m\u00ednima) lista para "
     "instalar y probar. Para la versi\u00f3n completa con las mejoras, usa los pasos 2 a 4.")
para("Instalaci\u00f3n: copia el .apk al tel\u00e9fono, act\u00edvalo en "
     "Ajustes > Seguridad > Or\u00edgenes desconocidos y abre el archivo.")

step(2, "Compila con Gradle (local)")
para("Requisito: JDK 17. Desde la ra\u00edz del repositorio:")
code("gradle assembleRelease")
para("Resultado: app/build/outputs/apk/release/app-release-unsigned.apk")

step(3, "Compila autom\u00e1ticamente con GitHub Actions (recomendado)")
para("El repositorio incluye el workflow en docs/ci/build-apk-workflow.yml. Act\u00edvalo:")
code("mkdir -p .github/workflows\n"
     "cp docs/ci/build-apk-workflow.yml .github/workflows/build-apk.yml\ngit add . && git commit -m 'Enable APK CI' && git push")
para("Cada push compila el APK y lo sube como artefacto descargable en "
     "GitHub > Actions > la ejecuci\u00f3n > Artifacts.")

step(4, "Deja que F-Droid lo compile (la v\u00eda para publicar)")
para("F-Droid compila y firma el APK desde el c\u00f3digo fuente. Sigue la Parte 2.")

# ---------- Parte 2: F-Droid ----------
pdf.add_page()
section("Parte 2 \u2014 Publicar Fusion en F-Droid, paso a paso")

step(1, "Comprueba que el proyecto est\u00e1 listo")
para("Tu repositorio ya incluye el metadata de build (archivo .fdroid.yml en la "
     "ra\u00edz) y la licencia GPL-3.0. Esto es lo m\u00ednimo que pide F-Droid.")
code("git clone https://github.com/elrelrelr/Fusion.git\ncd Fusion\nls -la .fdroid.yml LICENSE")

step(2, "Revisa el metadata de build (.fdroid.yml)")
para("Comprueba que los campos principales coinciden con tu app:")
table(["Campo", "Valor"],
      [["RepoType", "git"],
       ["Repo", "https://github.com/elrelrelr/Fusion.git"],
       ["CurrentVersion", "1.7"],
       ["CurrentVersionCode", "17"],
       ["License", "GPL-3.0-only"]],
      [55, 105])

step(3, "Elige la forma de env\u00edo")
para("A) Formulario oficial de F-Droid (recomendado): entra en https://f-droid.org y "
     "pulsa \u201cSubmit an App\u201d.")
para("B) Petici\u00f3n por correo/issue: abre una petici\u00f3n en el repositorio de datos "
     "de F-Droid: https://gitlab.com/fdroid/fdroiddata/-/issues")
para("Indica que el repositorio de la app es el de GitHub y que el .fdroid.yml est\u00e1 "
     "en la ra\u00edz.")

step(4, "Rellena los datos de la app")
table(["Campo", "Valor"],
      [["Name", "Fusion"],
       ["Source Code", "https://github.com/elrelrelr/Fusion"],
       ["License", "GPL-3.0"],
       ["Categories", "Internet"],
       ["Summary", "Telegram fork + Mastodon \u2014 the best social app ever"],
       ["Description", "Mensajer\u00eda estilo Telegram + red social federada (Mastodon)"]],
      [55, 105])

step(5, "Espera la revisi\u00f3n")
para("El equipo de F-Droid (o un mantenedor del repo fdroiddata) importar\u00e1 el "
     "metadata, compilar\u00e1 Fusion desde el c\u00f3digo, lo firmar\u00e1 con la clave de "
     "F-Droid y lo publicar\u00e1. Este proceso puede tardar desde unos d\u00edas hasta unas "
     "semanas.")

step(6, "Verifica que aparece en la tienda")
para("Una vez publicado, busca \u201cFusion\u201d en la app de F-Droid o en "
     "https://f-droid.org/es/packages/com.fusion.app/. Cuando actualices el c\u00f3digo y "
     "a\u00f1adas una etiqueta (por ejemplo v1.8), F-Droid detecta la versi\u00f3n nueva y la "
     "recompila autom\u00e1ticamente.")

# ---------- FAQ ----------
pdf.add_page()
section("Preguntas frecuentes (FAQ)")
bullet("\u00bfPor qu\u00e9 F-Droid no recibe el .apk directamente? Porque F-Droid compila y "
       "firma desde el c\u00f3digo fuente para garantizar que la app es libre y auditable.")
bullet("\u00bfNecesito un APK firmado para F-Droid? No. F-Droid firma con su propia clave. "
       "El APK firmado de la Parte 1 es solo para probar.")
bullet("\u00bfCada cu\u00e1nto se actualiza en F-Droid? F-Droid revisa por etiquetas (tags). "
       "Crea una etiqueta por cada versi\u00f3n, por ejemplo v1.8.")
bullet("\u00bfEl APK de prueba se instala? S\u00ed. Est\u00e1 firmado y verificado. Si tu tel\u00e9fono "
       "exige v2/v3 de firma y no instala, usa la v\u00eda de GitHub Actions o F-Droid para "
       "obtener un APK firmado con las herramientas oficiales.")
bullet("\u00bfD\u00f3nde est\u00e1 el c\u00f3digo mejorado? En el repositorio GitHub. El APK de prueba "
       "incluido es una app m\u00ednima; las mejoras completas (chats, feed, navegaci\u00f3n) se "
       "compilan con Gradle o GitHub Actions.")

pdf.ln(4)
pdf.set_font("Fusion", "B", 11)
pdf.set_text_color(*BLUE)
pdf.cell(0, 8, "Resumen de datos \u00fatiles", new_x="LMARGIN", new_y="NEXT")
table(["Dato", "Valor"],
      [["Package ID", "com.fusion.app"],
       ["VersionName / VersionCode", "1.7 / 17"],
       ["Min / Target SDK", "26 / 34"],
       ["Repositorio", "https://github.com/elrelrelr/Fusion"],
       ["Archivo de build F-Droid", ".fdroid.yml (ra\u00edz)"],
       ["Workflow de APK", "docs/ci/build-apk-workflow.yml"],
       ["Licencia", "GPL-3.0"]],
      [55, 105])

out = "Guia-Fusion-FDroid.pdf"
pdf.output(out)
print("PDF generado:", out)
