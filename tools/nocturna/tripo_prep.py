"""Prepara un GLB animado de Tripo para Nocturna: une mallas, reduce la textura a 512 (JPEG), conserva esqueleto y animaciones.
Uso: python tripo_prep.py entrada.glb salida.glb [caras_max]"""
import sys, bpy, os

src, dst = sys.argv[1], sys.argv[2]
maxf = int(sys.argv[3]) if len(sys.argv) > 3 else 0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in [o for o in bpy.data.objects if o.type == 'MESH' and not o.vertex_groups and len(o.data.polygons) < 200]:
    bpy.data.objects.remove(o)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
print('mallas', [(o.name, len(o.data.polygons)) for o in meshes], 'esqueletos', [a.name for a in arms])
print('acciones', [(a.name, round(a.frame_range[1] - a.frame_range[0])) for a in bpy.data.actions])
if maxf:
    for o in meshes:
        n = len(o.data.polygons)
        if n > maxf:
            m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = maxf / n
            bpy.context.view_layer.objects.active = o
            # aplicar antes de la armadura
            while o.modifiers[0].name != 'dec': bpy.ops.object.modifier_move_up(modifier='dec')
            bpy.ops.object.modifier_apply(modifier='dec')
for im in bpy.data.images:
    if im.size[0] > 512:
        im.scale(512, 512)
    im.file_format = 'JPEG'
# todas las acciones como pistas NLA para que se exporten
for a in arms:
    ad = a.animation_data or a.animation_data_create()
    for act in bpy.data.actions:
        tr = ad.nla_tracks.new(); tr.name = act.name; tr.strips.new(act.name, int(act.frame_range[0]), act)
    ad.action = None
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=82,
                          export_animations=True, export_animation_mode='NLA_TRACKS', export_apply=False)
print('salida', dst, os.path.getsize(dst))
