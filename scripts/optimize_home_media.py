#!/usr/bin/env python3
"""Generate smaller homepage assets; never overwrite the original media."""
from pathlib import Path
import subprocess
import json
import re

ROOT = Path(__file__).resolve().parents[1]
HOMES = [ROOT / 'index.html'] + [ROOT / lang / 'index.html' for lang in ('en','pt','fr','de','it','zh','ja')]
IMAGES = {
    'assets/img/machu-picchu/machu-picchu-hero.jpg': ('assets/img/home-optimized/machu-picchu-hero.webp', 1440),
    **{f'assets/img/quote/fallbacks/{name}.jpg': (f'assets/img/home-optimized/{name}.webp', 960)
       for name in ('machu-picchu','cusco','valle-sagrado','valle-sagrado-vip','vinicunca')}
}
VIDEO = ('assets/videos/hero.mp4', 'assets/videos/hero-optimized.mp4')

def run(*args):
    subprocess.run(args, check=True)

def probe(path):
    result = subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)], text=True)
    return json.loads(result)

def size(path):
    return path.stat().st_size

def scale(w, h):
    return f"scale=w='min({w},iw)':h='min({h},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"

def validate(source, target, max_ratio=0.85):
    if not target.is_file() or not size(target) or size(target) >= size(source)*max_ratio:
        raise RuntimeError(f'Insufficient reduction: {source.name}')
    info = probe(target)
    if not any(s.get('codec_type') == 'video' for s in info['streams']):
        raise RuntimeError(f'Invalid media: {target}')
    return info

def main():
    report = []
    replacements = {}
    for original, (optimized, bound) in IMAGES.items():
        src, dst = ROOT/original, ROOT/optimized
        dst.parent.mkdir(parents=True, exist_ok=True)
        run('ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-vf',scale(bound,bound),
            '-frames:v','1','-c:v','libwebp','-quality','82','-compression_level','6',str(dst))
        validate(src,dst)
        report.append((original,optimized,size(src),size(dst)))
        replacements[original] = optimized

    original, optimized = VIDEO
    src,dst = ROOT/original,ROOT/optimized
    before = probe(src)
    run('ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-map','0:v:0','-an',
        '-vf',scale(1280,720)+',fps=24','-c:v','libx264','-preset','medium','-crf','26',
        '-pix_fmt','yuv420p','-movflags','+faststart',str(dst))
    after=validate(src,dst)
    duration_before=float(before['format']['duration'])
    duration_after=float(after['format']['duration'])
    if abs(duration_before-duration_after) > 0.15:
        raise RuntimeError('Unexpected video duration change')
    report.append((original,optimized,size(src),size(dst)))
    replacements[original] = optimized

    # Validate all eight pages before writing any HTML.
    planned = {}
    for path in HOMES:
        content = path.read_text(encoding='utf-8')
        for old,new in replacements.items():
            if old not in content:
                raise RuntimeError(f'Missing expected reference in {path.relative_to(ROOT)}: {old}')
            content=content.replace(old,new)
        if len(re.findall(r'<video\b',content)) != 1 or 'name="viewport"' not in content or 'name="description"' not in content:
            raise RuntimeError(f'Unexpected homepage structure: {path}')
        planned[path]=content
    for path,content in planned.items():
        path.write_text(content,encoding='utf-8')

    lines=['# Fase 1.2 — Medios de portada','',
           'Tamaños medidos en bytes de los archivos, no transferencia de red. Originales conservados.','',
           '| Original | Optimizado | Antes | Después | Reducción |','|---|---|---:|---:|---:|']
    for old,new,b,a in report:
        lines.append(f'| `{old}` | `{new}` | {b:,} | {a:,} | {(1-a/b)*100:.1f}% |')
    b=sum(x[2] for x in report)
    a=sum(x[3] for x in report)
    lines.extend([f'| Total | | {b:,} | {a:,} | {(1-a/b)*100:.1f}% |','',
                  'Pendiente: inspección visual, Lighthouse y pruebas de navegación, cotizador y reservas antes de fusionar.'])
    result=ROOT/'docs/RENDIMIENTO_MEDIOS_FASE1_2.md'
    result.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print('\n'.join(lines))

if __name__=='__main__':
    main()
