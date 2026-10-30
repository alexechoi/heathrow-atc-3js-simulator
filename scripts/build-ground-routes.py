"""Build departure paths using only the bundled OSM taxiway graph and stand leads."""
import json,math,heapq,pathlib
source=json.loads(pathlib.Path('public/data/heathrow.json').read_text());ways=source['aeroways'];nodes={};adj={}
def node(p):
 key=(round(p[0],1),round(p[1],1));nodes[key]=list(key);adj.setdefault(key,{});return key
for w in ways:
 if w['kind']!='taxiway':continue
 for a,b in zip(w['points'],w['points'][1:]):
  # Central terminal area: never route a departure across either active runway.
  if min(a[1],b[1]) < -652 or max(a[1],b[1]) > 645:continue
  u,v=node(a),node(b);d=math.dist(u,v)
  if d:adj[u][v]=d;adj[v][u]=d
# OSM's decimal metre rounding can separate coincident junctions by < 1 metre.
keys=list(nodes)
for i,u in enumerate(keys):
 for v in keys[i+1:]:
  if math.dist(u,v)<1.2:adj[u][v]=adj[v][u]=math.dist(u,v)
holds={'27R':(1888.7,-651.1),'27L':(1821.8,643.6)}
entries={'27R':[[1888.7,-651.1],[1867.9,-672.4],[1858.6,-681.9],[1838.1,-703.8],[1833.3,-708.6],[1828.4,-712.6],[1824.1,-714.7],[1818.6,-716.7],[1810,-718.6],[1760,-710]],'27L':[[1821.8,643.6],[1822.4,658.8],[1821.6,667],[1820.5,672.2],[1818,677.7],[1814.6,682.8],[1810.5,687.3],[1805.7,691.1],[1800.4,694.1],[1794.7,696.2],[1788.7,697.3],[1748.2,698.8],[1690,710]]}
paths={}
for runway,target in holds.items():
 assert target in nodes,target
 distance={target:0};prev={};queue=[(0,target)]
 while queue:
  d,u=heapq.heappop(queue)
  if d!=distance[u]:continue
  for v,cost in adj[u].items():
   nd=d+cost
   if nd<distance.get(v,1e20):distance[v]=nd;prev[v]=u;heapq.heappush(queue,(nd,v))
 paths[runway]=(distance,prev)
gates=[]
for w in ways:
 if w['kind']!='parking_position' or len(w['points'])<2 or not w.get('ref'):continue
 lead=w['points'][0];nose=w['points'][-1];back=w['points'][-2]
 if not (-2100<nose[0]<1450 and -340<nose[1]<350):continue
 nearest=min(keys,key=lambda n:math.dist(n,lead));gap=math.dist(nearest,lead)
 if gap>6 or any(nearest not in paths[r][0] for r in holds):continue
 dx,dz=nose[0]-back[0],nose[1]-back[1];norm=math.hypot(dx,dz)
 if norm<.1:continue
 start=[round(nose[0]-dx/norm*31,2),round(nose[1]-dz/norm*31,2)]
 if math.dist(start,lead)<25:continue
 routes={}
 for r,(distance,prev) in paths.items():
  route=[list(nearest)];u=nearest
  while u in prev:u=prev[u];route.append(list(u))
  routes[r]=route
 gates.append({'stand':w['ref'],'wayId':w['id'],'position':start,'heading':math.atan2(dz,dx),'pushback':[start]+list(reversed(w['points'][:-1])),'routes':routes})
# Spread usable stands across concourses, with room for widebody wings.
chosen=[]
for gate in sorted(gates,key=lambda g:abs(g['position'][0]-1000)):
 if any(math.dist(gate['position'],p['position'])<115 for p in chosen):continue
 chosen.append(gate)
 if len(chosen)==16:break
assert len(chosen)>=8,len(chosen)
out={'attribution':'Derived from © OpenStreetMap contributors, ODbL 1.0','holds':{r:{'name':'A1' if r=='27R' else 'N1','position':list(p),'entry':entries[r]} for r,p in holds.items()},'gates':chosen}
pathlib.Path('public/data/heathrow-ground.json').write_text(json.dumps(out,separators=(',',':')))
print({'taxiNodes':len(nodes),'connectedStands':len(gates),'reservedDepartureStands':[(g['stand'],g['position']) for g in chosen]})
