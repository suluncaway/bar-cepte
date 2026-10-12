import math
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import imageio.v3 as iio

def create_ambient_loop(
    source_img_path="editorial-cocktails.webp",
    output_path="hero-cocktail-ambient.mp4",
    duration_sec=6.0,
    fps=30
):
    print(f"Loading source image {source_img_path}...")
    base_img = Image.open(source_img_path).convert("RGB")
    width, height = base_img.size
    
    # Scale to standard 720p 16:9 or maintain aspect ratio (1280x720)
    target_w = 1280
    target_h = 720
    
    # Crop / fit to 1280x720
    aspect_target = target_w / target_h
    aspect_base = width / height
    
    if aspect_base > aspect_target:
        new_h = height
        new_w = int(height * aspect_target)
        left = (width - new_w) // 2
        top = 0
        crop_box = (left, top, left + new_w, top + new_h)
    else:
        new_w = width
        new_h = int(width / aspect_target)
        left = 0
        top = (height - new_h) // 2
        crop_box = (left, top, left + new_w, top + new_h)
        
    cropped_base = base_img.crop(crop_box).resize((target_w, target_h), Image.Resampling.LANCZOS)
    base_arr = np.array(cropped_base, dtype=np.float32)

    total_frames = int(duration_sec * fps)
    print(f"Rendering {total_frames} frames ({duration_sec}s @ {fps}fps)...")
    
    frames = []
    
    # Generate random fixed particle seeds for mist & warm speakeasy embers
    np.random.seed(42)
    num_particles = 35
    particles = []
    for _ in range(num_particles):
        particles.append({
            "x": np.random.uniform(0.35, 0.75),   # Around cocktail glass
            "y_base": np.random.uniform(0.3, 0.8),
            "speed": np.random.uniform(0.12, 0.28),
            "size": np.random.uniform(4, 18),
            "drift_freq": np.random.uniform(1.0, 3.0),
            "drift_amp": np.random.uniform(0.02, 0.06),
            "opacity": np.random.uniform(0.15, 0.45)
        })

    for i in range(total_frames):
        t = i / total_frames  # normalized 0.0 to 1.0
        angle = 2 * math.pi * t
        
        # 1. Subtle camera breathing (zoom & pan)
        # 1.00 to 1.025 subtle zoom
        zoom = 1.0 + 0.022 * (0.5 - 0.5 * math.cos(angle))
        
        # 2. Candlelight & amber glow pulsation
        # Soft flicker using combined sine waves
        glow_factor = 1.0 + 0.06 * math.sin(angle) + 0.03 * math.sin(angle * 2.0)
        
        # Apply gentle zoom
        w_crop = target_w / zoom
        h_crop = target_h / zoom
        cx = target_w / 2 + 10 * math.sin(angle)
        cy = target_h / 2 + 6 * (0.5 - 0.5 * math.cos(angle))
        
        x1 = max(0, int(cx - w_crop / 2))
        y1 = max(0, int(cy - h_crop / 2))
        x2 = min(target_w, int(x1 + w_crop))
        y2 = min(target_h, int(y1 + h_crop))
        
        frame_crop = cropped_base.crop((x1, y1, x2, y2)).resize((target_w, target_h), Image.Resampling.BILINEAR)
        f_arr = np.array(frame_crop, dtype=np.float32)
        
        # Add warm amber highlights in the drink region (around glass center 45%-65% width, 35%-75% height)
        # Create subtle circular radial glow around the amber cocktail
        Y, X = np.ogrid[:target_h, :target_w]
        dist_from_glass = np.sqrt(((X - target_w * 0.52) / (target_w * 0.22))**2 + ((Y - target_h * 0.55) / (target_h * 0.25))**2)
        radial_mask = np.clip(1.0 - dist_from_glass, 0, 1)
        radial_mask = radial_mask ** 2
        
        # Modulate warm amber channels
        amber_boost = (glow_factor - 1.0) * 1.8
        f_arr[..., 0] += radial_mask * (35.0 * amber_boost)  # Red
        f_arr[..., 1] += radial_mask * (18.0 * amber_boost)  # Green
        f_arr[..., 2] += radial_mask * (3.0 * amber_boost)   # Blue
        
        # 3. Soft ambient mist / vapor particles
        mist_layer = np.zeros((target_h, target_w), dtype=np.float32)
        for p in particles:
            # Vertical looped position
            curr_y = (p["y_base"] - p["speed"] * t) % 1.0
            drift = p["drift_amp"] * math.sin(2 * math.pi * p["drift_freq"] * t)
            curr_x = p["x"] + drift
            
            px = int(curr_x * target_w)
            py = int(curr_y * target_h)
            
            # Fade in and fade out at top/bottom
            fade = math.sin(curr_y * math.pi)
            if 0 <= px < target_w and 0 <= py < target_h:
                r = int(p["size"])
                y_min = max(0, py - r)
                y_max = min(target_h, py + r)
                x_min = max(0, px - r)
                x_max = min(target_w, px + r)
                if y_max > y_min and x_max > x_min:
                    YY, XX = np.ogrid[y_min - py:y_max - py, x_min - px:x_max - px]
                    d2 = (XX / r)**2 + (YY / r)**2
                    spot = np.exp(-d2 * 2.5) * (p["opacity"] * fade)
                    mist_layer[y_min:y_max, x_min:x_max] += spot
                    
        mist_layer = np.clip(mist_layer, 0, 1)
        # Apply mist as warm soft highlights
        f_arr[..., 0] += mist_layer * 28.0
        f_arr[..., 1] += mist_layer * 22.0
        f_arr[..., 2] += mist_layer * 15.0
        
        # Final clip to valid uint8
        frame_final = np.clip(f_arr, 0, 255).astype(np.uint8)
        frames.append(frame_final)
        
    print(f"Writing MP4 video to {output_path}...")
    iio.imwrite(
        output_path,
        frames,
        fps=fps,
        codec="libx264",
        quality=8,
        pixelformat="yuv420p"
    )
    print(f"Successfully generated {output_path}!")

if __name__ == "__main__":
    create_ambient_loop()
