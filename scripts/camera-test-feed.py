"""Create a short virtual camera loop from the supplied FAIRY studio model."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / "public/assets/images/face_base_neutral.png"
output = root / ".camera-test-fixtures/face.y4m"
output.parent.mkdir(exist_ok=True)
size = (640, 480)
with Image.open(source) as image:
    face = image.convert("RGB").crop((120, 150, 1010, 1370))
    face.thumbnail((500, size[1]), Image.Resampling.LANCZOS)
    frame = Image.new("RGB", size, "#ddd1c5")
    frame.paste(face, ((size[0] - face.width) // 2, 0))
    y, cb, cr = frame.convert("YCbCr").split()
    chroma_size = (size[0] // 2, size[1] // 2)
    pixels = y.tobytes() + cb.resize(chroma_size, Image.Resampling.BOX).tobytes() + cr.resize(chroma_size, Image.Resampling.BOX).tobytes()

with output.open("wb") as video:
    video.write(b"YUV4MPEG2 W640 H480 F24:1 Ip A1:1 C420jpeg\n")
    for _ in range(24):
        video.write(b"FRAME\n" + pixels)
print("Prepared FAIRY’s simulated camera feed.")

