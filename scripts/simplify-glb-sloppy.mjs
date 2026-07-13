// One-off: sloppy-simplify maven.glb (disconnected triangle soup that the
// standard meshopt simplifier cannot reduce below ~1.9M vertices).
// Usage: node sloppy-maven.mjs <in.glb> <out.glb> <targetRatio>
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const [inPath, outPath, ratioArg] = process.argv.slice(2);
const ratio = Number(ratioArg ?? 0.05);
const UNUSED = 0xffffffff;

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });

await MeshoptSimplifier.ready;
const doc = await io.read(inPath);

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const posAcc = prim.getAttribute('POSITION');
    const idxAcc = prim.getIndices();
    if (!posAcc || !idxAcc) continue;

    const positions = new Float32Array(posAcc.getArray());
    const indices = new Uint32Array(idxAcc.getArray());
    const targetCount = Math.floor((indices.length * ratio) / 3) * 3;

    const [newIndices, error] = MeshoptSimplifier.simplifySloppy(
      indices, positions, 3, null, targetCount, 0.05
    );
    console.log(
      `prim: ${indices.length / 3} -> ${newIndices.length / 3} tris (error ${error.toFixed(4)})`
    );

    // compactMesh returns a vertex remap table (old id -> new id, UNUSED for
    // dropped vertices) and remaps newIndices IN PLACE to the new vertex space.
    const [remap, uniqueVertexCount] = MeshoptSimplifier.compactMesh(newIndices);
    idxAcc.setArray(newIndices);

    for (const semantic of prim.listSemantics()) {
      const acc = prim.getAttribute(semantic);
      const elSize = acc.getElementSize();
      const src = acc.getArray();
      const dst = new src.constructor(uniqueVertexCount * elSize);
      for (let old = 0; old < remap.length; old++) {
        const nw = remap[old];
        if (nw === UNUSED) continue;
        for (let k = 0; k < elSize; k++) dst[nw * elSize + k] = src[old * elSize + k];
      }
      acc.setArray(dst);
    }
  }
}

// Geometry is now plain arrays; drop the draco extension declaration.
for (const ext of doc.getRoot().listExtensionsUsed()) {
  if (ext.extensionName === 'KHR_draco_mesh_compression') ext.dispose();
}

await io.write(outPath, doc);
console.log('wrote', outPath, 'uniqueVertices ok');
