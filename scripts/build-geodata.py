"""Build the ODbL geometry subset from downloaded OSM map XML in work/.
Optional preparation dependency: pip install shapely (or --target work/python-libs).
All coordinates use a local, metre-scaled Web Mercator frame at Heathrow.
"""
import sys,glob,math,json,xml.etree.ElementTree as E,os
sys.path.insert(0,'work/python-libs')
from shapely.geometry import Polygon
ORIGIN=(-.46064,51.47122); R=6378137; SCALE=math.cos(math.radians(ORIGIN[1]))
def merc(lon,lat):return R*math.radians(lon),R*math.log(math.tan(math.pi/4+math.radians(lat)/2))
OX,OY=merc(*ORIGIN)
def point(lon,lat):
 x,y=merc(lon,lat);return [round((x-OX)*SCALE,1),round(-(y-OY)*SCALE,1)]
nodes={};ways={}
for file in glob.glob('work/osm-*.xml'):
 root=E.parse(file).getroot()
 for n in root.findall('node'):nodes[n.attrib['id']]=point(float(n.attrib['lon']),float(n.attrib['lat']))
 for w in root.findall('way'):ways[w.attrib['id']]=w
out={'origin':ORIGIN,'attribution':'© OpenStreetMap contributors','license':'ODbL-1.0','source':'https://www.openstreetmap.org/copyright','buildings':[],'aeroways':[],'roads':[],'woods':[],'grass':[]}
for id,w in ways.items():
 tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')};pts=[nodes[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in nodes]
 if len(pts)<2:continue
 if tags.get('aeroway') in ['taxiway','runway','apron','parking_position']:
  out['aeroways'].append({'id':int(id),'kind':tags['aeroway'],'ref':tags.get('ref',''),'points':pts,'width':float(tags.get('width','23').split()[0]) if tags.get('width','23').split()[0].replace('.','',1).isdigit() else 23})
 if tags.get('highway') in ['motorway','trunk','primary','secondary','tertiary','residential','service']:
  out['roads'].append({'kind':tags['highway'],'points':pts})
 if (tags.get('landuse') in ['grass','meadow'] or tags.get('natural')=='grassland') and len(pts)>=4 and pts[0]==pts[-1]:out['grass'].append(pts)
 if tags.get('natural') in ['wood'] or tags.get('landuse')=='forest':out['woods'].append(pts)
 if tags.get('building') and len(pts)>=4 and pts[0]==pts[-1] and tags['building'] not in ['roof','construction']:
  poly=Polygon(pts)
  if not poly.is_valid:poly=poly.buffer(0)
  if poly.geom_type!='Polygon' or poly.area<25:continue
  terminal=tags.get('aeroway')=='terminal'
  if terminal:
   core=poly.buffer(-9).buffer(9,join_style=2)
   if not core.is_empty:
    if core.geom_type=='MultiPolygon':core=max(core.geoms,key=lambda p:p.area)
    poly=core
  poly=poly.simplify(.8,preserve_topology=True)
  try:h=float(tags.get('height',float(tags.get('building:levels',2))*3.2))
  except:h=8
  h=max(3,min(70,h));out['buildings'].append({'id':int(id),'name':tags.get('name',''),'kind':tags['building'],'terminal':terminal,'height':h,'points':[[round(x,1),round(z,1)] for x,z in poly.exterior.coords]})
os.makedirs('public/data',exist_ok=True)
open('public/data/heathrow.json','w').write(json.dumps(out,separators=(',',':')))
print({k:len(v) for k,v in out.items() if isinstance(v,list)})
print([{k:b[k] for k in ['id','name','height']}|{'bounds':[min(p[0] for p in b['points']),min(p[1] for p in b['points']),max(p[0] for p in b['points']),max(p[1] for p in b['points'])]} for b in out['buildings'] if b['terminal']])
print('tower',point(-.4655094,51.4717604))
