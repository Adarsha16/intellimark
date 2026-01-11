import os

fonts = [
    "C:/Windows/Fonts/consola.ttf",
    "C:/Windows/Fonts/cour.ttf",
    "C:/Windows/Fonts/times.ttf",
    "C:/Windows/Fonts/georgia.ttf",
    "C:/Windows/Fonts/segoesc.ttf",
    "C:/Windows/Fonts/comic.ttf",
    "C:/Windows/Fonts/impact.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/seguiSb.ttf", 
    "C:/Windows/Fonts/calibrib.ttf", 
    "C:/Windows/Fonts/arial.ttf"
]

print("Font Check:")
for f in fonts:
    exists = os.path.exists(f)
    print(f"[{'FOUND' if exists else 'MISSING'}] {f}")
