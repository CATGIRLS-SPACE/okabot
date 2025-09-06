from PIL import Image
import imageio
import sys

new_width = 600

banner = Image.open(sys.argv[1])
overlay = Image.open(sys.argv[2])
frames = []

for frame in range(banner.n_frames if hasattr(banner, 'n_frames') else 1):
    banner.seek(frame)
    banner_frame = banner.copy().convert('RGBA')
    
    # Resize banner to desired new_width, keeping aspect ratio
    w, h = banner_frame.size
    new_height = int(h * (new_width / w))
    banner_resized = banner_frame.resize((new_width, new_height), Image.LANCZOS)
    
    # Prepare a canvas ("height" is taken from overlay image, or set desired height)
    canvas_height = overlay.height
    canvas = Image.new('RGBA', (new_width, canvas_height), (0,0,0,0))
    
    # Center the resized banner vertically on the canvas
    y_offset = (canvas_height - new_height) // 2
    canvas.paste(banner_resized, (0, y_offset), banner_resized)
    
    # Overlay the additional image
    canvas.paste(overlay, (0,0), overlay)
    frames.append(canvas)

imageio.mimsave('generated.gif', frames, loop=0)
