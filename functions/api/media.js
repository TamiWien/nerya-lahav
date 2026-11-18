import { json, github } from '../../cms/server.js';

/* every image / video already in the repo, for the "choose from library" picker */
export async function onRequestGet({ env }) {
  const gh = github(env);
  const ref = await gh.call(`/git/ref/heads/${gh.branch}`);
  const tree = await gh.call(`/git/trees/${ref.object.sha}?recursive=1`);
  const files = tree.tree
    .filter(f => f.type === 'blob' && /^assets\/(img|uploads|video)\//.test(f.path) && /\.(webp|jpe?g|png|gif|svg|mp4)$/i.test(f.path))
    .filter(f => !/\/(ic-|c-|logo|baby-band|envelope|auth-)/.test(f.path))
    .map(f => ({ path: f.path, size: f.size, kind: /\.mp4$/i.test(f.path) ? 'video' : 'image' }));
  return json({ files });
}
