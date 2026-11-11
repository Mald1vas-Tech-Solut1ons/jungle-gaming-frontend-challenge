# Gera o lockup KURIO (mark + wordmark) em SVG com glifos vetoriais reais
# do Montserrat ExtraBold (OFL), a partir do woff2 do @fontsource.
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

FONT = r'C:\Users\rafae\Dev\jungle-gaming-frontend-challenge\node_modules\@fontsource\montserrat\files\montserrat-latin-800-normal.woff2'
OUT = r'C:\Users\rafae\Dev\jungle-gaming-frontend-challenge\public\logo.svg'

CREAM = '#F5F1EB'
ORANGE = '#D28A4C'
DARK = '#140D0A'

font = TTFont(FONT)
cmap = font.getBestCmap()
glyphset = font.getGlyphSet()
hmtx = font['hmtx']
upm = font['head'].unitsPerEm  # 1000

TEXT = 'KURIO'
GLYPH_FILLS = {i: (ORANGE if ch == 'O' else CREAM) for i, ch in enumerate(TEXT)}

# Compõe os glyphs com advances (sem kerning GPOS — Montserrat é bem comportada)
units = []
x = 0
for i, ch in enumerate(TEXT):
    gname = cmap[ord(ch)]
    adv = hmtx[gname][0]
    pen = SVGPathPen(glyphset)
    glyphset[gname].draw(pen)
    d = pen.getCommands()
    units.append((d, x))
    x += adv
text_width = x

# Escala: cap height alvo ~ 112 unidades de viewBox; cap ~ 700/1000 em
CAP = 700  # cap height aproximada do Montserrat em unidades
TARGET_CAP = 116
scale = TARGET_CAP / CAP

MARK = 150          # largura do mark (quadrado + O)
GAP = 44            # espaço entre mark e texto
PAD = 16
text_w = text_width * scale
H = 200             # altura do canvas
W = PAD + MARK + GAP + text_w + PAD

parts = []
# Mark: quadrado arredondado âmbar + anel escuro + centro âmbar
parts.append(f'<rect x="{PAD}" y="{(H-MARK)/2}" width="{MARK}" height="{MARK}" rx="{MARK*0.22:.1f}" fill="{ORANGE}"/>')
r = MARK * 0.36
parts.append(f'<circle cx="{PAD+MARK/2}" cy="{H/2}" r="{r:.1f}" fill="{DARK}"/>')
parts.append(f'<circle cx="{PAD+MARK/2}" cy="{H/2}" r="{r*0.42:.1f}" fill="{ORANGE}"/>')

# Wordmark (baseline alinhada ao centro do canvas)
# O Montserrat tem ascender ~968/1000; centraliza usando cap: posiciona o
# topo do cap em (H - TARGET_CAP)/2
baseline = (H + TARGET_CAP) / 2
for i, (d, gx) in enumerate(units):
    tx = PAD + MARK + GAP + gx * scale
    parts.append(f'<path fill="{GLYPH_FILLS[i]}" transform="translate({tx:.2f} {baseline:.2f}) scale({scale:.4f} -{scale:.4f})" d="{d}"/>')

svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} {H}" role="img" aria-label="Kurio">' + ''.join(parts) + '</svg>'
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(svg)
print(f'OK {OUT} ({W:.0f}x{H}) glyphs={len(units)} text_width={text_w:.0f}')
