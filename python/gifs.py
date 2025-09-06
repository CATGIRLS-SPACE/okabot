from PIL import Image
import imageio
import sys
import numpy as np

new_width = 600

banner = Image.open(sys.argv[1])
overlay = Image.open(sys.argv[2])
frames = []

print(banner, overlay)

# single-frame image case
if not hasattr(banner, 'n_frames'):
    print('banner has no n_frames attr')
    imageio.imwrite(sys.argv[3], np.array(banner.copy()))
    exit()

# multi-frame (gif) image case
for frame in range(banner.n_frames):
    banner.seek(frame)
    banner_frame = banner.copy().convert('RGBA')

    w, h = banner_frame.size
    new_height = int(h * (new_width / w))
    banner_resized = banner_frame.resize((new_width, new_height), Image.LANCZOS)

    canvas_height = overlay.height
    canvas = Image.new('RGBA', (new_width, canvas_height), (0, 0, 0, 0))

    y_offset = (canvas_height - new_height) // 2
    canvas.paste(banner_resized, (0, y_offset), banner_resized)

    canvas.paste(overlay, (0, 0), overlay)
    frames.append(np.array(canvas))  # convert each frame to numpy array

imageio.mimsave(sys.argv[3], frames, loop=0)
