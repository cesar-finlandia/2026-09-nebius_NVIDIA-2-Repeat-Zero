import { writeFileSync } from "node:fs";
import { listModels } from "../src/repeatzero/tokenfactory/client.js";

const FROZEN_SUPER = "nvidia/nemotron-3-super-120b-a12b";
const FROZEN_NANO = "nvidia/nemotron-3-nano-30b-a3b";

const ids: string[] = await listModels();
const supers: string[] = ids.filter((id: string) => id.includes("nemotron-3-super"));
const nanos: string[] = ids.filter((id: string) => id.includes("nemotron-3-nano"));
const superId: string = supers.length > 0 ? [...supers].sort()[0] as string : FROZEN_SUPER;
const nanoId: string = nanos.length > 0 ? [...nanos].sort()[0] as string : FROZEN_NANO;
if (supers.length === 0 || nanos.length === 0) {
  console.log(`MODEL-ID-UNRESOLVED super=${superId} nano=${nanoId}`);
} else {
  console.log(`MODEL-ID-RESOLVED super=${superId} nano=${nanoId}`);
}
writeFileSync(
  "config/models.resolved.json",
  JSON.stringify({ super: superId, nano: nanoId, resolved_at: new Date().toISOString() }, null, 2) + "\n",
  "utf8",
);
process.exit(0);
