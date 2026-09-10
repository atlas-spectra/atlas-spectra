# Phenomenon first, observations on demand

Continues #23 / #3. The 2D route starts in **Discover**. The first explicitly curated process group is **Heart activity**, with the existing cardiac-cycle reference, ventricular electrical activation count, and arterial pulse arrival count as three observations. Selecting it expands its observations without moving the frequency viewport. **All observations** retains the detailed comparison view.

## Scientific boundary

`process-groups.ts` is a typed, curated presentation registry keyed by canonical IDs. It contains membership, an anchor ID, explanatory text and field-level evidence targets. It contains no frequencies, measured timing, waveform samples, evidence badges, or newly inferred graph edges. Registry references and exclusive membership are validated by the Astro build.

The three source manifests identify a cardiac-cycle count, ventricular activation count and arterial pulse arrival count. The latter two explicitly derive their population resting-rate references from the same heart-rate reference. This is why they are grouped, not their numerical equality. The grouping rationale is recorded in the registry. Other records at the same numerical frequency, such as the watch tick, remain separate. The sensor/PPG records are not automatically absorbed: extending membership is an explicit editorial change requiring source review.

A collapsed group uses only its **named anchor observation** (here the heartbeat reference) for both the physical mark and neighborhood ranking. It is not an average, union, fitted oscillator, or collective spectrum. Changing a facet's range does not change group membership or the anchor's geometry. All-record bounds and the whole-atlas overview still include every canonical record. An interval can contain hidden facets away from the anchor; All observations and search expose those records without inventing a group extent.

## Disclosure

- The closed card reads Heart activity, Heartbeat reference, the anchor's native quantity, and Explore 3 observations.
- Selection reveals an inline observation panel plus the individual marks. Its field-specific evidence labels distinguish the established reference from derived references.
- Each observation remains independently selectable and opens its own full record, original provenance and source links.
- The explanation states that these are not three independent measurements. The facet list is not an animation or timing diagram.
- Collapse clears the member selection, returns to Discover, retains exact camera coordinates, and returns keyboard focus to the grouped card (or Discover control when the anchor is off screen).

## Search, navigation and evidence

Canonical records remain the source of truth and the inspector lookup. Search operates on original names, aliases and domains. A partial filter is never replaced with an absent representative; collapsing requires the entire declared group to be in the filtered set. Selecting any member by search, catalog, connection, or canonical entity deep link expands its group. The `detail=observations` query parameter restores the comparison view; invalid values fall back to Discover. Existing full-precision center/span/entity/lane parameters are unchanged. Neighbor lists remain grouped in Discover even while one observation is selected, avoiding three near-duplicate recommendations.

Relationship tracing explicitly switches to All observations. It never rewires a member edge to a fictional parent, merges evidence or claims a new physical relationship. The persistent selection status announces the expanded process and selected observation without putting the rapidly changing lens into a live region.

## Scope

Only the three agreed core cardiac observations are grouped in this slice. Additional process/system families must be curated explicitly rather than inferred from matching numbers, domain tags, or a shared organ alone. No scientific manifests or schemas change. Large-catalog work and broader accessibility/browser validation remain under #3.
