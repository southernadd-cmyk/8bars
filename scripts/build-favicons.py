from pathlib import Path
import io, sys
import cairosvg
from PIL import Image
out=Path(sys.argv[1] if len(sys.argv)>1 else 'dist')
source=(out/'favicon.svg').read_bytes()
images={n:Image.open(io.BytesIO(cairosvg.svg2png(bytestring=source,output_width=n,output_height=n))).convert('RGBA') for n in (16,32,48,64,180,256)}
images[256].save(out/'favicon.ico',format='ICO',sizes=[(n,n) for n in (16,32,48,64,256)])
images[180].save(out/'apple-touch-icon.png')
print('Created browser favicon and Apple touch icon')
