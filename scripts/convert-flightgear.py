"""Convert explicitly licensed FlightGear AC3D exterior meshes to glTF.
Run with Blender: blender -b -t 2 --python scripts/convert-flightgear.py -- SOURCE OUT AIRLINE
Model assets retain their upstream GPL-2.0 licence; this conversion script is Apache-2.0.
"""
import bpy, sys, shlex, pathlib, math, json
from mathutils import Matrix, Vector
args=sys.argv[sys.argv.index('--')+1:]; root=pathlib.Path(args[0]).resolve(); out=pathlib.Path(args[1]).resolve(); airline=args[2] if len(args)>2 else 'BAW'; lod=len(args)>3 and args[3]=='lod'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}; images={}; bounds=[]
convert=Matrix(((-1,0,0,0),(0,0,1,0),(0,1,0,0),(0,0,0,1)))
def getmaterial(acmat,texture,engine=False):
 name,rgb,trans=acmat; source=root/'Models'/texture
 if texture in ['787-9.png','787-10.png','BOE-8.png']:source=root/f'Models/Liveries-9/Trent1000/{airline}.png'
 if texture=='Trent1000.png':source=root/f'Models/Liveries-engines/{airline}.png'
 key=(str(source),name,trans)
 if key in materials:return materials[key]
 m=bpy.data.materials.new(name+'_'+source.stem);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.36;p.inputs['Metallic'].default_value=.15
 if source.is_file():
  img=images.get(str(source))
  if img is None:
   img=bpy.data.images.load(str(source));images[str(source)]=img
   if max(img.size)>2048:img.scale(round(img.size[0]*2048/max(img.size)),round(img.size[1]*2048/max(img.size)))
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
  if texture=='Window.png':
   p.inputs['Base Color'].default_value=(.025,.06,.085,1)
   for l in list(p.inputs['Base Color'].links):m.node_tree.links.remove(l)
   p.inputs['Roughness'].default_value=.18;p.inputs['Metallic'].default_value=.4
 else:
  print('MISSING',source)
 if 'chrome' in name.lower():p.inputs['Metallic'].default_value=.8
 materials[key]=m;return m

def readac(file):
 lines=file.read_text(errors='replace').splitlines();i=1;acm=[]
 while i<len(lines) and lines[i].startswith('MATERIAL'):
  v=shlex.split(lines[i]);acm.append((v[1],tuple(float(x) for x in v[v.index('rgb')+1:v.index('rgb')+4]),float(v[v.index('trans')+1])));i+=1
 def node(parent=Matrix.Identity(4)):
  nonlocal i
  if i>=len(lines):return
  kind=lines[i].split()[1];i+=1
  name=kind;loc=Vector((0,0,0));rot=Matrix.Identity(3);verts=[];faces=[];uvs=[];mats=[];smooth=[];texture='';repeat=(1,1);offset=(0,0)
  while i<len(lines):
   v=shlex.split(lines[i]);i+=1
   if not v:continue
   k=v[0]
   if k=='name':name=v[1]
   elif k=='texture':texture=v[1]
   elif k=='texrep':repeat=tuple(map(float,v[1:]))
   elif k=='texoff':offset=tuple(map(float,v[1:]))
   elif k=='loc':loc=Vector(tuple(map(float,v[1:])))
   elif k=='rot':rot=Matrix([list(map(float,v[1+a*3:4+a*3])) for a in range(3)])
   elif k=='data':i+=1
   elif k=='numvert':
    for _ in range(int(v[1])):verts.append(tuple(map(float,lines[i].split())));i+=1
   elif k=='numsurf':
    for _ in range(int(v[1])):
     flags=0;mat=0
     while True:
      q=lines[i].split();i+=1
      if q[0]=='SURF':flags=int(q[1],0)
      elif q[0]=='mat':mat=int(q[1])
      elif q[0]=='refs':break
     refs=[];uv=[]
     for _ in range(int(q[1])):
      q=lines[i].split();i+=1;refs.append(int(q[0]));uv.append((float(q[1])*repeat[0]+offset[0],float(q[2])*repeat[1]+offset[1]))
     if len(refs)>2 and flags&0xf==0:faces.append(refs);uvs.append(uv);mats.append(mat);smooth.append(bool(flags&0x10))
   elif k=='kids':
    local=rot.to_4x4();local.translation=loc;world=parent@local
    # Bright/dim cabin overlays and blurred spinning discs are simulator effects.
    omit=texture in ['windows-bright.png','windows-dim.png'] or name in ['eng1fan1','eng2fan1','eng1fanb','eng2fanb']
    if faces and not omit:
     mesh=bpy.data.meshes.new(name);mesh.from_pydata([convert@world@Vector(v) for v in verts],[],faces);mesh.update()
     for mat in acm:mesh.materials.append(getmaterial(mat,texture,file.name=='Trent1000.ac'))
     uv=mesh.uv_layers.new(name='UVMap')
     for poly,coords,mat,sm in zip(mesh.polygons,uvs,mats,smooth):
      poly.material_index=mat;poly.use_smooth=sm
      for li,co in zip(poly.loop_indices,coords):uv.data[li].uv=co
     obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
     if len(mesh.polygons)>(100 if lod else 3500):
      mod=obj.modifiers.new('Exterior web detail','DECIMATE');mod.ratio=(.02 if lod else .28) if file.name=='Trent1000.ac' else (.25 if lod else .75)
      bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    for _ in range(int(v[1])):node(world)
    return
 node()
readac(root/'787-9.ac');readac(root/'Models/Trent1000.ac')
# Preserve names so the runtime can separate wheels/struts from the fixed airframe.
objects=list(bpy.context.scene.objects);vs=[o.matrix_world@v.co for o in objects if o.type=='MESH' for v in o.data.vertices]
lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)];print('MODEL_BOUNDS',lo,hi,'POLYGONS',sum(len(o.data.polygons) for o in objects if o.type=='MESH'))
# Centre along length, with the same 5.5 m ground-height convention as the game.
for o in objects:o.location.x-=(lo[0]+hi[0])/2;o.location.z+=-lo[2]-5.5
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
