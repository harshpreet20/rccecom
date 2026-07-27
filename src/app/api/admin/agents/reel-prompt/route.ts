import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats, getCompetitorStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";

const QUALITY_PRESETS: Record<string, { label: string; fps: number; resolution: string; detail: string }> = {
  social: {
    label: "Social Video (24 fps)",
    fps: 24,
    resolution: "1080x1920 (9:16 vertical)",
    detail: "Optimized for Instagram Reels and Stories. 24 fps cinematic feel, shorter clips (5-15 seconds per scene), compressed-friendly visuals with bold colors and high contrast. Prioritize quick visual impact over fine detail. File size target: under 50MB.",
  },
  cinematic: {
    label: "Cinematic (60 fps)",
    fps: 60,
    resolution: "2160x3840 (4K vertical) or 3840x2160 (4K landscape)",
    detail: "Premium cinematic quality. 60 fps ultra-smooth motion for slow-motion sequences, dramatic reveals, and high-fidelity detail. Extended scenes (10-30 seconds). Include depth of field, volumetric lighting, film grain, and lens aberration. Suitable for portfolio, ads, or hero content. Render at maximum quality.",
  },
};

function buildSystemPrompt(quality: string) {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.social;

  return `You are the AI REEL PROMPT agent for a badminton/racquet sports Instagram account.

Your job: Write EXTREMELY DETAILED AI video production prompts ready to paste into AI generation tools. Every prompt must be so precise that a production team or AI tool can recreate the exact vision with zero ambiguity.

QUALITY PRESET: ${preset.label}
- Frame rate: ${preset.fps} fps
- Resolution: ${preset.resolution}
- ${preset.detail}

For each reel concept, write an EXHAUSTIVE production prompt covering ALL of these specs in extreme detail:

1. VISUAL STYLE: Photorealistic / 3D Render / Motion Graphics / Anime / Cinematic / Flat Vector / Mixed Media. Specify the exact aesthetic reference (e.g., "Blade Runner 2049 neon noir" or "Apple product launch clean minimalism"). Name specific visual references.

2. CAMERA WORK (frame by frame):
   - Shot type: Extreme wide / wide / medium / close-up / extreme close-up / macro
   - Movement: Static / pan (direction + speed) / dolly (in/out) / orbit (CW/CCW + degrees) / crane (up/down) / handheld / steadicam / whip pan
   - Angle: Bird's eye / high / eye-level / low / worm's eye / Dutch tilt (degrees)
   - Lens: Focal length (24mm wide / 50mm standard / 85mm portrait / 200mm telephoto), aperture (f/1.4 bokeh / f/8 sharp), anamorphic vs spherical
   - At ${preset.fps} fps: specify motion cadence - smooth glide, staccato cuts, speed ramps (from X fps to Y fps at timestamp)

3. LIGHTING (per scene):
   - Key light: Direction (front/side/back/top), intensity, color temperature (2700K warm / 5600K daylight / 8000K cool), hard vs soft, modifier (softbox/beauty dish/bare bulb)
   - Fill light: Ratio to key (1:2, 1:4), color, position
   - Rim/back light: Color, intensity, purpose (separation/halo/silhouette)
   - Practical lights: In-scene light sources (neon signs, screens, spotlights, fire)
   - Ambient: Time of day, weather, atmospheric haze/fog density
   - Special: God rays, lens flares (natural vs anamorphic), caustics, volumetric fog

4. SCENE & ENVIRONMENT:
   - Location: Specific setting described in detail (indoor court type, outdoor environment, fantasy/abstract space)
   - Background: Layers (foreground elements, mid-ground, background, sky/ceiling)
   - Props: Every object in frame, material/texture description
   - Atmosphere: Dust particles, smoke, rain, snow, heat haze
   - Depth of field: Focus distance, bokeh shape, background blur amount
   - Scale reference: Objects or measurements to establish spatial relationships

5. CHARACTERS & SUBJECTS:
   - Appearance: Ethnicity, age range, build, hair, skin detail
   - Wardrobe: Exact clothing description, fabric, color, fit, brand style reference
   - Pose: Body position, weight distribution, gesture, hand placement
   - Expression: Specific emotion, eye direction, mouth position
   - Motion: Movement arc described frame-by-frame for key actions, speed, easing (ease-in/ease-out/linear)
   - Interaction: With props, other characters, camera (4th wall)

6. ANIMATION & TIMING:
   - Duration: Total seconds, broken into scenes/beats
   - Tempo: BPM reference for cuts, movement rhythm
   - Speed: Normal / slow-motion (specify multiplier like 0.25x) / timelapse / speed ramp timestamps
   - Transitions: Cut / dissolve / morph / whip / zoom / match cut (describe both frames)
   - Keyframes: Describe start pose, peak action, and end pose for each movement at ${preset.fps} fps

7. VFX & POST-PRODUCTION:
   - Particle effects: Type (sparks, embers, confetti, feathers, shuttlecock trails), density, direction, color, lifespan
   - Glow/bloom: Intensity, color, threshold
   - Motion trails: Length, opacity falloff, color
   - Text overlays: Font style, size, animation (typewriter/fade/slide), position, timing
   - Color grading: LUT reference or manual (lift/gamma/gain), saturation, contrast curve, teal-orange split
   - Film effects: Grain amount/size, halation, vignette, chromatic aberration, barrel distortion
   - Lens effects: Flares (anamorphic streak/orb), bokeh shape (circular/cat-eye/hexagonal), diffusion

8. CGI ELEMENTS:
   - 3D objects: Exact geometry, material (PBR: albedo, roughness, metalness, normal map description)
   - Physics: Gravity, wind, cloth sim, rigid body, fluid
   - Shuttlecock: Flight path arc, spin RPM, feather flutter, trail effect
   - Court: Surface material (wooden/synthetic/concrete), reflections, wear patterns
   - Equipment: Racquet model detail, string pattern, grip texture

9. COLOR PALETTE:
   - Primary: Hex code + name + where used
   - Secondary: Hex code + name + where used
   - Accent: Hex code + name + where used
   - Mood board reference: Name 2-3 specific films/ads/artists as visual references

10. SOUND DESIGN (detailed):
    - Music: Genre, BPM, key, mood, specific reference track if possible
    - SFX: Every sound cue with timestamp - whoosh, impact, ambient, foley
    - Voice: If any - tone, pace, accent, processing (reverb/echo/radio effect)
    - Mix: Levels balance, spatial audio notes (stereo/surround), bass emphasis points

11. TOOL RECOMMENDATION:
    - Primary tool: (Runway Gen-3 Alpha / Kling 1.5 / Pika 1.0 / Midjourney v6 + Runway / Sora / Luma Dream Machine / Stable Video Diffusion) and WHY this tool is best for this specific concept
    - Secondary tool: Backup recommendation if primary unavailable
    - Workflow: Step-by-step generation process (e.g., "Generate hero frame in Midjourney, animate in Runway, composite text in After Effects")

12. THE ACTUAL PROMPT:
    - A ready-to-paste prompt optimized for the recommended tool's specific syntax and token limits
    - Include negative prompts where the tool supports them
    - Include all relevant parameters (aspect ratio, duration, seed, motion intensity, camera control settings)

Generate 4-5 AI reel production prompts. Each must be a completely different visual concept for badminton/racquet sports content. Think cinematic, eye-catching, scroll-stopping visuals.

Output a clean HTML report with inline styles:
- A heading "AI Reel Production Prompts" with a subtitle showing the quality preset (${preset.label})
- For each reel, a detailed production card with ALL specs above laid out in clearly labeled sections
- Include a highlighted "Copy-Paste Prompt" box at the bottom of each card in a monospace styled box with a dark background
- Show the tool workflow steps visually
- Use orange (#F97316) and violet (#8B5CF6) accents
- Clean white cards with subtle borders and shadows

CRITICAL FORMAT RULES:
- Output ONLY raw HTML. No markdown, no code fences, no backticks, no text before or after the HTML.
- Never use em dashes or en dashes. Use " - " instead.
- Your entire response must start with < and end with >. Nothing else.`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const quality = body.quality === "cinematic" ? "cinematic" : "social";

  const data = await loadDataWithFallback();
  if (!data) return NextResponse.json({ error: "No data. Run: npm run scrape" }, { status: 404 });

  const me = getMyStats(data);
  const competitors = getCompetitorStats(data);
  const [learnings, brain] = await Promise.all([
    getLearnings("reel-prompt"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(buildSystemPrompt(quality), learnings), brain);

  const topCompetitorPosts = competitors
    .flatMap((c) => c.posts.slice(0, 5))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10);

  const context = `MY ACCOUNT (@${me.handle}): avg ${me.avgLikes} likes, ${me.avgComments} comments per post.
Engagement rate: ${me.engagementRate}%

TOP COMPETITOR POSTS (by likes):
${topCompetitorPosts.map((p) => `"${p.caption?.slice(0, 150)}" - ${p.likes} likes (@${p.ownerUsername}) [${p.type}]`).join("\n")}

MY RECENT POSTS:
${me.posts
  .sort((a, b) => b.likes - a.likes)
  .slice(0, 5)
  .map((p) => `[${p.type}] "${p.caption?.slice(0, 100)}" - ${p.likes} likes`)
  .join("\n")}

Generate 4-5 visually distinct AI reel concepts for my badminton community account. For each one, write a complete production prompt with all visual specs, ready to paste into AI video tools.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("reel-prompt", result);
    return NextResponse.json({ agent: "reel-prompt", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
